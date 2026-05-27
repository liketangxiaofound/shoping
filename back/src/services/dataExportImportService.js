const prisma = require('../utils/prisma')
const { toCsv, parseCsv } = require('../utils/csvUtil')

const EXPORT_TYPES = {
  products: 'products',
  orders: 'orders',
  purchases: 'purchases',
  users: 'users',
  login_logs: 'login_logs',
  browse_logs: 'browse_logs'
}

async function exportProducts({ sellerId } = {}) {
  const where = sellerId ? { sellerId } : {}
  const list = await prisma.product.findMany({
    where,
    orderBy: { id: 'asc' },
    include: { seller: { select: { username: true } } }
  })
  const rows = list.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category || '',
    description: (p.description || '').replace(/\r?\n/g, ' '),
    image: p.image || '',
    status: p.status,
    seller: p.seller?.username || '',
    createdAt: p.createdAt?.toISOString?.() || ''
  }))
  return toCsv(rows, ['id', 'name', 'price', 'stock', 'category', 'description', 'image', 'status', 'seller', 'createdAt'])
}

async function exportOrders({ sellerId } = {}) {
  const where = {}
  if (sellerId) {
    where.orderItems = { some: { product: { sellerId } } }
  }
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: {
      user: { select: { username: true } },
      orderItems: { include: { product: { select: { name: true } } } }
    }
  })
  const rows = orders.map((o) => ({
    orderNo: o.orderNo,
    username: o.user?.username || '',
    totalPrice: o.totalPrice,
    status: o.status,
    paymentMethod: o.paymentMethod || '',
    itemCount: o.orderItems?.length || 0,
    items: o.orderItems?.map((i) => `${i.product?.name}x${i.quantity}`).join('; ') || '',
    createdAt: o.createdAt?.toISOString?.() || ''
  }))
  return toCsv(rows, ['orderNo', 'username', 'totalPrice', 'status', 'paymentMethod', 'itemCount', 'items', 'createdAt'])
}

async function exportPurchases() {
  const list = await prisma.purchaseRecord.findMany({
    orderBy: { purchaseDate: 'desc' },
    take: 10000,
    include: { product: { select: { name: true } } }
  })
  const rows = list.map((r) => ({
    userId: r.userId,
    orderId: r.orderId,
    product: r.product?.name || r.productId,
    category: r.category || '',
    unitPrice: r.unitPrice,
    quantity: r.quantity,
    purchaseDate: r.purchaseDate?.toISOString?.() || ''
  }))
  return toCsv(rows, ['userId', 'orderId', 'product', 'category', 'unitPrice', 'quantity', 'purchaseDate'])
}

async function exportUsers() {
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true
    }
  })
  const rows = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email || '',
    role: u.role,
    createdAt: u.createdAt?.toISOString?.() || ''
  }))
  return toCsv(rows, ['id', 'username', 'email', 'role', 'createdAt'])
}

async function exportLoginLogs() {
  const list = await prisma.loginLog.findMany({
    orderBy: { loginAt: 'desc' },
    take: 5000
  })
  const rows = list.map((l) => ({
    username: l.username,
    role: l.role,
    ipAddress: l.ipAddress || '',
    loginAt: l.loginAt?.toISOString?.() || ''
  }))
  return toCsv(rows, ['username', 'role', 'ipAddress', 'loginAt'])
}

async function exportBrowseLogs() {
  const list = await prisma.browseBehaviorLog.findMany({
    orderBy: { browsedAt: 'desc' },
    take: 5000
  })
  const rows = list.map((b) => ({
    userId: b.userId,
    productId: b.productId || '',
    category: b.category || '',
    dwellSeconds: b.dwellSeconds,
    ipAddress: b.ipAddress || '',
    browsedAt: b.browsedAt?.toISOString?.() || ''
  }))
  return toCsv(rows, ['userId', 'productId', 'category', 'dwellSeconds', 'ipAddress', 'browsedAt'])
}

async function exportByType(type, options = {}) {
  switch (type) {
    case EXPORT_TYPES.products:
      return exportProducts(options)
    case EXPORT_TYPES.orders:
      return exportOrders(options)
    case EXPORT_TYPES.purchases:
      return exportPurchases()
    case EXPORT_TYPES.users:
      return exportUsers()
    case EXPORT_TYPES.login_logs:
      return exportLoginLogs()
    case EXPORT_TYPES.browse_logs:
      return exportBrowseLogs()
    default:
      throw new Error(`不支持的导出类型: ${type}`)
  }
}

/**
 * 导入商品 CSV
 * 表头: name,price,stock,category,description,image,status
 */
async function importProducts(csvText, { sellerId, userId, username, role }) {
  const { rows } = parseCsv(csvText)
  if (!rows.length) {
    return { success: false, message: 'CSV 无数据行', created: 0, failed: 0, errors: [] }
  }

  const errors = []
  let created = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNo = i + 2
    const name = row.name || row['商品名称']
    const price = parseFloat(row.price ?? row['价格'])
    const stock = parseInt(row.stock ?? row['库存'], 10)

    if (!name || Number.isNaN(price) || Number.isNaN(stock)) {
      errors.push({ line: lineNo, message: '缺少 name/price/stock 或格式错误' })
      continue
    }

    const categoryName = (row.category || row['分类'] || '未分类').trim()
    let categoryId = null
    if (categoryName) {
      const cat = await prisma.category.upsert({
        where: { name: categoryName },
        create: { name: categoryName },
        update: {}
      })
      categoryId = cat.id
    }

    const assignSellerId =
      role === 'seller' ? sellerId : row.sellerId ? parseInt(row.sellerId, 10) : sellerId

    try {
      await prisma.product.create({
        data: {
          name: String(name).trim(),
          price,
          stock: Math.max(0, stock),
          description: row.description || row['描述'] || '',
          category: categoryName,
          categoryId,
          image: row.image || row['图片'] || '',
          status: ['active', 'inactive', 'draft'].includes(row.status) ? row.status : 'active',
          sellerId: assignSellerId || null
        }
      })
      created++
    } catch (e) {
      errors.push({ line: lineNo, message: e.message })
    }
  }

  if (userId && created > 0) {
    await prisma.operationLog
      .create({
        data: {
          userId,
          username: username || 'system',
          role: role === 'admin' ? 'admin' : 'seller',
          content: `CSV 导入商品 ${created} 条`,
          ipAddress: null
        }
      })
      .catch(() => {})
  }

  return {
    success: errors.length === 0 || created > 0,
    message: `成功导入 ${created} 条，失败 ${errors.length} 条`,
    created,
    failed: errors.length,
    errors: errors.slice(0, 20)
  }
}

function getImportTemplateCsv() {
  return toCsv(
    [
      {
        name: '示例商品A',
        price: 99.9,
        stock: 100,
        category: '手机',
        description: '商品描述',
        image: '',
        status: 'active'
      }
    ],
    ['name', 'price', 'stock', 'category', 'description', 'image', 'status']
  )
}

module.exports = {
  EXPORT_TYPES,
  exportByType,
  importProducts,
  getImportTemplateCsv
}
