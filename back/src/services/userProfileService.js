const prisma = require('../utils/prisma')
const { extractRegionFromAddress, regionFromIp } = require('../utils/regionParser')

const PURCHASING_POWER = {
  high: { level: 'high', label: '高购买力', minSpend: 3000 },
  medium: { level: 'medium', label: '中购买力', minSpend: 500 },
  low: { level: 'low', label: '低购买力', minSpend: 0 },
  none: { level: 'none', label: '潜在用户', minSpend: 0 }
}

function classifyPurchasingPower(totalSpend, orderCount) {
  if (totalSpend <= 0 && orderCount <= 0) return PURCHASING_POWER.none
  if (totalSpend >= 3000 || (orderCount >= 3 && totalSpend >= 1500)) return PURCHASING_POWER.high
  if (totalSpend >= 500 || orderCount >= 2) return PURCHASING_POWER.medium
  return PURCHASING_POWER.low
}

function buildCategoryPreference(browses, purchases) {
  const scores = {}
  for (const row of browses) {
    const cat = row.category || '未分类'
    scores[cat] = (scores[cat] || 0) + Math.max(1, row.dwellSeconds || 0)
  }
  for (const row of purchases) {
    const cat = row.category || '未分类'
    scores[cat] = (scores[cat] || 0) + row.quantity * row.unitPrice * 3
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, score]) => ({
      category,
      score: Math.round(score * 100) / 100
    }))
}

async function resolveUserRegion(userId, orders) {
  const sortedOrders = [...(orders || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
  for (const order of sortedOrders) {
    const region = extractRegionFromAddress(order.address)
    if (region) return { region, source: '收货地址' }
  }

  const latestLogin = await prisma.loginLog.findFirst({
    where: { userId },
    orderBy: { loginAt: 'desc' },
    select: { ipAddress: true }
  })
  const ipRegion = regionFromIp(latestLogin?.ipAddress)
  if (ipRegion) return { region: ipRegion, source: '登录IP' }

  return { region: '未知', source: '无数据' }
}

/**
 * 构建单个用户画像
 */
async function buildUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true, createdAt: true }
  })
  if (!user) return null

  const [purchases, browses, orders] = await Promise.all([
    prisma.purchaseRecord.findMany({ where: { userId } }),
    prisma.browseBehaviorLog.findMany({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      select: { id: true, totalPrice: true, status: true, address: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
  ])

  const paidStatuses = ['paid', 'shipped', 'delivered']
  const paidOrders = orders.filter((o) => paidStatuses.includes(o.status))

  const totalSpend = purchases.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)
  const orderCount = new Set(purchases.map((p) => p.orderId)).size
  const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0
  const power = classifyPurchasingPower(totalSpend, orderCount)
  const preferredCategories = buildCategoryPreference(browses, purchases)
  const { region, source: regionSource } = await resolveUserRegion(userId, orders)

  const totalBrowseSeconds = browses.reduce((s, b) => s + (b.dwellSeconds || 0), 0)
  const browseCount = browses.length

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    registeredAt: user.createdAt,
    region,
    regionSource,
    purchasingPower: power.level,
    purchasingPowerLabel: power.label,
    totalSpend: Math.round(totalSpend * 100) / 100,
    orderCount,
    paidOrderCount: paidOrders.length,
    avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    preferredCategories,
    topCategory: preferredCategories[0]?.category || '—',
    browseCount,
    totalBrowseSeconds
  }
}

/**
 * 用户画像列表（默认仅普通用户）
 */
async function getUserProfiles({ page = 1, limit = 20, role = 'customer' } = {}) {
  const where = role === 'all' ? {} : { role }
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  const profiles = await Promise.all(users.map((u) => buildUserProfile(u.id)))

  return {
    profiles: profiles.filter(Boolean),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

/**
 * 画像总览（地域分布、购买力分布、全局偏好分类）
 */
async function getUserProfileOverview() {
  const customers = await prisma.user.findMany({
    where: { role: 'customer' },
    select: { id: true }
  })

  const profiles = await Promise.all(customers.map((c) => buildUserProfile(c.id)))

  const regionMap = {}
  const powerMap = {}
  const categoryMap = {}

  for (const p of profiles) {
    regionMap[p.region] = (regionMap[p.region] || 0) + 1
    powerMap[p.purchasingPowerLabel] = (powerMap[p.purchasingPowerLabel] || 0) + 1
    for (const pref of p.preferredCategories) {
      if (!categoryMap[pref.category]) {
        categoryMap[pref.category] = { category: pref.category, userCount: 0, totalScore: 0 }
      }
      categoryMap[pref.category].userCount += 1
      categoryMap[pref.category].totalScore += pref.score
    }
  }

  const regionDistribution = Object.entries(regionMap)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)

  const purchasingPowerDistribution = Object.entries(powerMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  const categoryPreferenceTop = Object.values(categoryMap)
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 10)

  return {
    totalUsers: profiles.length,
    regionDistribution,
    purchasingPowerDistribution,
    categoryPreferenceTop,
    profiles: profiles.slice(0, 50)
  }
}

module.exports = {
  buildUserProfile,
  getUserProfiles,
  getUserProfileOverview,
  classifyPurchasingPower
}
