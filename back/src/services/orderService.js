// services/orderService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * 生成订单号
 */
const generateOrderNo = () => {
  const date = new Date();
  const timestamp = date.getTime().toString().slice(-8);
  const random = Math.random().toString().slice(2, 6);
  return `ORD${timestamp}${random}`;
};

/**
 * 从购物车创建订单
 */
const createOrderFromCart = async (userId, address, note = '') => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取用户购物车
    const cartItems = await tx.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            status: true
          }
        }
      }
    });

    if (!cartItems.length) {
      throw new Error('购物车为空');
    }

    // 2. 验证商品和库存
    const unavailableItems = [];
    const validItems = [];

    for (const item of cartItems) {
      const product = item.product;
      
      if (product.status !== 'active') {
        unavailableItems.push({
          productId: product.id,
          name: product.name,
          reason: '商品已下架'
        });
        continue;
      }

      if (product.stock < item.quantity) {
        unavailableItems.push({
          productId: product.id,
          name: product.name, 
          reason: `库存不足，仅剩 ${product.stock} 件`
        });
        continue;
      }

      validItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });
    }

    if (unavailableItems.length > 0) {
      throw {
        name: 'UnavailableItems',
        message: '部分商品不可用',
        items: unavailableItems
      };
    }

    // 3. 计算总金额
    const totalPrice = validItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 4. 创建订单
    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        totalPrice,
        status: 'pending',
        userId,
        address: address,
        note: note,
        orderItems: {
          create: validItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        }
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
      }
    });

    // 5. 扣减库存
    for (const item of validItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }

    // 6. 清空购物车
    await tx.cartItem.deleteMany({
      where: { userId }
    });

    return order;
  });
};

/**
 * 处理模拟支付
 */
const processSimulatedPayment = async (orderId, paymentMethod = 'simulated') => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取订单
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            email: true,
            username: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.status !== 'pending') {
      throw new Error('订单状态无效，无法支付');
    }

    // 2. 模拟支付（90%成功率）
    const isSuccess = Math.random() > 0.1;

    if (!isSuccess) {
      throw new Error('模拟支付失败，请重试');
    }

    // 3. 更新订单状态
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        paymentMethod: paymentMethod,
        paidAt: new Date()
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
                price: true
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

    return {
      success: true,
      order: updatedOrder
    };
  });
};

/**
 * 获取用户订单列表
 */
const getUserOrders = async (userId, options = {}) => {
  const { page = 1, limit = 10, status } = options;
  const skip = (page - 1) * limit;

  const where = { userId };
  if (status && status !== 'all') {
    where.status = status;
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
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.order.count({ where })
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

/**
 * 获取订单详情
 */
const getOrderDetail = async (orderId, userId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              description: true
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
  });

  if (!order) {
    throw new Error('订单不存在');
  }

  if (order.userId !== userId) {
    throw new Error('无权查看此订单');
  }

  return order;
};

/**
 * 取消订单
 */
const cancelOrder = async (orderId, userId) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true }
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.userId !== userId) {
      throw new Error('无权操作此订单');
    }

    // ✅ 检查订单状态是否允许取消
    const cancellableStatuses = ['pending', 'paid'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error('当前状态无法取消订单');
    }

    // 恢复库存
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      });
    }

    // 更新订单状态为 cancelled
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
      include: {
        orderItems: {
          include: {
            product: {
              select: { name: true }
            }
          }
        }
      }
    });

    return updatedOrder;
  });
};


/**
 * 发货功能
 */
const shipOrder = async (orderId, trackingNumber = null) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取订单信息
    const order = await tx.order.findUnique({
      where: { id: orderId },
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
      }
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 2. 验证订单状态
    if (order.status !== 'paid') {
      throw new Error('只有已支付的订单可以发货');
    }

    // 3. 更新订单状态
    const updateData = {
      status: 'shipped',
      shippedAt: new Date()
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
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
      }
    });

    console.log(`✅ 订单 ${order.orderNo} 已发货`);
    if (trackingNumber) {
      console.log(`📦 运单号: ${trackingNumber}`);
    }

    return updatedOrder;
  });
};

/**
 * 确认收货
 */
const confirmReceipt = async (orderId, userId) => {
  return await prisma.$transaction(async (tx) => {
    // 1. 获取订单
    const order = await tx.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    if (order.userId !== userId) {
      throw new Error('无权操作此订单');
    }

    if (order.status !== 'shipped') {
      throw new Error('只有已发货的订单可以确认收货');
    }

    // 2. 更新订单状态
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        // 可以添加 deliveredAt 字段记录收货时间
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    return updatedOrder;
  });
};

module.exports = {
  createOrderFromCart,
  processSimulatedPayment,
  getUserOrders,
  getOrderDetail,
  cancelOrder,
  shipOrder,
  confirmReceipt
};