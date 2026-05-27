// test-shipment.js
require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');

async function testShipment() {
  console.log('⚠️ 已移除后端 admin 订单管理接口，跳过发货流程测试。')
  return
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