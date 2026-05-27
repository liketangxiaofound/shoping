const dataCollection = require('../services/dataCollectionService')
const userProfileService = require('../services/userProfileService')

/**
 * POST /api/analytics/browse
 * body: { productId, category, dwellSeconds }
 */
async function trackBrowse(req, res) {
  try {
    const { productId, category, dwellSeconds } = req.body
    if (!productId) {
      return res.status(400).json({ success: false, message: '缺少商品 ID' })
    }
    await dataCollection.recordBrowse(req, {
      userId: req.user.id,
      productId: parseInt(productId, 10),
      category,
      dwellSeconds
    })
    res.json({ success: true, message: '浏览行为已记录' })
  } catch (error) {
    console.error('记录浏览行为失败:', error)
    res.status(500).json({ success: false, message: '记录浏览行为失败' })
  }
}

/** GET /api/analytics/profile — 当前登录用户的个人画像 */
async function getMyProfile(req, res) {
  try {
    const profile = await userProfileService.buildUserProfile(req.user.id)
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }
    res.json({ success: true, data: profile })
  } catch (error) {
    console.error('获取个人画像失败:', error)
    res.status(500).json({ success: false, message: '获取个人画像失败' })
  }
}

module.exports = { trackBrowse, getMyProfile }
