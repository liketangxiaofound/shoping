// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 分类列表
router.get('/categories', productController.getCategories);

// 搜索商品
router.get('/search', productController.searchProducts);

// 商品详情
router.get('/:id', productController.getProductById);

// 商品列表
router.get('/', productController.getProducts);







module.exports = router;