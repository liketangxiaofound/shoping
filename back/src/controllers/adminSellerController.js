const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const dataCollection = require('../services/dataCollectionService')
const prisma = new PrismaClient()

const getSellers = async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: 'seller' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ success: true, data: sellers })
  } catch (error) {
    console.error('获取销售人员列表失败:', error)
    res.status(500).json({ success: false, message: '获取销售人员列表失败' })
  }
}

const createSeller = async (req, res) => {
  try {
    const { username, email, password = '123456' } = req.body
    if (!username || !email) {
      return res.status(400).json({ success: false, message: '用户名和邮箱为必填项' })
    }
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    })
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名或邮箱已存在' })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const seller = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'seller'
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true
      }
    })
    await dataCollection.recordOperation(req, `新增销售人员：${seller.username}（ID ${seller.id}）`)
    res.json({ success: true, message: '销售人员创建成功', data: seller })
  } catch (error) {
    console.error('创建销售人员失败:', error)
    res.status(500).json({ success: false, message: '创建销售人员失败' })
  }
}

const deleteSeller = async (req, res) => {
  try {
    const sellerId = parseInt(req.params.id)
    const seller = await prisma.user.findUnique({ where: { id: sellerId } })
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: '销售人员不存在' })
    }
    const productCount = await prisma.product.count({ where: { sellerId } })
    if (productCount > 0) {
      return res.status(400).json({ success: false, message: '该销售人员仍有商品，请先删除或转移商品' })
    }
    await dataCollection.recordOperation(req, `删除销售人员：${seller.username}（ID ${sellerId}）`)
    await prisma.user.delete({ where: { id: sellerId } })
    res.json({ success: true, message: '销售人员删除成功' })
  } catch (error) {
    console.error('删除销售人员失败:', error)
    res.status(500).json({ success: false, message: '删除销售人员失败' })
  }
}

const resetSellerPassword = async (req, res) => {
  try {
    const sellerId = parseInt(req.params.id)
    const { password = '123456' } = req.body
    const seller = await prisma.user.findUnique({ where: { id: sellerId } })
    if (!seller || seller.role !== 'seller') {
      return res.status(404).json({ success: false, message: '销售人员不存在' })
    }
    const hashedPassword = await bcrypt.hash(password || '123456', 10)
    await prisma.user.update({ where: { id: sellerId }, data: { password: hashedPassword } })
    await dataCollection.recordOperation(req, `重置销售人员密码：${seller.username}（ID ${sellerId}）`)
    res.json({ success: true, message: '密码重置成功', data: { sellerId, password: password || '123456' } })
  } catch (error) {
    console.error('重置销售人员密码失败:', error)
    res.status(500).json({ success: false, message: '重置密码失败' })
  }
}

const getSellerPerformance = async (req, res) => {
  try {
    const sellers = await prisma.user.findMany({
      where: { role: 'seller' },
      select: {
        id: true,
        username: true,
        email: true
      }
    })
    const performance = []
    for (const seller of sellers) {
      const sellerOrderItems = await prisma.orderItem.findMany({
        where: { product: { sellerId: seller.id } },
        select: { quantity: true, price: true, orderId: true }
      })
      const revenue = sellerOrderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const orderCount = new Set(sellerOrderItems.map((item) => item.orderId)).size
      const productCount = await prisma.product.count({ where: { sellerId: seller.id } })
      performance.push({
        sellerId: seller.id,
        username: seller.username,
        email: seller.email,
        revenue,
        orderCount,
        productCount
      })
    }
    res.json({ success: true, data: performance })
  } catch (error) {
    console.error('获取销售人员绩效失败:', error)
    res.status(500).json({ success: false, message: '获取绩效失败' })
  }
}

const getSalesReport = async (req, res) => {
  try {
    const categoryReport = []
    const categories = await prisma.product.groupBy({
      by: ['category'],
      _count: { id: true }
    })
    for (const group of categories) {
      const revenueItems = await prisma.orderItem.findMany({
        where: { product: { category: group.category } },
        select: { quantity: true, price: true }
      })
      const revenue = revenueItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      categoryReport.push({ category: group.category || '未分类', productCount: group._count.id, revenue })
    }

    const statusGroups = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true }
    })
    const statusReport = statusGroups.map(item => ({ status: item.status, count: item._count.id }))

    const lowStock = await prisma.product.count({ where: { stock: { lt: 10 } } })
    const normalStock = await prisma.product.count({ where: { stock: { gte: 10, lt: 50 } } })
    const highStock = await prisma.product.count({ where: { stock: { gte: 50 } } })
    const stockReport = [
      { label: '低库存(<10)', count: lowStock },
      { label: '中等库存(10-49)', count: normalStock },
      { label: '高库存(>=50)', count: highStock }
    ]

    res.json({ success: true, data: { categoryReport, statusReport, stockReport } })
  } catch (error) {
    console.error('获取销售统计报表失败:', error)
    res.status(500).json({ success: false, message: '获取销售统计失败' })
  }
}

module.exports = {
  getSellers,
  createSeller,
  deleteSeller,
  resetSellerPassword,
  getSellerPerformance,
  getSalesReport
}
