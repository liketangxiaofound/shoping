// controllers/adminController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


const getDashboardStats = async (req, res) => {
  try {
    const [totalRevenue, totalOrders, totalProducts, totalUsers] = await Promise.all([
      // 总销售额
      prisma.order.aggregate({
        where: { status: { in: ['paid', 'shipped', 'delivered'] } },
        _sum: { totalPrice: true }
      }),
      // 总订单数
      prisma.order.count(),
      // 商品总数
      prisma.product.count(),
      // 用户总数
      prisma.user.count()
    ])
    
    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue._sum.totalPrice || 0,
        totalOrders,
        totalProducts,
        totalUsers
      }
    })
  } catch (error) {
    console.error('获取统计数据错误:', error)
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    })
  }
}

module.exports={
    getDashboardStats
}