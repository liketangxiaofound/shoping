// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const antiCrawlerController = require('../controllers/antiCrawlerController');

// 蜜罐（隐藏接口，仅供侦测爬虫扫描）
router.get('/export-all-secret', antiCrawlerController.honeypotExport);
router.get('/catalog.json', antiCrawlerController.honeypotExport);

// 分类列表
router.get('/categories', productController.getCategories);

// 搜索商品
router.get('/search', productController.searchProducts);

// 商品详情
router.get('/:id', productController.getProductById);

// 商品列表
router.get('/', productController.getProducts);







module.exports = router;