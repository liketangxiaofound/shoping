const dataCollection = require('../services/dataCollectionService')
const userProfileService = require('../services/userProfileService')
const salesTrendService = require('../services/salesTrendService')
const salesAnomalyService = require('../services/salesAnomalyService')
const salesRankingService = require('../services/salesRankingService')
const dataScreenService = require('../services/dataScreenService')

async function getCollectionSummary(req, res) {
  try {
    const data = await dataCollection.getCollectionSummary()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取数据采集概览失败:', error)
    res.status(500).json({ success: false, message: '获取数据采集概览失败' })
  }
}

/** 3.3 用户画像总览 */
async function getUserProfileOverview(req, res) {
  try {
    const data = await userProfileService.getUserProfileOverview()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取用户画像总览失败:', error)
    res.status(500).json({ success: false, message: '获取用户画像总览失败' })
  }
}

/** 3.3 用户画像列表 */
async function getUserProfiles(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const role = req.query.role || 'customer'
    const data = await userProfileService.getUserProfiles({ page, limit, role })
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取用户画像列表失败:', error)
    res.status(500).json({ success: false, message: '获取用户画像列表失败' })
  }
}

/** 3.3 单个用户画像详情 */
async function getUserProfileDetail(req, res) {
  try {
    const userId = parseInt(req.params.userId, 10)
    const profile = await userProfileService.buildUserProfile(userId)
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    res.json({ success: true, data: profile })
  } catch (error) {
    console.error('获取用户画像详情失败:', error)
    res.status(500).json({ success: false, message: '获取用户画像详情失败' })
  }
}

/** 3.3 商品销售趋势预测与评估 */
async function getSalesTrend(req, res) {
  try {
    const period = ['day', 'week', 'month'].includes(req.query.period)
      ? req.query.period
      : 'day'
    const category = req.query.category || undefined
    const forecastPeriods = Math.min(parseInt(req.query.forecastPeriods, 10) || 7, 14)
    const data = await salesTrendService.getSalesTrend({ period, category, forecastPeriods })
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取销售趋势预测失败:', error)
    res.status(500).json({ success: false, message: '获取销售趋势预测失败' })
  }
}

/** 3.3 销售异常判别与实时监控 */
async function getSalesAnomalies(req, res) {
  try {
    const windowDays = Math.min(parseInt(req.query.windowDays, 10) || 30, 90)
    const data = await salesAnomalyService.getSalesAnomalyMonitor({ windowDays })
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取销售异常监控失败:', error)
    res.status(500).json({ success: false, message: '获取销售异常监控失败' })
  }
}

/** 3.3 销售趋势图（日/周/月） */
async function getSalesTrendChart(req, res) {
  try {
    const period = ['day', 'week', 'month'].includes(req.query.period) ? req.query.period : 'day'
    const category = req.query.category || undefined
    const points = req.query.points ? parseInt(req.query.points, 10) : undefined
    const data = await salesTrendService.getSalesTrendChart({ period, category, points })
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取销售趋势图失败:', error)
    res.status(500).json({ success: false, message: '获取销售趋势图失败' })
  }
}

/** 3.3 商品销售排行榜 */
async function getSalesRanking(req, res) {
  try {
    const sortBy = ['revenue', 'quantity', 'orderCount'].includes(req.query.sortBy)
      ? req.query.sortBy
      : 'revenue'
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50)
    const windowDays = req.query.windowDays === 'all' ? 0 : parseInt(req.query.windowDays, 10) || 30
    const category = req.query.category || undefined
    const data = await salesRankingService.getSalesRanking({ sortBy, limit, windowDays, category })
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取销售排行榜失败:', error)
    res.status(500).json({ success: false, message: '获取销售排行榜失败' })
  }
}

/** 3.4 数据可视化大屏 */
async function getDataScreen(req, res) {
  try {
    const data = await dataScreenService.getDataScreenPayload()
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取数据大屏失败:', error)
    res.status(500).json({ success: false, message: '获取数据大屏失败' })
  }
}

module.exports = {
  getCollectionSummary,
  getUserProfileOverview,
  getUserProfiles,
  getUserProfileDetail,
  getSalesTrend,
  getSalesTrendChart,
  getSalesAnomalies,
  getSalesRanking,
  getDataScreen
}
