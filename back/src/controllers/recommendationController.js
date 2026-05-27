const recommendationService = require('../services/recommendationService')

/** 浏览过此商品的人也买了… */
async function getAlsoBought(req, res) {
  try {
    const productId = req.params.productId
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 20)
    const data = await recommendationService.getAlsoBought(productId, limit)
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取关联推荐失败:', error)
    res.status(500).json({ success: false, message: '获取推荐失败' })
  }
}

/** 协同过滤：为您推荐 */
async function getForYou(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 24)
    const data = await recommendationService.getCollaborativeForUser(req.user.id, limit)
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取协同过滤推荐失败:', error)
    res.status(500).json({ success: false, message: '获取推荐失败' })
  }
}

/** 首页推荐（登录=协同过滤，未登录=热销） */
async function getHomeRecommendations(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 24)
    const userId = req.user?.id
    const data = await recommendationService.getHomeRecommendations(userId, limit)
    res.json({ success: true, data })
  } catch (error) {
    console.error('获取首页推荐失败:', error)
    res.status(500).json({ success: false, message: '获取推荐失败' })
  }
}

module.exports = { getAlsoBought, getForYou, getHomeRecommendations }
