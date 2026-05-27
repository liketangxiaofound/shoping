const prisma = require('../utils/prisma')
const { getClientIp } = require('../utils/clientIp')

/**
 * 记录登录：时间、IP、账号、角色
 */
async function recordLogin(req, user) {
  if (!user?.id) return
  try {
    await prisma.loginLog.create({
      data: {
        userId: user.id,
        username: user.username,
        role: user.role,
        ipAddress: getClientIp(req)
      }
    })
  } catch (error) {
    console.warn('记录登录日志失败:', error.message)
  }
}

/**
 * 记录浏览行为：商品类别、停留时长（秒）、IP
 */
async function recordBrowse(req, { userId, productId, category, dwellSeconds = 0 }) {
  if (!userId) return
  try {
    await prisma.browseBehaviorLog.create({
      data: {
        userId,
        productId: productId || null,
        category: category || '未分类',
        dwellSeconds: Math.max(0, parseInt(dwellSeconds, 10) || 0),
        ipAddress: getClientIp(req)
      }
    })
  } catch (error) {
    console.warn('记录浏览行为失败:', error.message)
  }
}

/**
 * 记录购买明细（下单时写入，供大数据分析）
 */
async function recordPurchaseRecords(tx, { userId, order, items }) {
  if (!order?.id || !items?.length) return
  const client = tx || prisma
  const purchaseDate = order.createdAt || new Date()
  const rows = items.map((item) => ({
    userId,
    orderId: order.id,
    productId: item.productId,
    category: item.category || '未分类',
    unitPrice: item.price,
    quantity: item.quantity,
    purchaseDate
  }))
  await client.purchaseRecord.createMany({ data: rows })
}

/**
 * 记录销售人员 / 管理者操作日志
 */
async function recordOperation(req, content) {
  const user = req.user
  if (!user?.id || !['seller', 'admin'].includes(user.role)) return
  if (!content) return
  try {
    await prisma.operationLog.create({
      data: {
        userId: user.id,
        username: user.username,
        role: user.role,
        content: String(content).slice(0, 500),
        ipAddress: getClientIp(req)
      }
    })
  } catch (error) {
    console.warn('记录操作日志失败:', error.message)
  }
}

/**
 * 管理端：数据采集概览（3.2 验收用）
 */
async function getCollectionSummary() {
  const [loginCount, browseCount, purchaseCount, operationCount] = await Promise.all([
    prisma.loginLog.count(),
    prisma.browseBehaviorLog.count(),
    prisma.purchaseRecord.count(),
    prisma.operationLog.count()
  ])

  const [recentLogins, recentBrowses, recentPurchases, recentOperations] = await Promise.all([
    prisma.loginLog.findMany({
      orderBy: { loginAt: 'desc' },
      take: 10,
      select: { id: true, username: true, role: true, ipAddress: true, loginAt: true }
    }),
    prisma.browseBehaviorLog.findMany({
      orderBy: { browsedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        userId: true,
        category: true,
        dwellSeconds: true,
        ipAddress: true,
        browsedAt: true,
        productId: true
      }
    }),
    prisma.purchaseRecord.findMany({
      orderBy: { purchaseDate: 'desc' },
      take: 10,
      select: {
        id: true,
        userId: true,
        category: true,
        unitPrice: true,
        quantity: true,
        purchaseDate: true,
        orderId: true
      }
    }),
    prisma.operationLog.findMany({
      orderBy: { operatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        username: true,
        role: true,
        content: true,
        ipAddress: true,
        operatedAt: true
      }
    })
  ])

  return {
    counts: { loginCount, browseCount, purchaseCount, operationCount },
    recent: {
      logins: recentLogins,
      browses: recentBrowses,
      purchases: recentPurchases,
      operations: recentOperations
    }
  }
}

module.exports = {
  recordLogin,
  recordBrowse,
  recordPurchaseRecords,
  recordOperation,
  getCollectionSummary,
  getClientIp
}
