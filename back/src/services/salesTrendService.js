const prisma = require('../utils/prisma')

/**
 * 将日期按日/周/月分组
 */
function getPeriodKey(date, period) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')

  if (period === 'day') return `${y}-${m}-${day}`
  if (period === 'month') return `${y}-${m}`

  // week: 周一为起点
  const tmp = new Date(d)
  const dayNum = tmp.getDay() || 7
  tmp.setDate(tmp.getDate() - dayNum + 1)
  const wy = tmp.getFullYear()
  const wm = String(tmp.getMonth() + 1).padStart(2, '0')
  const wd = String(tmp.getDate()).padStart(2, '0')
  return `${wy}-${wm}-${wd}`
}

function linearRegression(points) {
  const n = points.length
  if (n < 2) {
    return { slope: 0, intercept: points[0]?.y ?? 0 }
  }
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

function calcMape(actuals, predicts) {
  if (!actuals.length) return 0
  let sum = 0
  let count = 0
  for (let i = 0; i < actuals.length; i++) {
    const a = actuals[i]
    const p = predicts[i]
    if (a > 0) {
      sum += Math.abs((a - p) / a)
      count++
    }
  }
  return count ? Math.round((sum / count) * 10000) / 100 : 0
}

function addPeriod(label, period, offset) {
  const d = new Date(label.length === 7 ? `${label}-01` : label)
  if (period === 'day') d.setDate(d.getDate() + offset)
  else if (period === 'week') d.setDate(d.getDate() + offset * 7)
  else d.setMonth(d.getMonth() + offset)
  return getPeriodKey(d, period)
}

function evaluateTrend(historical) {
  if (historical.length < 2) {
    return { trend: 'stable', growthRate: 0, summary: '数据不足，暂定为平稳' }
  }
  const recent = historical.slice(-4)
  const first = recent[0].revenue
  const last = recent[recent.length - 1].revenue
  const growthRate =
    first > 0 ? Math.round(((last - first) / first) * 10000) / 100 : last > 0 ? 100 : 0

  let trend = 'stable'
  if (growthRate > 5) trend = 'up'
  else if (growthRate < -5) trend = 'down'

  const trendText = { up: '上升', down: '下降', stable: '平稳' }[trend]
  return {
    trend,
    growthRate,
    summary: `近 ${recent.length} 个周期销售额${trendText}，环比约 ${growthRate}%`
  }
}

/**
 * 销售趋势 + 线性预测 + 评估
 * @param {object} opts
 * @param {'day'|'week'|'month'} opts.period
 * @param {string} [opts.category]
 * @param {number} [opts.forecastPeriods]
 */
async function getSalesTrend({ period = 'day', category, forecastPeriods = 7 } = {}) {
  const where = {}
  if (category) where.category = category

  const records = await prisma.purchaseRecord.findMany({
    where,
    select: {
      unitPrice: true,
      quantity: true,
      purchaseDate: true,
      orderId: true,
      category: true
    },
    orderBy: { purchaseDate: 'asc' }
  })

  const bucketMap = new Map()
  for (const row of records) {
    const key = getPeriodKey(row.purchaseDate, period)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { label: key, revenue: 0, quantity: 0, orderIds: new Set() })
    }
    const b = bucketMap.get(key)
    b.revenue += row.unitPrice * row.quantity
    b.quantity += row.quantity
    b.orderIds.add(row.orderId)
  }

  const historical = Array.from(bucketMap.values())
    .map((b) => ({
      label: b.label,
      revenue: Math.round(b.revenue * 100) / 100,
      quantity: b.quantity,
      orderCount: b.orderIds.size
    }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const trainSize = Math.max(historical.length - 3, 2)
  const train = historical.slice(0, trainSize)
  const test = historical.slice(trainSize)

  const trainPoints = train.map((h, i) => ({ x: i, y: h.revenue }))
  const { slope, intercept } = linearRegression(trainPoints)

  const testPredicts = test.map((_, i) =>
    Math.max(0, Math.round((slope * (trainSize + i) + intercept) * 100) / 100)
  )
  const testActuals = test.map((h) => h.revenue)
  const mape = calcMape(testActuals, testPredicts)

  const lastLabel = historical[historical.length - 1]?.label
  const forecast = []
  const startX = historical.length
  for (let i = 0; i < forecastPeriods; i++) {
    const x = startX + i
    const predicted = Math.max(0, Math.round((slope * x + intercept) * 100) / 100)
    const volatility = predicted * 0.1
    const label = lastLabel ? addPeriod(lastLabel, period, i + 1) : `预测+${i + 1}`
    forecast.push({
      label,
      periodIndex: x,
      revenue: predicted,
      revenueLow: Math.round((predicted - volatility) * 100) / 100,
      revenueHigh: Math.round((predicted + volatility) * 100) / 100,
      isForecast: true
    })
  }

  const evaluation = {
    ...evaluateTrend(historical),
    mape,
    model: '一元线性回归',
    trainPeriods: train.length,
    testPeriods: test.length,
    accuracy:
      mape <= 10 ? '优秀' : mape <= 20 ? '良好' : mape <= 35 ? '一般' : '需更多数据'
  }

  const categories = await prisma.purchaseRecord.groupBy({
    by: ['category'],
    _count: { id: true }
  })

  return {
    period,
    category: category || '全部',
    historical,
    forecast,
    evaluation,
    availableCategories: categories.map((c) => c.category || '未分类')
  }
}

/**
 * 生成连续时间轴标签（用于趋势图补全空档期）
 */
function generatePeriodRange(period, pointCount) {
  const keys = []
  const now = new Date()
  now.setHours(12, 0, 0, 0)
  for (let i = pointCount - 1; i >= 0; i--) {
    const d = new Date(now)
    if (period === 'day') {
      d.setDate(d.getDate() - i)
    } else if (period === 'week') {
      d.setDate(d.getDate() - i * 7)
    } else {
      d.setMonth(d.getMonth() - i)
    }
    keys.push(getPeriodKey(d, period))
  }
  return keys
}

function formatPeriodLabel(label, period) {
  if (period === 'day' && label.length >= 10) return label.slice(5)
  if (period === 'month' && label.length >= 7) return label
  if (period === 'week' && label.length >= 10) return `周 ${label.slice(5)}`
  return label
}

const DEFAULT_POINTS = { day: 30, week: 12, month: 12 }

/**
 * 销售趋势图数据（日/周/月，连续时间轴）
 */
async function getSalesTrendChart({ period = 'day', category, points } = {}) {
  const pointCount = points || DEFAULT_POINTS[period] || 30
  const where = {}
  if (category) where.category = category

  const records = await prisma.purchaseRecord.findMany({
    where,
    select: {
      unitPrice: true,
      quantity: true,
      purchaseDate: true,
      orderId: true
    },
    orderBy: { purchaseDate: 'asc' }
  })

  const bucketMap = new Map()
  for (const row of records) {
    const key = getPeriodKey(row.purchaseDate, period)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, { revenue: 0, quantity: 0, orderIds: new Set() })
    }
    const b = bucketMap.get(key)
    b.revenue += row.unitPrice * row.quantity
    b.quantity += row.quantity
    b.orderIds.add(row.orderId)
  }

  const labels = generatePeriodRange(period, pointCount)
  const series = labels.map((label) => {
    const b = bucketMap.get(label) || { revenue: 0, quantity: 0, orderIds: new Set() }
    return {
      label,
      displayLabel: formatPeriodLabel(label, period),
      revenue: Math.round(b.revenue * 100) / 100,
      quantity: b.quantity,
      orderCount: b.orderIds.size
    }
  })

  const revenues = series.map((s) => s.revenue)
  const quantities = series.map((s) => s.quantity)
  const totalRevenue = revenues.reduce((a, b) => a + b, 0)
  const totalQuantity = quantities.reduce((a, b) => a + b, 0)
  const peak = series.reduce((best, s) => (s.revenue > best.revenue ? s : best), series[0] || {})
  const avgRevenue =
    series.length > 0 ? Math.round((totalRevenue / series.length) * 100) / 100 : 0

  const periodNames = { day: '日', week: '周', month: '月' }

  const categories = await prisma.purchaseRecord.groupBy({
    by: ['category'],
    _count: { id: true }
  })

  return {
    period,
    periodName: periodNames[period] || period,
    pointCount,
    category: category || '全部',
    labels: series.map((s) => s.displayLabel),
    rawLabels: labels,
    series,
    chart: {
      revenue: revenues,
      quantity: quantities,
      orderCount: series.map((s) => s.orderCount)
    },
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalQuantity,
      avgRevenue,
      peakLabel: peak.displayLabel || '—',
      peakRevenue: peak.revenue || 0
    },
    availableCategories: categories.map((c) => c.category || '未分类')
  }
}

module.exports = { getSalesTrend, getSalesTrendChart, getPeriodKey }
