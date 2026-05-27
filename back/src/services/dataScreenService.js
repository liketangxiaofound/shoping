/**
 * 数据可视化大屏 — 聚合接口（复用现有分析服务）
 */
const prisma = require('../utils/prisma')
const dataCollection = require('./dataCollectionService')
const salesTrendService = require('./salesTrendService')
const salesRankingService = require('./salesRankingService')
const salesAnomalyService = require('./salesAnomalyService')
const { safeCrawlerCount } = require('../utils/prismaSafe')

/** 大屏用轻量画像汇总（避免 getUserProfileOverview 逐用户 N+1 过慢） */
async function getLightProfileSummary() {
  const purchases = await prisma.purchaseRecord.findMany({
    select: { userId: true, category: true, unitPrice: true, quantity: true }
  })
  const categoryMap = {}
  const userSpend = {}
  for (const p of purchases) {
    const cat = p.category || '未分类'
    categoryMap[cat] = (categoryMap[cat] || 0) + p.unitPrice * p.quantity
    userSpend[p.userId] = (userSpend[p.userId] || 0) + p.unitPrice * p.quantity
  }
  const categoryPreferenceTop = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, totalScore]) => ({ category, totalScore: Math.round(totalScore) }))

  const labels = { high: '高购买力', medium: '中购买力', low: '低购买力', none: '潜在用户' }
  const powerMap = { high: 0, medium: 0, low: 0, none: 0 }
  const customerIds = await prisma.user.findMany({
    where: { role: 'customer' },
    select: { id: true }
  })
  for (const { id } of customerIds) {
    const spend = userSpend[id] || 0
    if (spend >= 3000) powerMap.high++
    else if (spend >= 500) powerMap.medium++
    else if (spend > 0) powerMap.low++
    else powerMap.none++
  }
  const purchasingPowerDistribution = Object.entries(powerMap)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ label: labels[key], count }))

  return {
    regionDistribution: [{ region: '已购用户', count: Object.keys(userSpend).length }],
    purchasingPowerDistribution,
    categoryPreferenceTop
  }
}

function bucketByDate(rows, dateField, days = 7) {
  const map = new Map()
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map.set(key, 0)
  }
  for (const row of rows) {
    const key = new Date(row[dateField]).toISOString().slice(0, 10)
    if (map.has(key)) map.set(key, map.get(key) + 1)
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }))
}

async function getDataScreenPayload() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    revenueAgg,
    orderCount,
    paidOrderCount,
    productCount,
    userCount,
    customerCount,
    collection,
    crawler24h,
    salesChart,
    salesRanking,
    profileOverview,
    anomalies,
    ordersByStatus,
    loginLogs7d,
    browseLogs7d
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: ['paid', 'shipped', 'delivered'] } },
      _sum: { totalPrice: true }
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['paid', 'shipped', 'delivered'] } } }),
    prisma.product.count({ where: { status: 'active' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'customer' } }),
    dataCollection.getCollectionSummary(),
    safeCrawlerCount({ createdAt: { gte: since24h } }),
    salesTrendService.getSalesTrendChart({ period: 'day', points: 14 }),
    salesRankingService.getSalesRanking({ sortBy: 'revenue', limit: 10, windowDays: 30 }),
    getLightProfileSummary(),
    salesAnomalyService.getSalesAnomalyMonitor({ windowDays: 30 }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { id: true }
    }),
    prisma.loginLog.findMany({
      where: { loginAt: { gte: since7d } },
      select: { loginAt: true }
    }),
    prisma.browseBehaviorLog.findMany({
      where: { browsedAt: { gte: since7d } },
      select: { browsedAt: true }
    })
  ])

  const recentAnomalies = (anomalies.anomalies || []).slice(0, 5)

  return {
    updatedAt: new Date().toISOString(),
    kpis: {
      totalRevenue: revenueAgg._sum.totalPrice || 0,
      totalOrders: orderCount,
      paidOrders: paidOrderCount,
      activeProducts: productCount,
      totalUsers: userCount,
      customers: customerCount,
      loginLogs: collection?.counts?.loginCount ?? 0,
      browseLogs: collection?.counts?.browseCount ?? 0,
      purchaseRecords: collection?.counts?.purchaseCount ?? 0,
      crawlerEvents24h: crawler24h
    },
    salesTrend: {
      labels: salesChart.chart?.labels || salesChart.series?.map((s) => s.label) || [],
      revenue: salesChart.chart?.revenue || salesChart.series?.map((s) => s.revenue) || [],
      quantity: salesChart.chart?.quantity || salesChart.series?.map((s) => s.quantity) || []
    },
    categoryRanking: (salesRanking.categoryRanking || []).slice(0, 8).map((r) => ({
      name: r.category,
      revenue: r.revenue,
      quantity: r.quantity
    })),
    productRanking: (salesRanking.productRanking || []).slice(0, 10).map((r) => ({
      name: r.productName,
      revenue: r.revenue,
      quantity: r.quantity
    })),
    regionDistribution: profileOverview.regionDistribution?.slice(0, 8) || [],
    purchasingPowerDistribution: profileOverview.purchasingPowerDistribution || [],
    categoryPreference: profileOverview.categoryPreferenceTop?.slice(0, 8) || [],
    orderStatus: (ordersByStatus || []).map((r) => ({
      status: r.status,
      count: r._count?.id ?? 0
    })),
    behaviorTrend: {
      logins: bucketByDate(loginLogs7d, 'loginAt', 7),
      browses: bucketByDate(browseLogs7d, 'browsedAt', 7)
    },
    anomalies: {
      total: anomalies.summary?.total ?? recentAnomalies.length,
      healthStatus: anomalies.summary?.healthStatus || 'normal',
      healthLabel: anomalies.summary?.healthLabel || '正常',
      recent: recentAnomalies
    }
  }
}

module.exports = { getDataScreenPayload }
