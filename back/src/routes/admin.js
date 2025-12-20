// routes/admin.js
const express = require('express')
const router = express.Router()
const adminMiddleware = require('../middleware/admin')
const adminProductController = require('../controllers/adminProductController')
const adminController = require('../controllers/adminController')
const orderController = require('../controllers/orderController')
const { authenticateJWT, requireAdmin } = require('../middleware/auth')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 应用管理员中间件（使用统一的认证和权限检查）
router.use(authenticateJWT, requireAdmin)

// ========== 商品管理路由 ==========
router.get('/products', adminProductController.getProducts)
router.post('/products', adminProductController.createProduct)
// router.get('/products/:id', adminProductController.getProductDetail) // 添加获取单个商品详情
router.put('/products/:id', adminProductController.updateProduct)
router.delete('/products/:id', adminProductController.deleteProduct)
router.put('/products/:id/status', adminProductController.updateProductStatus)
router.put('/orders/:id/ship',orderController.shipOrder)

// ========== 统计路由 ==========
router.get('/stats/dashboard', adminController.getDashboardStats)

// ========== 订单管理路由 ==========
// 获取所有订单
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    
    const orders = await prisma.order.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(userId ? { userId: parseInt(userId) } : {})
      },
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
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    const total = await prisma.order.count({
      where: {
        ...(status && status !== 'all' ? { status } : {}),
        ...(userId ? { userId: parseInt(userId) } : {})
      }
    });

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
    });

  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
})

// 发货接口
router.post('/orders/:id/ship', orderController.shipOrder)

// 获取订单详情
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true
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
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      })
    }

    res.json({
      success: true,
      data: { order }
    })
  } catch (error) {
    console.error('获取订单详情错误:', error)
    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
    })
  }
})

module.exports = router