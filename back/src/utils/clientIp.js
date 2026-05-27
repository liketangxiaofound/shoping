/**
 * 从请求中解析客户端 IP（支持反向代理）
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim()
    if (first) return first
  }
  const realIp = req.headers['x-real-ip']
  if (realIp) return String(realIp).trim()
  return req.ip || req.socket?.remoteAddress || null
}

module.exports = { getClientIp }
