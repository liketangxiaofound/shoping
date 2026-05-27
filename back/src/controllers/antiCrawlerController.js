const antiCrawler = require('../services/antiCrawlerService')

async function getChallenge(req, res) {
  try {
    const ip = antiCrawler.getClientIp(req) || 'unknown'
    const data = await antiCrawler.createChallenge(ip)
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

async function verify(req, res) {
  try {
    const ip = antiCrawler.getClientIp(req) || 'unknown'
    const { challengeId, answer } = req.body
    if (!challengeId || answer === undefined) {
      return res.status(400).json({ success: false, message: '缺少验证参数' })
    }
    const result = await antiCrawler.verifyChallenge(challengeId, answer, ip)
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.message })
    }
    res.json({
      success: true,
      data: { token: result.token, expiresIn: result.expiresIn }
    })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

/** 蜜罐：正常前端不会调用，爬虫扫描常见路径时会命中 */
async function honeypotExport(req, res) {
  await antiCrawler.recordHoneypotHit(req)
  res.status(403).json({
    success: false,
    code: 'HONEYPOT',
    message: 'Forbidden'
  })
}

async function getStats(req, res) {
  try {
    const data = await antiCrawler.getAdminStats()
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

async function getEvents(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
    const data = await antiCrawler.listEvents({
      page,
      limit,
      reason: req.query.reason,
      ip: req.query.ip
    })
    res.json({ success: true, data })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

async function unban(req, res) {
  try {
    const { ip } = req.params
    if (!ip) return res.status(400).json({ success: false, message: '缺少 IP' })
    await antiCrawler.unbanIp(ip)
    res.json({ success: true, message: `已解除 ${ip} 的封禁` })
  } catch (e) {
    res.status(500).json({ success: false, message: e.message })
  }
}

module.exports = {
  getChallenge,
  verify,
  honeypotExport,
  getStats,
  getEvents,
  unban
}
