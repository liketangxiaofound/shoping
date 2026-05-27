const antiCrawler = require('../services/antiCrawlerService')

/**
 * 反爬虫中间件：对商品/推荐等读接口做侦测与限流
 */
async function antiCrawlerMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next()
  }

  try {
    const result = await antiCrawler.inspectRequest(req)
    if (result.allow) {
      return next()
    }

    return res.status(result.status || 429).json({
      success: false,
      code: result.code,
      needVerify: !!result.needVerify,
      message: result.message
    })
  } catch (err) {
    console.error('反爬虫中间件错误:', err)
    return next()
  }
}

module.exports = antiCrawlerMiddleware
