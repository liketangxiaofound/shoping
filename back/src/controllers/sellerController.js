const { PrismaClient } = require('@prisma/client')
const dataCollection = require('../services/dataCollectionService')
const orderService = require('../services/orderService')
const emailService = require('../services/emailService')
const { toStoredImages } = require('../utils/productImages')
const redisClient = require('../utils/redis')
const prisma = new PrismaClient()

async function clearProductCache(productId) {
  try {
    if (redisClient.isOpen) {
      await redisClient.del(`product:${productId}`)
    }
  } catch (_) {
    /* 可选 */
  }
}

async function assertSellerCanShipOrder(orderId, sellerId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: { select: { id: true, name: true, sellerId: true } }
        }
      }
    }
  })

  if (!order) {
    const err = new Error('订单不存在')
    err.statusCode = 404
    throw err
  }

  const sellerItems = order.orderItems.filter((item) => item.product?.sellerId === sellerId)
  if (sellerItems.length === 0) {
    const err = new Error('无权操作该订单')
    err.statusCode = 403
    throw err
  }

  const hasOtherSellerItems = order.orderItems.some((item) => item.product?.sellerId !== sellerId)
  if (hasOtherSellerItems) {
    const err = new Error('订单包含其他商家商品，无法由本店单独发货')
    err.statusCode = 400
    throw err
  }

  return order
}

const getSellerProducts = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, keyword, category, status } = req.query
    const skip = (page - 1) * limit

    const where = {
      ...(req.user.role !== 'admin' ? { sellerId: userId } : {})
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } }
      ]
    }
    if (category) {
      where.category = category
    }
    if (status) {
      where.status = status
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])

    res.json({
      success: true,
      data: {
        products,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取卖家商品列表失败:', error)
    res.status(500).json({ success: false, message: '获取商品列表失败' })
  }
}

const createSellerProduct = async (req, res) => {
  try {
    const userId = req.user.id
    const { name, price, stock, description, category, categoryId, imageUrl } = req.body

    if (!name || !price || stock === undefined) {
      return res.status(400).json({ success: false, message: '商品名称、价格和库存为必填项' })
    }

    let categoryName = category || ''
    if (categoryId) {
      const categoryRecord = await prisma.category.findUnique({ where: { id: parseInt(categoryId) } })
      if (!categoryRecord) {
        return res.status(400).json({ success: false, message: '分类不存在' })
      }
      categoryName = categoryRecord.name
    }

    const mainImage = imageUrl ? String(imageUrl).trim() : ''
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        description: description || '',
        category: categoryName,
        categoryId: categoryId ? parseInt(categoryId) : null,
        image: mainImage,
        images: toStoredImages(mainImage),
        sellerId: req.user.role === 'seller' ? userId : req.body.sellerId ? parseInt(req.body.sellerId) : null,
        status: 'active'
      }
    })

    await clearProductCache(product.id)
    await dataCollection.recordOperation(req, `创建商品：${product.name}（ID ${product.id}）`)

    res.json({ success: true, message: '商品创建成功', data: { product } })
  } catch (error) {
    console.error('创建卖家商品失败:', error)
    res.status(500).json({ success: false, message: '创建商品失败' })
  }
}

const getSellerProductDetail = async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    if (req.user.role === 'seller' && product.sellerId !== req.user.id) {
      return res.status(403).json({ success: false, message: '无权限查看该商品' })
    }
    res.json({ success: true, data: { product } })
  } catch (error) {
    console.error('获取卖家商品详情失败:', error)
    res.status(500).json({ success: false, message: '获取商品失败' })
  }
}

const updateSellerProduct = async (req, res) => {
  try {
    const userId = req.user.id
    const productId = parseInt(req.params.id)
    const { name, price, stock, description, category, categoryId, imageUrl, status } = req.body

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    if (req.user.role === 'seller' && product.sellerId !== userId) {
      return res.status(403).json({ success: false, message: '无权限修改该商品' })
    }

    let categoryName = undefined
    if (categoryId !== undefined) {
      if (categoryId) {
        const categoryRecord = await prisma.category.findUnique({ where: { id: parseInt(categoryId) } })
        if (!categoryRecord) {
          return res.status(400).json({ success: false, message: '分类不存在' })
        }
        categoryName = categoryRecord.name
      } else {
        categoryName = ''
      }
    }

    const updateData = {
      ...(name && { name }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(categoryId !== undefined && { categoryId: categoryId ? parseInt(categoryId) : null }),
      ...(categoryName !== undefined && { category: categoryName }),
      ...(status && { status })
    }
    if (imageUrl !== undefined) {
      const mainImage = imageUrl ? String(imageUrl).trim() : ''
      updateData.image = mainImage
      updateData.images = toStoredImages(mainImage)
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData
    })

    await clearProductCache(productId)
    await dataCollection.recordOperation(req, `更新商品：${updatedProduct.name}（ID ${productId}）`)

    res.json({ success: true, message: '商品更新成功', data: { product: updatedProduct } })
  } catch (error) {
    console.error('更新卖家商品失败:', error)
    res.status(500).json({ success: false, message: '更新商品失败' })
  }
}

const deleteSellerProduct = async (req, res) => {
  try {
    const userId = req.user.id
    const productId = parseInt(req.params.id)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    if (req.user.role === 'seller' && product.sellerId !== userId) {
      return res.status(403).json({ success: false, message: '无权限删除该商品' })
    }

    const orderItems = await prisma.orderItem.findMany({ where: { productId } })
    if (orderItems.length > 0) {
      return res.status(400).json({ success: false, message: '该商品已有订单记录，无法删除' })
    }

    // 如果购物车中仍有该商品，先清除购物车项，再删除商品
    await prisma.cartItem.deleteMany({ where: { productId } })

    await prisma.product.delete({ where: { id: productId } })
    await dataCollection.recordOperation(req, `删除商品：${product.name}（ID ${productId}）`)
    res.json({ success: true, message: '商品删除成功' })
  } catch (error) {
    console.error('删除卖家商品失败:', error)
    res.status(500).json({ success: false, message: '删除商品失败' })
  }
}

const updateSellerProductStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const productId = parseInt(req.params.id)
    const { status } = req.body

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: '状态值无效' })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    if (req.user.role === 'seller' && product.sellerId !== userId) {
      return res.status(403).json({ success: false, message: '无权限修改该商品' })
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status }
    })

    await dataCollection.recordOperation(
      req,
      `${status === 'active' ? '上架' : '下架'}商品：${updatedProduct.name}（ID ${productId}）`
    )

    res.json({ success: true, message: `商品已${status === 'active' ? '上架' : '下架'}`, data: { product: updatedProduct } })
  } catch (error) {
    console.error('更新卖家商品状态失败:', error)
    res.status(500).json({ success: false, message: '更新商品状态失败' })
  }
}

const getSellerCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } })
    res.json({ success: true, data: categories })
  } catch (error) {
    console.error('获取分类失败:', error)
    res.status(500).json({ success: false, message: '获取分类失败' })
  }
}

const createCategory = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return res.status(400).json({ success: false, message: '分类名称不能为空' })
    }
    const existing = await prisma.category.findUnique({ where: { name } })
    if (existing) {
      return res.status(400).json({ success: false, message: '分类已存在' })
    }
    const category = await prisma.category.create({ data: { name } })
    await dataCollection.recordOperation(req, `创建分类：${name}`)
    res.json({ success: true, message: '分类创建成功', data: { category } })
  } catch (error) {
    console.error('创建分类失败:', error)
    res.status(500).json({ success: false, message: '创建分类失败' })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id)
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return res.status(404).json({ success: false, message: '分类不存在' })
    }
    const productCount = await prisma.product.count({ where: { categoryId } })
    if (productCount > 0) {
      return res.status(400).json({ success: false, message: '该分类下仍有商品，无法删除' })
    }
    await prisma.category.delete({ where: { id: categoryId } })
    await dataCollection.recordOperation(req, `删除分类：${category.name}`)
    res.json({ success: true, message: '分类删除成功' })
  } catch (error) {
    console.error('删除分类失败:', error)
    res.status(500).json({ success: false, message: '删除分类失败' })
  }
}

const getSellerOrders = async (req, res) => {
  try {
    const userId = req.user.id
    const { page = 1, limit = 10, status, startDate, endDate } = req.query
    const skip = (page - 1) * limit

    const where = {
      orderItems: {
        some: {
          product: {
            ...(req.user.role === 'seller' ? { sellerId: userId } : {})
          }
        }
      }
    }
    if (status && status !== 'all') {
      where.status = status
    }
    if (startDate) {
      where.createdAt = { gte: new Date(startDate) }
    }
    if (endDate) {
      where.createdAt = { ...(where.createdAt || {}), lte: new Date(endDate) }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.order.count({ where })
    ])

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    console.error('获取卖家订单失败:', error)
    res.status(500).json({ success: false, message: '获取订单失败' })
  }
}

const shipSellerOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10)
    if (Number.isNaN(orderId)) {
      return res.status(400).json({ success: false, message: '订单ID格式错误' })
    }

    const sellerId = req.user.id
    const { trackingNumber } = req.body || {}

    await assertSellerCanShipOrder(orderId, sellerId)

    const order = await orderService.shipOrder(orderId, trackingNumber || null)

    try {
      await emailService.sendShippedEmail(order, order.user, trackingNumber)
    } catch (emailError) {
      console.warn('发货通知邮件发送失败:', emailError.message)
    }

    await dataCollection.recordOperation(
      req,
      `订单发货：${order.orderNo}${trackingNumber ? `，运单号 ${trackingNumber}` : ''}`
    )

    res.json({
      success: true,
      message: '发货成功',
      data: {
        order: {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          shippedAt: order.shippedAt,
          trackingNumber: order.trackingNumber
        }
      }
    })
  } catch (error) {
    console.error('卖家发货失败:', error)

    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }

    if (error.message === '只有已支付的订单可以发货') {
      return res.status(400).json({ success: false, message: error.message })
    }

    res.status(500).json({ success: false, message: '发货失败' })
  }
}

const getSellerLogs = async (req, res) => {
  try {
    const userId = req.user.id
    const where =
      req.user.role === 'admin'
        ? { role: { in: ['seller', 'admin'] } }
        : { userId }

    const logs = await prisma.operationLog.findMany({
      where,
      orderBy: { operatedAt: 'desc' },
      take: 100
    })

    res.json({
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        createdAt: log.operatedAt,
        operatedAt: log.operatedAt,
        username: log.username,
        role: log.role,
        content: log.content,
        ipAddress: log.ipAddress,
        user: { username: log.username }
      }))
    })
  } catch (error) {
    console.error('获取卖家日志失败:', error)
    res.status(500).json({ success: false, message: '获取日志失败' })
  }
}

const getSellerMetrics = async (req, res) => {
  try {
    const userId = req.user.id
    const sellerCondition = req.user.role === 'seller' ? { sellerId: userId } : {}

    const products = await prisma.product.findMany({ where: sellerCondition })
    const productCount = products.length
    const totalStock = products.reduce((sum, item) => sum + item.stock, 0)
    const lowStockCount = products.filter(item => item.stock <= 10).length

    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: { ...(req.user.role === 'seller' ? { sellerId: userId } : {}) }
      },
      include: {
        order: true,
        product: true
      }
    })

    const totalRevenue = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalOrders = await prisma.order.count({
      where: {
        orderItems: {
          some: { product: { sellerId: req.user.role === 'seller' ? userId : undefined } }
        }
      }
    })

    const statusCounts = {}
    const orderStatuses = await prisma.order.findMany({
      where: {
        orderItems: {
          some: { product: { sellerId: req.user.role === 'seller' ? userId : undefined } }
        }
      },
      select: { status: true }
    })
    orderStatuses.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1
    })

    const categoryRevenue = {}
    orderItems.forEach(item => {
      const key = item.product.category || '未分类'
      categoryRevenue[key] = (categoryRevenue[key] || 0) + item.price * item.quantity
    })

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        productCount,
        totalStock,
        lowStockCount,
        statusCounts,
        categoryRevenue
      }
    })
  } catch (error) {
    console.error('获取卖家绩效失败:', error)
    res.status(500).json({ success: false, message: '获取绩效数据失败' })
  }
}

module.exports = {
  getSellerProducts,
  createSellerProduct,
  getSellerProductDetail,
  updateSellerProduct,
  deleteSellerProduct,
  updateSellerProductStatus,
  getSellerCategories,
  createCategory,
  deleteCategory,
  getSellerOrders,
  shipSellerOrder,
  getSellerLogs,
  getSellerMetrics
}
