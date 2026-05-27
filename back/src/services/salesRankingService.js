const prisma = require('../utils/prisma')

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 商品销售排行榜
 * @param {object} opts
 * @param {'revenue'|'quantity'|'orderCount'} opts.sortBy
 * @param {number} opts.limit
 * @param {number} [opts.windowDays] 不传或 0 表示全部
 * @param {string} [opts.category]
 */
async function getSalesRanking({ sortBy = 'revenue', limit = 20, windowDays = 30, category } = {}) {
  const where = {}
  if (windowDays > 0) {
    where.purchaseDate = { gte: daysAgo(windowDays) }
  }
  if (category) {
    where.category = category
  }

  const records = await prisma.purchaseRecord.findMany({
    where,
    select: {
      productId: true,
      category: true,
      unitPrice: true,
      quantity: true,
      orderId: true
    }
  })

  const productMap = new Map()
  const categoryMap = new Map()

  for (const row of records) {
    const revenue = row.unitPrice * row.quantity
    const cat = row.category || '未分类'

    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, { category: cat, revenue: 0, quantity: 0, orderIds: new Set(), productIds: new Set() })
    }
    const cg = categoryMap.get(cat)
    cg.revenue += revenue
    cg.quantity += row.quantity
    cg.orderIds.add(row.orderId)
    cg.productIds.add(row.productId)

    if (!productMap.has(row.productId)) {
      productMap.set(row.productId, {
        productId: row.productId,
        category: cat,
        revenue: 0,
        quantity: 0,
        orderIds: new Set()
      })
    }
    const pg = productMap.get(row.productId)
    pg.revenue += revenue
    pg.quantity += row.quantity
    pg.orderIds.add(row.orderId)
  }

  const productIds = Array.from(productMap.keys())
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          category: true,
          price: true,
          stock: true,
          image: true,
          seller: { select: { id: true, username: true } }
        }
      })
    : []
  const productById = Object.fromEntries(products.map((p) => [p.id, p]))

  let productRanking = Array.from(productMap.values()).map((agg) => {
    const p = productById[agg.productId]
    const revenue = Math.round(agg.revenue * 100) / 100
    const quantity = agg.quantity
    const orderCount = agg.orderIds.size
    return {
      productId: agg.productId,
      productName: p?.name || `商品#${agg.productId}`,
      category: p?.category || agg.category,
      sellerId: p?.seller?.id,
      sellerName: p?.seller?.username || '—',
      currentPrice: p?.price ?? 0,
      stock: p?.stock ?? 0,
      image: p?.image,
      revenue,
      quantity,
      orderCount,
      avgUnitPrice: quantity > 0 ? Math.round((revenue / quantity) * 100) / 100 : 0
    }
  })

  const sortKey = ['revenue', 'quantity', 'orderCount'].includes(sortBy) ? sortBy : 'revenue'
  productRanking.sort((a, b) => b[sortKey] - a[sortKey])
  productRanking = productRanking.slice(0, limit).map((item, index) => ({
    rank: index + 1,
    ...item
  }))

  let categoryRanking = Array.from(categoryMap.values())
    .map((agg) => ({
      category: agg.category,
      revenue: Math.round(agg.revenue * 100) / 100,
      quantity: agg.quantity,
      orderCount: agg.orderIds.size,
      productCount: agg.productIds.size
    }))
    .sort((a, b) => b[sortKey] - a[sortKey])
    .slice(0, limit)
    .map((item, index) => ({ rank: index + 1, ...item }))

  const totalRevenue = records.reduce((s, r) => s + r.unitPrice * r.quantity, 0)
  const totalQuantity = records.reduce((s, r) => s + r.quantity, 0)
  const orderIds = new Set(records.map((r) => r.orderId))

  const categories = await prisma.purchaseRecord.groupBy({
    by: ['category'],
    where: windowDays > 0 ? { purchaseDate: { gte: daysAgo(windowDays) } } : {},
    _count: { id: true }
  })

  return {
    sortBy: sortKey,
    windowDays: windowDays || 'all',
    category: category || '全部',
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalQuantity,
      totalOrders: orderIds.size,
      rankedProductCount: productMap.size,
      topProduct: productRanking[0] || null
    },
    productRanking,
    categoryRanking,
    availableCategories: categories.map((c) => c.category || '未分类')
  }
}

module.exports = { getSalesRanking }
