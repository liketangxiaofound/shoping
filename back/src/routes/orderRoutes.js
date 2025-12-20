// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateJWT } = require('../middleware/auth');

// 所有订单路由需要认证
router.use(authenticateJWT);

// 订单管理
router.post('/', orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderDetail);

router.put('/:id/cancel', orderController.cancelOrder);

// 新增：确认收货
router.put('/:id/confirm-receipt', orderController.confirmReceipt);
// 支付相关
router.post('/:id/pay', orderController.simulatePayment);
// routes/orderRoutes.js
router.put('/:id/confirm-receipt', orderController.confirmReceipt);
module.exports = router;