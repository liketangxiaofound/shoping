const prisma = require('../utils/prisma')

const PLACEHOLDER =
  'https://via.placeholder.com/300x300/f0f0f0/969696?text=商品'

function formatProduct(p) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    description: p.description,
    imageUrl: p.image || PLACEHOLDER,
    reason: p.reason,
    score: p.score
  }
}

/**
 * 简单推荐：浏览/购买过此商品的用户也买了…
 */
async function getAlsoBought(productId, limit = 8) {
  const pid = parseInt(productId, 10)
  if (!Number.isFinite(pid)) return { type: 'also_bought', products: [] }

  const product = await prisma.product.findUnique({
    where: { id: pid },
    select: { id: true, status: true }
  })
  if (!product || product.status !== 'active') {
    return { type: 'also_bought', products: [] }
  }

  const [buyerRecords, viewerRecords] = await Promise.all([
    prisma.purchaseRecord.findMany({
      where: { productId: pid },
      select: { userId: true }
    }),
    prisma.browseBehaviorLog.findMany({
      where: { productId: pid },
      select: { userId: true }
    })
  ])

  const userIds = [...new Set([
    ...buyerRecords.map((r) => r.userId),
    ...viewerRecords.map((r) => r.userId)
  ])]

  if (!userIds.length) {
    const fallback = await getPopularProducts(limit, pid)
    return { type: 'also_bought', products: fallback, fallback: true }
  }

  const related = await prisma.purchaseRecord.findMany({
    where: {
      userId: { in: userIds },
      productId: { not: pid }
    },
    select: { productId: true, quantity: true }
  })

  const scoreMap = new Map()
  for (const row of related) {
    scoreMap.set(row.productId, (scoreMap.get(row.productId) || 0) + row.quantity)
  }

  const ranked = [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (!ranked.length) {
    const sameCategory = await getSameCategoryProducts(pid, limit)
    return { type: 'also_bought', products: sameCategory, fallback: true }
  }

  const products = await fetchProductsByIds(
    ranked.map(([id]) => id),
    ranked,
    '购买过相似商品的用户也购买了此商品'
  )
  return { type: 'also_bought', products }
}

/**
 * 协同过滤（User-Based）：基于用户购买行为的 Jaccard 相似度
 */
async function getCollaborativeForUser(userId, limit = 12) {
  const uid = parseInt(userId, 10)
  if (!Number.isFinite(uid)) return { type: 'collaborative', products: [] }

  const allRecords = await prisma.purchaseRecord.findMany({
    select: { userId: true, productId: true, quantity: true }
  })

  if (!allRecords.length) {
    return { type: 'collaborative', products: await getPopularProducts(limit), fallback: true }
  }

  const userProductSets = new Map()
  for (const row of allRecords) {
    if (!userProductSets.has(row.userId)) {
      userProductSets.set(row.userId, new Map())
    }
    const m = userProductSets.get(row.userId)
    m.set(row.productId, (m.get(row.productId) || 0) + row.quantity)
  }

  const myMap = userProductSets.get(uid)
  if (!myMap || myMap.size === 0) {
    const browseBoost = await getBrowseBasedSeed(uid)
    if (browseBoost.size === 0) {
      return { type: 'collaborative', products: await getPopularProducts(limit), fallback: true }
    }
    return recommendFromSeedMap(browseBoost, userProductSets, uid, limit)
  }

  const mySet = new Set(myMap.keys())
  const similarities = []

  for (const [otherId, otherMap] of userProductSets) {
    if (otherId === uid) continue
    const otherSet = new Set(otherMap.keys())
    const inter = [...mySet].filter((x) => otherSet.has(x)).length
    const union = new Set([...mySet, ...otherSet]).size
    const sim = union > 0 ? inter / union : 0
    if (sim > 0) similarities.push({ otherId, sim })
  }

  similarities.sort((a, b) => b.sim - a.sim)
  const topNeighbors = similarities.slice(0, 25)

  const productScores = new Map()
  for (const { otherId, sim } of topNeighbors) {
    const otherMap = userProductSets.get(otherId)
    for (const [productId, qty] of otherMap) {
      if (mySet.has(productId)) continue
      productScores.set(productId, (productScores.get(productId) || 0) + sim * qty)
    }
  }

  const ranked = [...productScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  if (!ranked.length) {
    return { type: 'collaborative', products: await getPopularProducts(limit), fallback: true }
  }

  const products = await fetchProductsByIds(
    ranked.map(([id]) => id),
    ranked,
    '根据与您兴趣相似的用户购买记录推荐'
  )
  return { type: 'collaborative', products }
}

async function getBrowseBasedSeed(userId) {
  const browses = await prisma.browseBehaviorLog.findMany({
    where: { userId },
    select: { productId: true, dwellSeconds: true, category: true },
    orderBy: { browsedAt: 'desc' },
    take: 30
  })
  const seed = new Map()
  for (const b of browses) {
    if (!b.productId) continue
    seed.set(b.productId, (seed.get(b.productId) || 0) + Math.max(1, b.dwellSeconds))
  }
  return seed
}

async function recommendFromSeedMap(seedMap, userProductSets, userId, limit) {
  const seedCategories = new Set()
  const productIds = [...seedMap.keys()]
  if (productIds.length) {
    const prods = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { category: true }
    })
    prods.forEach((p) => p.category && seedCategories.add(p.category))
  }

  const productScores = new Map()
  for (const [, otherMap] of userProductSets) {
    if ([...otherMap.keys()].some((pid) => seedMap.has(pid))) {
      for (const [pid, qty] of otherMap) {
        if (seedMap.has(pid)) continue
        productScores.set(pid, (productScores.get(pid) || 0) + qty)
      }
    }
  }

  let ranked = [...productScores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)

  if (ranked.length < limit && seedCategories.size) {
    const catProducts = await prisma.product.findMany({
      where: {
        status: 'active',
        category: { in: [...seedCategories] },
        id: { notIn: [...seedMap.keys()] }
      },
      take: limit
    })
    for (const p of catProducts) {
      if (!ranked.find(([id]) => id === p.id)) {
        ranked.push([p.id, 1])
      }
    }
    ranked = ranked.slice(0, limit)
  }

  const products = await fetchProductsByIds(
    ranked.map(([id]) => id),
    ranked,
    '根据您的浏览偏好推荐'
  )
  return { type: 'collaborative', products, fallback: ranked.length === 0 }
}

async function getPopularProducts(limit = 12, excludeId = null) {
  const records = await prisma.purchaseRecord.findMany({
    select: { productId: true, quantity: true }
  })
  const counts = new Map()
  for (const r of records) {
    if (excludeId && r.productId === excludeId) continue
    counts.set(r.productId, (counts.get(r.productId) || 0) + r.quantity)
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
  return fetchProductsByIds(
    ranked.map(([id]) => id),
    ranked,
    '热销商品'
  )
}

async function getSameCategoryProducts(productId, limit) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { category: true }
  })
  if (!product?.category) return getPopularProducts(limit, productId)
  const list = await prisma.product.findMany({
    where: {
      status: 'active',
      category: product.category,
      id: { not: productId }
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  })
  return list.map((p) => formatProduct({ ...p, reason: '同分类热门', score: 1 }))
}

async function fetchProductsByIds(ids, rankedPairs, reason) {
  if (!ids.length) return []
  const scoreMap = new Map(rankedPairs)
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: 'active' },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      category: true,
      description: true,
      image: true
    }
  })
  const byId = Object.fromEntries(products.map((p) => [p.id, p]))
  return ids
    .filter((id) => byId[id])
    .map((id) =>
      formatProduct({
        ...byId[id],
        reason,
        score: Math.round((scoreMap.get(id) || 0) * 100) / 100
      })
    )
}

/**
 * 首页推荐：登录用户走协同过滤，未登录走热销
 */
async function getHomeRecommendations(userId, limit = 12) {
  if (userId) {
    return getCollaborativeForUser(userId, limit)
  }
  const products = await getPopularProducts(limit)
  return { type: 'popular', products, fallback: true }
}

module.exports = {
  getAlsoBought,
  getCollaborativeForUser,
  getHomeRecommendations,
  getPopularProducts
}
