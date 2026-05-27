// controllers/orderController.js
const orderService = require('../services/orderService');
const emailService = require('../services/emailService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 创建订单
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { address, note } = req.body;

    if (!address || !address.recipient || !address.phone || !address.detail) {
      return res.status(400).json({
        success: false,
        message: '请提供完整的收货地址'
      });
    }

    console.log(`🛍️ 用户 ${userId} 创建订单`);

    const order = await orderService.createOrderFromCart(userId, address, note);

    console.log(`✅ 订单创建成功: ${order.orderNo}`);

    res.json({
      success: true,
      message: '订单创建成功',
      data: {
        order,
        nextStep: 'payment'
      }
    });

  } catch (error) {
    console.error('创建订单错误:', error);
    
    if (error.name === 'UnavailableItems') {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: error.items
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || '创建订单失败'
    });
  }
};

/**
 * 模拟支付
 */
const simulatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);
    const { paymentMethod = 'simulated' } = req.body;

    console.log(`💳 用户 ${userId} 支付订单 ${orderId}`);

    const result = await orderService.processSimulatedPayment(orderId, userId, paymentMethod);

    if (result.success) {
      // 发送支付成功邮件
      try {
        await emailService.sendPaymentSuccessEmail(result.order, result.order.user);
        console.log('📧 支付成功邮件已发送');
      } catch (emailError) {
        console.error('邮件发送失败:', emailError);
      }

      res.json({
        success: true,
        message: '支付成功',
        data: {
          order: result.order,
          paidAt: result.order.paidAt
        }
      });
    } else {
      res.json({
        success: false,
        message: '支付失败'
      });
    }

  } catch (error) {
    console.error('支付错误:', error);
    res.status(400).json({
      success: false,
      message: error.message || '支付失败'
    });
  }
};

/**
 * 获取订单列表
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;

    const result = await orderService.getUserOrders(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
};

/**
 * 获取订单详情
 */
const getOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);

    const order = await orderService.getOrderDetail(orderId, userId);

    res.json({
      success: true,
      data: { order }
    });

  } catch (error) {
    console.error('获取订单详情错误:', error);
    
    if (error.message === '订单不存在' || error.message === '无权查看此订单') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
    });
  }
};

/**
 * 取消订单
 */
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);
    const { reason } = req.body;

    console.log(`❌ 用户 ${userId} 取消订单 ${orderId}`);
    if (reason) console.log('取消原因:', reason);

    const order = await orderService.cancelOrder(orderId, userId);

    res.json({
      success: true,
      message: '订单已取消',
      data: { order }
    });

  } catch (error) {
    console.error('取消订单错误:', error);
    
    if (error.message === '订单不存在' || error.message === '无权操作此订单' || 
        error.message === '当前状态无法取消订单') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '取消订单失败'
    });
  }
};

// controllers/orderController.js
/**
 * 确认收货
 */
const confirmReceipt = async (req, res) => {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id);

    console.log(`📦 用户 ${userId} 确认收货订单 ${orderId}`);

    // 获取订单
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此订单'
      });
    }

    if (order.status !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: '只有已发货的订单可以确认收货'
      });
    }

    // 更新订单状态
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: 'delivered',
        deliveredAt: new Date()
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
            username: true,
            email: true
          }
        }
      }
    });

    // 可以在这里发送确认收货邮件
    // await emailService.sendOrderDeliveredEmail(updatedOrder, updatedOrder.user);

    res.json({
      success: true,
      message: '确认收货成功',
      data: { order: updatedOrder }
    });

  } catch (error) {
    console.error('确认收货错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '确认收货失败'
    });
  }
};


/**
 * 发货接口
 */
const shipOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { trackingNumber } = req.body;

    console.log(`🚚 管理员发货订单 ${orderId}`);
    if (trackingNumber) {
      console.log(`运单号: ${trackingNumber}`);
    }

    // 发货
    const order = await orderService.shipOrder(orderId, trackingNumber);

    // 发送发货通知邮件
    try {
      await emailService.sendShippedEmail(order, order.user, trackingNumber);
      console.log('📧 发货通知邮件已发送');
    } catch (emailError) {
      console.error('邮件发送失败:', emailError);
      // 邮件发送失败不影响发货操作
    }

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
    });

  } catch (error) {
    console.error('发货错误:', error);
    
    if (error.message === '订单不存在') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === '只有已支付的订单可以发货') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '发货失败'
    });
  }
};


module.exports = {
  createOrder,
  simulatePayment,
  getOrders,
  getOrderDetail,
  cancelOrder,
  confirmReceipt,
  shipOrder,
};