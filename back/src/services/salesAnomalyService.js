const prisma = require('../utils/prisma')
const { getPeriodKey } = require('./salesTrendService')

const THRESHOLDS = {
  salesDropWarning: 35,
  salesDropCritical: 55,
  salesSpikeWarning: 80,
  salesSpikeCritical: 150,
  categoryDeviationWarning: 50,
  lowStockCritical: 5,
  lowStockWarning: 15,
  pendingOrderWarning: 20,
  cancelRateWarning: 25
}

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function mean(arr) {
  if (!arr.length) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stdDev(arr, avg) {
  if (arr.length < 2) return 0
  const m = avg ?? mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length
  return Math.sqrt(variance)
}

function deviationPercent(actual, baseline) {
  if (baseline <= 0) return actual > 0 ? 100 : 0
  return Math.round(((actual - baseline) / baseline) * 10000) / 100
}

function makeAnomaly({ type, level, title, description, metrics = {} }) {
  return {
    id: `${type}-${metrics.label || metrics.category || metrics.productId || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    level,
    title,
    description,
    metrics,
    detectedAt: new Date().toISOString()
  }
}

/**
 * 销售异常判别与实时监控
 */
async function getSalesAnomalyMonitor({ windowDays = 30 } = {}) {
  const since = daysAgo(windowDays)
  const anomalies = []

  const [purchaseRecords, orders, lowStockProducts, pendingOrders] = await Promise.all([
    prisma.purchaseRecord.findMany({
      where: { purchaseDate: { gte: since } },
      select: {
        unitPrice: true,
        quantity: true,
        purchaseDate: true,
        category: true,
        productId: true,
        orderId: true
      }
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, status: true, totalPrice: true, createdAt: true }
    }),
    prisma.product.findMany({
      where: { stock: { lt: THRESHOLDS.lowStockWarning }, status: 'active' },
      select: { id: true, name: true, stock: true, category: true },
      orderBy: { stock: 'asc' },
      take: 50
    }),
    prisma.order.count({ where: { status: 'pending' } })
  ])

  // —— 按日汇总销售额 ——
  const dailyMap = new Map()
  const categoryDailyMap = new Map()

  for (const row of purchaseRecords) {
    const dayKey = getPeriodKey(row.purchaseDate, 'day')
    const revenue = row.unitPrice * row.quantity
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + revenue)

    const cat = row.category || '未分类'
    if (!categoryDailyMap.has(cat)) categoryDailyMap.set(cat, new Map())
    const cm = categoryDailyMap.get(cat)
    cm.set(dayKey, (cm.get(dayKey) || 0) + revenue)
  }

  const dailySeries = Array.from(dailyMap.entries())
    .map(([label, revenue]) => ({ label, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const todayKey = getPeriodKey(new Date(), 'day')
  const yesterdayKey = getPeriodKey(daysAgo(1), 'day')

  const todayRevenue = dailyMap.get(todayKey) || 0
  const yesterdayRevenue = dailyMap.get(yesterdayKey) || 0
  const todayChangeRate = deviationPercent(todayRevenue, yesterdayRevenue)

  const historicalDays = dailySeries.filter((d) => d.label !== todayKey)
  const baselineRevenues = historicalDays.slice(-7).map((d) => d.revenue)
  const baselineAvg = mean(baselineRevenues)

  // 今日销售额 vs 近7日均值
  const todayVsBaseline = deviationPercent(todayRevenue, baselineAvg)
  if (baselineAvg > 0 && todayVsBaseline <= -THRESHOLDS.salesDropWarning) {
    const level =
      todayVsBaseline <= -THRESHOLDS.salesDropCritical ? 'critical' : 'warning'
    anomalies.push(
      makeAnomaly({
        type: 'SALES_DROP',
        level,
        title: '今日销售额异常偏低',
        description: `今日销售额 ¥${todayRevenue.toFixed(2)}，较近7日均值 ¥${baselineAvg.toFixed(2)} 下降 ${Math.abs(todayVsBaseline)}%`,
        metrics: { label: todayKey, actual: todayRevenue, baseline: baselineAvg, changePercent: todayVsBaseline }
      })
    )
  } else if (todayVsBaseline >= THRESHOLDS.salesSpikeWarning) {
    anomalies.push(
      makeAnomaly({
        type: 'SALES_SPIKE',
        level: todayVsBaseline >= THRESHOLDS.salesSpikeCritical ? 'info' : 'warning',
        title: '今日销售额异常偏高',
        description: `今日销售额较均值上升 ${todayVsBaseline}%，请关注库存与发货能力`,
        metrics: { label: todayKey, actual: todayRevenue, baseline: baselineAvg, changePercent: todayVsBaseline }
      })
    )
  }

  // 逐日 Z-score 异常（最近14天）
  const recentSeries = dailySeries.slice(-14)
  const revenues = recentSeries.map((d) => d.revenue)
  const avgR = mean(revenues)
  const sdR = stdDev(revenues, avgR)

  const dailyWithAnomaly = recentSeries.map((d) => {
    let zScore = 0
    let isAnomaly = false
    if (sdR > 0) {
      zScore = Math.round(((d.revenue - avgR) / sdR) * 100) / 100
      isAnomaly = Math.abs(zScore) >= 2
    }
    const dev = deviationPercent(d.revenue, avgR)
    if (isAnomaly && d.label !== todayKey) {
      if (zScore < -2) {
        anomalies.push(
          makeAnomaly({
            type: 'DAILY_ANOMALY',
            level: zScore < -2.5 ? 'critical' : 'warning',
            title: `${d.label} 销售额骤降`,
            description: `当日销售额 ¥${d.revenue.toFixed(2)}，偏离均值 ${dev}%（Z=${zScore}）`,
            metrics: { label: d.label, actual: d.revenue, baseline: avgR, zScore }
          })
        )
      } else if (zScore > 2) {
        anomalies.push(
          makeAnomaly({
            type: 'DAILY_ANOMALY',
            level: 'info',
            title: `${d.label} 销售额激增`,
            description: `当日销售额 ¥${d.revenue.toFixed(2)}，高于均值 ${dev}%（Z=${zScore}）`,
            metrics: { label: d.label, actual: d.revenue, baseline: avgR, zScore }
          })
        )
      }
    }
    return { ...d, zScore, isAnomaly, deviationPercent: dev }
  })

  // 分类维度异常（近3天 vs 前7天）
  for (const [category, dayMap] of categoryDailyMap.entries()) {
    const keys = Array.from(dayMap.keys()).sort()
    if (keys.length < 5) continue
    const recent3 = keys.slice(-3).reduce((s, k) => s + (dayMap.get(k) || 0), 0) / 3
    const prior7 = keys.slice(-10, -3)
    if (prior7.length < 3) continue
    const priorAvg = mean(prior7.map((k) => dayMap.get(k) || 0))
    const catDev = deviationPercent(recent3, priorAvg)
    if (priorAvg > 100 && catDev <= -THRESHOLDS.categoryDeviationWarning) {
      anomalies.push(
        makeAnomaly({
          type: 'CATEGORY_DROP',
          level: catDev <= -70 ? 'critical' : 'warning',
          title: `分类「${category}」销售下滑`,
          description: `近3天日均 ¥${recent3.toFixed(2)}，较前7天均值下降 ${Math.abs(catDev)}%`,
          metrics: { category, actual: recent3, baseline: priorAvg, changePercent: catDev }
        })
      )
    }
  }

  // 低库存
  for (const p of lowStockProducts) {
    const level = p.stock <= THRESHOLDS.lowStockCritical ? 'critical' : 'warning'
    anomalies.push(
      makeAnomaly({
        type: 'LOW_STOCK',
        level,
        title: `库存不足：${p.name}`,
        description: `商品库存仅剩 ${p.stock} 件（分类：${p.category || '未分类'}）`,
        metrics: { productId: p.id, productName: p.name, stock: p.stock, category: p.category }
      })
    )
  }

  // 待支付订单积压
  if (pendingOrders >= THRESHOLDS.pendingOrderWarning) {
    anomalies.push(
      makeAnomaly({
        type: 'ORDER_BACKLOG',
        level: pendingOrders >= THRESHOLDS.pendingOrderWarning * 2 ? 'critical' : 'warning',
        title: '待支付订单积压',
        description: `当前有 ${pendingOrders} 笔待支付订单，可能影响转化率统计`,
        metrics: { pendingCount: pendingOrders }
      })
    )
  }

  // 取消率异常（近7天）
  const recentOrders = orders.filter((o) => o.createdAt >= daysAgo(7))
  const cancelled = recentOrders.filter((o) => o.status === 'cancelled').length
  const cancelRate =
    recentOrders.length > 0 ? Math.round((cancelled / recentOrders.length) * 10000) / 100 : 0
  if (recentOrders.length >= 10 && cancelRate >= THRESHOLDS.cancelRateWarning) {
    anomalies.push(
      makeAnomaly({
        type: 'CANCEL_SURGE',
        level: cancelRate >= 40 ? 'critical' : 'warning',
        title: '订单取消率偏高',
        description: `近7天取消率 ${cancelRate}%（${cancelled}/${recentOrders.length} 笔）`,
        metrics: { cancelRate, cancelled, total: recentOrders.length }
      })
    )
  }

  // 去重：同 type+title 只保留一条（取最严重）
  const levelOrder = { critical: 3, warning: 2, info: 1 }
  const deduped = []
  const seen = new Set()
  for (const a of anomalies.sort((x, y) => levelOrder[y.level] - levelOrder[x.level])) {
    const key = `${a.type}-${a.metrics?.label || a.metrics?.category || a.metrics?.productId || a.title}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(a)
    }
  }

  const critical = deduped.filter((a) => a.level === 'critical').length
  const warning = deduped.filter((a) => a.level === 'warning').length
  const info = deduped.filter((a) => a.level === 'info').length

  let healthStatus = 'normal'
  if (critical > 0) healthStatus = 'critical'
  else if (warning > 0) healthStatus = 'warning'
  else if (info > 0) healthStatus = 'info'

  const todayOrders = orders.filter((o) => getPeriodKey(o.createdAt, 'day') === todayKey).length
  const yesterdayOrders = orders.filter((o) => getPeriodKey(o.createdAt, 'day') === yesterdayKey).length

  return {
    summary: {
      critical,
      warning,
      info,
      total: deduped.length,
      healthStatus,
      healthLabel: { normal: '正常', warning: '需关注', critical: '严重', info: '提示' }[healthStatus]
    },
    realtime: {
      monitoredAt: new Date().toISOString(),
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
      todayChangeRate,
      todayVsBaseline,
      baselineAvg: Math.round(baselineAvg * 100) / 100,
      todayOrderCount: todayOrders,
      yesterdayOrderCount: yesterdayOrders,
      pendingOrderCount: pendingOrders,
      lowStockCount: lowStockProducts.length,
      cancelRate7d: cancelRate
    },
    dailyWithAnomaly,
    anomalies: deduped.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]),
    thresholds: THRESHOLDS
  }
}

module.exports = { getSalesAnomalyMonitor, THRESHOLDS }
