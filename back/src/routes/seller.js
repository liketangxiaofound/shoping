const express = require('express')
const { authenticateJWT, requireRoles } = require('../middleware/auth')
const sellerController = require('../controllers/sellerController')
const dataExportImportController = require('../controllers/dataExportImportController')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })

const router = express.Router()
router.use(authenticateJWT, requireRoles('seller', 'admin'))

router.get('/products', sellerController.getSellerProducts)
router.get('/products/:id', sellerController.getSellerProductDetail)
router.post('/products', sellerController.createSellerProduct)
router.put('/products/:id', sellerController.updateSellerProduct)
router.delete('/products/:id', sellerController.deleteSellerProduct)
router.put('/products/:id/status', sellerController.updateSellerProductStatus)

// 分类由平台统一管理，不对卖家开放增删改接口
// router.get('/categories', sellerController.getSellerCategories)
// router.post('/categories', sellerController.createCategory)
// router.delete('/categories/:id', sellerController.deleteCategory)

router.get('/orders', sellerController.getSellerOrders)
router.put('/orders/:id/ship', sellerController.shipSellerOrder)
router.get('/logs', sellerController.getSellerLogs)
router.get('/metrics', sellerController.getSellerMetrics)

router.get('/data-export/products', dataExportImportController.sellerExportProducts)
router.get('/data-import/template', dataExportImportController.downloadTemplate)
router.post('/data-import/products', upload.single('file'), dataExportImportController.importProducts)

module.exports = router
