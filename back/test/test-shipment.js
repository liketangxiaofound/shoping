// test-shipment.js
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');

async function testShipment() {
  console.log('🚀 开始测试发货流程...\n');

  // 1. 管理员登录获取token
  console.log('1️⃣ 管理员登录...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'admin', // 确保这是正确的管理员用户名
      password: '123456' // 确保这是正确的密码
    });

  console.log('登录响应:', {
    status: loginRes.status,
    success: loginRes.body.success,
    message: loginRes.body.message
  });

  if (!loginRes.body.success) {
    console.log('❌ 管理员登录失败:', loginRes.body.message);
    console.log('请确保管理员账户存在且密码正确');
    return;
  }

  const adminToken = loginRes.body.data.token;
  console.log('✅ 管理员登录成功, Token:', adminToken.substring(0, 20) + '...\n');

  // 2. 获取待发货订单
  console.log('2️⃣ 获取待发货订单...');
  const ordersRes = await request(app)
    .get('/api/admin/orders?status=paid')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log('获取订单响应状态:', ordersRes.status);
  console.log('获取订单响应数据:', JSON.stringify(ordersRes.body, null, 2));

  if (!ordersRes.body.success) {
    console.log('❌ 获取订单失败:', ordersRes.body.message);
    return;
  }

  if (!ordersRes.body.data || !ordersRes.body.data.orders) {
    console.log('❌ 订单数据格式错误');
    return;
  }

  if (ordersRes.body.data.orders.length === 0) {
    console.log('⚠️ 没有找到待发货的订单');
    
    // 如果没有订单，可以创建一个测试订单
    console.log('尝试创建测试订单...');
    await createTestOrderAndShip(adminToken);
    return;
  }

  const order = ordersRes.body.data.orders[0];
  console.log(`📦 找到待发货订单: ${order.orderNo} (ID: ${order.id})\n`);

  // 3. 发货
  console.log('3️⃣ 执行发货操作...');
  const shipRes = await request(app)
    .post(`/api/admin/orders/${order.id}/ship`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      trackingNumber: 'SF1234567890'
    });

  console.log('发货响应:', JSON.stringify(shipRes.body, null, 2));

  if (shipRes.body.success) {
    console.log('\n✅ 发货成功');
    console.log('运单号:', shipRes.body.data.order.trackingNumber);
    console.log('发货时间:', shipRes.body.data.order.shippedAt);
  } else {
    console.log('\n❌ 发货失败:', shipRes.body.message);
  }
}

// 创建测试订单的函数
async function createTestOrderAndShip(adminToken) {
  try {
    console.log('\n🧪 创建测试订单流程...');
    
    // 首先需要创建一个普通用户并登录
    console.log('a) 创建普通用户...');
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser_' + Date.now(),
        password: '123456',
        email: 'test@example.com'
      });

    if (!registerRes.body.success) {
      console.log('创建用户失败:', registerRes.body.message);
      return;
    }

    const userToken = registerRes.body.data.token;
    console.log('✅ 普通用户创建成功\n');
    
    // 添加商品到购物车
    console.log('b) 添加商品到购物车...');
    const addCartRes = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId: 1,  // 假设商品ID为1
        quantity: 2
      });

    if (!addCartRes.body.success) {
      console.log('添加购物车失败:', addCartRes.body.message);
      return;
    }
    console.log('✅ 商品添加到购物车\n');
    
    // 创建订单
    console.log('c) 创建订单...');
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        address: {
          recipient: "测试用户",
          phone: "13800138000",
          province: "北京市",
          city: "北京市",
          district: "朝阳区",
          detail: "测试地址"
        },
        note: "测试订单"
      });

    if (!orderRes.body.success) {
      console.log('创建订单失败:', orderRes.body.message);
      return;
    }

    const order = orderRes.body.data.order;
    console.log(`✅ 订单创建成功: ${order.orderNo} (ID: ${order.id})\n`);
    
    // 支付订单
    console.log('d) 支付订单...');
    const payRes = await request(app)
      .post(`/api/orders/${order.id}/pay`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethod: "simulated"
      });

    if (!payRes.body.success) {
      console.log('支付失败:', payRes.body.message);
      return;
    }
    console.log('✅ 订单支付成功\n');
    
    // 现在用管理员账号发货
    console.log('e) 管理员发货...');
    const shipRes = await request(app)
      .post(`/api/admin/orders/${order.id}/ship`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        trackingNumber: 'SF' + Date.now().toString().slice(-10)
      });

    if (shipRes.body.success) {
      console.log('🎉 测试发货成功');
      console.log('订单号:', shipRes.body.data.order.orderNo);
      console.log('运单号:', shipRes.body.data.order.trackingNumber);
    } else {
      console.log('发货失败:', shipRes.body.message);
    }
    
  } catch (error) {
    console.error('创建测试订单错误:', error);
  }
}

testShipment().catch(console.error);