// routes/admin.js
const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const adminSellerController = require('../controllers/adminSellerController')
const adminAnalyticsController = require('../controllers/adminAnalyticsController')
const antiCrawlerController = require('../controllers/antiCrawlerController')
const dataExportImportController = require('../controllers/dataExportImportController')
const multer = require('multer')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } })
const { authenticateJWT, requireAdmin } = require('../middleware/auth')

// 仅对管理员开放
router.use(authenticateJWT, requireAdmin)

// ========== 管理后台：统计与销售人员管理（保留的精简接口） ==========
router.get('/stats/dashboard', adminController.getDashboardStats)

// 销售人员管理（ID 管理、添加/删除、密码重置）
router.get('/sellers', adminSellerController.getSellers)
router.get('/sellers/performance', adminSellerController.getSellerPerformance)
router.post('/sellers', adminSellerController.createSeller)
router.delete('/sellers/:id', adminSellerController.deleteSeller)
router.put('/sellers/:id/reset-password', adminSellerController.resetSellerPassword)
router.get('/reports/sales', adminSellerController.getSalesReport)

// 3.2 数据采集概览（验收 / 监控）
router.get('/analytics/collection', adminAnalyticsController.getCollectionSummary)
router.get('/analytics/user-profiles/overview', adminAnalyticsController.getUserProfileOverview)
router.get('/analytics/user-profiles', adminAnalyticsController.getUserProfiles)
router.get('/analytics/user-profiles/:userId', adminAnalyticsController.getUserProfileDetail)
router.get('/analytics/sales-trend', adminAnalyticsController.getSalesTrend)
router.get('/analytics/sales-trend-chart', adminAnalyticsController.getSalesTrendChart)
router.get('/analytics/sales-anomalies', adminAnalyticsController.getSalesAnomalies)
router.get('/analytics/sales-ranking', adminAnalyticsController.getSalesRanking)

// 3.4 反爬虫监控
router.get('/analytics/data-screen', adminAnalyticsController.getDataScreen)

// 3.4 数据导入/导出
router.get('/data-export/:type', dataExportImportController.adminExport)
router.get('/data-import/template', dataExportImportController.downloadTemplate)
router.post('/data-import/products', upload.single('file'), dataExportImportController.importProducts)

router.get('/anti-crawler/stats', antiCrawlerController.getStats)
router.get('/anti-crawler/events', antiCrawlerController.getEvents)
router.post('/anti-crawler/unban/:ip', antiCrawlerController.unban)

module.exports = router