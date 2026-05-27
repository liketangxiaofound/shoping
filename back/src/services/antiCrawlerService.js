/**
 * 3.4 反爬虫：侦测（频率、UA、蜜罐）与应对（限流、验证、封禁）
 */
const crypto = require('crypto')
const prisma = require('../utils/prisma')
const redisClient = require('../utils/redis')
const { getClientIp } = require('../utils/clientIp')
const { isMissingTableError, safeCrawlerCount } = require('../utils/prismaSafe')

const memoryStore = new Map()

const CONFIG = {
  windowMs: Number(process.env.CRAWLER_WINDOW_MS) || 60_000,
  maxRequests: Number(process.env.CRAWLER_MAX_REQUESTS) || 35,
  maxRequestsAuthed: Number(process.env.CRAWLER_MAX_REQUESTS_AUTH) || 80,
  burstWindowMs: Number(process.env.CRAWLER_BURST_MS) || 10_000,
  burstMax: Number(process.env.CRAWLER_BURST_MAX) || 12,
  banDurationSec: Number(process.env.CRAWLER_BAN_SEC) || 900,
  tokenTtlSec: Number(process.env.CRAWLER_TOKEN_TTL_SEC) || 3600,
  challengeTtlSec: 300,
  violationsBeforeBan: 3
}

const PROTECTED_PREFIXES = ['/api/products', '/api/recommendations']

const SUSPICIOUS_UA = [
  /python-requests/i,
  /python\/\d/i,
  /scrapy/i,
  /\bcurl\//i,
  /\bwget\//i,
  /httpclient/i,
  /java\/[\d.]+.*http/i,
  /go-http-client/i,
  /apachebench/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i
]

const BOT_UA = [/bot/i, /spider/i, /crawler/i, /slurp/i]

function isRedisReady() {
  return redisClient.isOpen === true
}

async function memGet(key) {
  const item = memoryStore.get(key)
  if (!item) return null
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return item.value
}

async function memSet(key, value, ttlSec) {
  memoryStore.set(key, {
    value,
    expiresAt: ttlSec ? Date.now() + ttlSec * 1000 : null
  })
}

async function storeGet(key) {
  if (isRedisReady()) {
    try {
      return await redisClient.get(key)
    } catch {
      /* fall through */
    }
  }
  return memGet(key)
}

async function storeSet(key, value, ttlSec) {
  if (isRedisReady()) {
    try {
      if (ttlSec) await redisClient.setEx(key, ttlSec, value)
      else await redisClient.set(key, value)
      return
    } catch {
      /* fall through */
    }
  }
  await memSet(key, value, ttlSec)
}

async function storeIncr(key, ttlSec) {
  if (isRedisReady()) {
    try {
      const n = await redisClient.incr(key)
      if (n === 1 && ttlSec) await redisClient.expire(key, ttlSec)
      return n
    } catch {
      /* fall through */
    }
  }
  const cur = Number((await memGet(key)) || 0) + 1
  await memSet(key, String(cur), ttlSec)
  return cur
}

function isProtectedPath(path) {
  return PROTECTED_PREFIXES.some((p) => path.startsWith(p))
}

function parseUserIdFromAuth(req) {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    const jwt = require('../utils/jwt')
    const payload = jwt.verifyToken(auth.slice(7))
    return payload?.userId ?? payload?.id ?? null
  } catch {
    return null
  }
}

function isSuspiciousUserAgent(ua) {
  if (!ua || ua.length < 10) return { suspicious: true, reason: 'suspicious_ua', detail: 'empty_or_short_ua' }
  if (SUSPICIOUS_UA.some((r) => r.test(ua))) {
    return { suspicious: true, reason: 'suspicious_ua', detail: 'known_scraper_client' }
  }
  if (BOT_UA.some((r) => r.test(ua)) && !/googlebot|bingbot/i.test(ua)) {
    return { suspicious: true, reason: 'suspicious_ua', detail: 'bot_keyword_in_ua' }
  }
  return { suspicious: false }
}

async function logEvent({ ip, ua, path, method, reason, action, score = 1, userId, detail }) {
  try {
    if (!prisma.crawlerEvent) return
    await prisma.crawlerEvent.create({
      data: {
        ipAddress: ip,
        userAgent: ua?.slice(0, 500) || null,
        path: path?.slice(0, 300) || null,
        method: method || null,
        reason,
        action,
        score,
        userId: userId || null,
        detail: detail?.slice(0, 500) || null
      }
    })
  } catch (e) {
    if (!isMissingTableError(e)) {
      console.error('记录爬虫事件失败:', e.message)
    }
  }
}

async function isBanned(ip) {
  const v = await storeGet(`crawler:ban:${ip}`)
  return !!v
}

async function addViolation(ip) {
  const key = `crawler:violations:${ip}`
  const n = await storeIncr(key, 600)
  if (n >= CONFIG.violationsBeforeBan) {
    await storeSet(`crawler:ban:${ip}`, '1', CONFIG.banDurationSec)
    await storeSet(key, '0', 1)
    return true
  }
  return false
}

async function checkRateLimit(ip, isAuthed) {
  const windowSec = Math.ceil(CONFIG.windowMs / 1000)
  const key = `crawler:rate:${ip}`
  const count = await storeIncr(key, windowSec)
  const limit = isAuthed ? CONFIG.maxRequestsAuthed : CONFIG.maxRequests
  return { exceeded: count > limit, count, limit }
}

async function checkBurst(ip) {
  const key = `crawler:burst:${ip}`
  const count = await storeIncr(key, Math.ceil(CONFIG.burstWindowMs / 1000))
  return count > CONFIG.burstMax
}

function hashToken(ip, secret) {
  return crypto.createHmac('sha256', secret).update(ip).digest('hex')
}

async function createChallenge(ip) {
  const a = Math.floor(Math.random() * 15) + 1
  const b = Math.floor(Math.random() * 15) + 1
  const challengeId = crypto.randomBytes(16).toString('hex')
  const answer = String(a + b)
  await storeSet(
    `crawler:challenge:${challengeId}`,
    JSON.stringify({ answer, ip }),
    CONFIG.challengeTtlSec
  )
  return { challengeId, question: `${a} + ${b} = ?`, expiresIn: CONFIG.challengeTtlSec }
}

async function verifyChallenge(challengeId, answer, ip) {
  const raw = await storeGet(`crawler:challenge:${challengeId}`)
  if (!raw) return { success: false, message: '验证已过期，请重新获取' }
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return { success: false, message: '验证无效' }
  }
  if (data.ip !== ip) return { success: false, message: 'IP 不匹配' }
  if (String(answer).trim() !== String(data.answer)) {
    return { success: false, message: '答案错误' }
  }
  const secret = process.env.CRAWLER_TOKEN_SECRET || 'shopping-crawler-secret'
  const token = hashToken(ip, secret)
  await storeSet(`crawler:token:${ip}`, token, CONFIG.tokenTtlSec)
  return { success: true, token, expiresIn: CONFIG.tokenTtlSec }
}

async function isValidCrawlerToken(ip, token) {
  if (!token) return false
  const stored = await storeGet(`crawler:token:${ip}`)
  return stored && stored === token
}

async function inspectRequest(req) {
  const ip = getClientIp(req) || 'unknown'
  const path = req.originalUrl || req.path
  const method = req.method
  const ua = req.headers['user-agent'] || ''
  const userId = parseUserIdFromAuth(req)
  const isAuthed = !!userId

  if (!isProtectedPath(path)) {
    return { allow: true }
  }

  if (await isBanned(ip)) {
    await logEvent({
      ip,
      ua,
      path,
      method,
      reason: 'banned',
      action: 'block',
      userId,
      detail: 'ip_still_banned'
    })
    return {
      allow: false,
      status: 403,
      code: 'IP_BANNED',
      message: '访问过于频繁，IP 已被临时封禁，请稍后再试'
    }
  }

  const crawlerToken = req.headers['x-crawler-token']
  if (await isValidCrawlerToken(ip, crawlerToken)) {
    return { allow: true }
  }

  const uaCheck = isSuspiciousUserAgent(ua)
  if (uaCheck.suspicious) {
    const banned = await addViolation(ip)
    await logEvent({
      ip,
      ua,
      path,
      method,
      reason: uaCheck.reason,
      action: banned ? 'block' : 'captcha',
      score: 3,
      userId,
      detail: uaCheck.detail
    })
    return {
      allow: false,
      status: 429,
      code: 'CRAWLER_DETECTED',
      needVerify: true,
      message: '检测到异常访问客户端，请完成人机验证'
    }
  }

  const burst = await checkBurst(ip)
  if (burst) {
    const banned = await addViolation(ip)
    await logEvent({
      ip,
      ua,
      path,
      method,
      reason: 'burst',
      action: banned ? 'block' : 'captcha',
      score: 2,
      userId,
      detail: `burst>${CONFIG.burstMax}/${CONFIG.burstWindowMs}ms`
    })
    return {
      allow: false,
      status: 429,
      code: 'CRAWLER_DETECTED',
      needVerify: !banned,
      message: banned
        ? '请求过于密集，IP 已被临时封禁'
        : '请求过于密集，请完成人机验证后继续'
    }
  }

  const rate = await checkRateLimit(ip, isAuthed)
  if (rate.exceeded) {
    const banned = await addViolation(ip)
    await logEvent({
      ip,
      ua,
      path,
      method,
      reason: 'rate_limit',
      action: banned ? 'block' : 'captcha',
      score: 1,
      userId,
      detail: `count=${rate.count},limit=${rate.limit}`
    })
    return {
      allow: false,
      status: 429,
      code: 'CRAWLER_DETECTED',
      needVerify: !banned,
      message: banned
        ? '超过访问频率限制，IP 已被临时封禁'
        : `访问过于频繁（${rate.count}/${rate.limit} 次/分钟），请完成人机验证`
    }
  }

  return { allow: true }
}

async function recordHoneypotHit(req) {
  const ip = getClientIp(req) || 'unknown'
  const ua = req.headers['user-agent'] || ''
  await addViolation(ip)
  await addViolation(ip)
  await logEvent({
    ip,
    ua,
    path: req.originalUrl,
    method: req.method,
    reason: 'honeypot',
    action: 'block',
    score: 5,
    detail: 'honeypot_endpoint_accessed'
  })
  await storeSet(`crawler:ban:${ip}`, '1', CONFIG.banDurationSec)
}

async function getAdminStats() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  if (!prisma.crawlerEvent) {
    return emptyAdminStats()
  }

  let total24h = 0
  let byReason = []
  let recent = []
  let topIps = []
  try {
    ;[total24h, byReason, recent, topIps] = await Promise.all([
      safeCrawlerCount({ createdAt: { gte: since24h } }),
      prisma.crawlerEvent.groupBy({
        by: ['reason'],
        where: { createdAt: { gte: since24h } },
        _count: { id: true }
      }),
      prisma.crawlerEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      prisma.crawlerEvent.groupBy({
        by: ['ipAddress'],
        where: { createdAt: { gte: since24h } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      })
    ])
  } catch (err) {
    if (isMissingTableError(err)) {
      return emptyAdminStats()
    }
    throw err
  }

  return {
    config: CONFIG,
    last24h: {
      total: total24h,
      byReason: byReason.map((r) => ({ reason: r.reason, count: r._count.id })),
      topIps: topIps.map((r) => ({ ip: r.ipAddress, count: r._count.id }))
    },
    recent
  }
}

function emptyAdminStats() {
  return {
    config: CONFIG,
    last24h: { total: 0, byReason: [], topIps: [] },
    recent: []
  }
}

async function listEvents({ page = 1, limit = 20, reason, ip }) {
  if (!prisma.crawlerEvent) {
    return { items: [], total: 0, page, limit }
  }
  const where = {}
  if (reason) where.reason = reason
  if (ip) where.ipAddress = { contains: ip }
  const skip = (page - 1) * limit
  try {
    const [items, total] = await Promise.all([
      prisma.crawlerEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.crawlerEvent.count({ where })
    ])
    return { items, total, page, limit }
  } catch (err) {
    if (isMissingTableError(err)) {
      return { items: [], total: 0, page, limit }
    }
    throw err
  }
}

async function unbanIp(ip) {
  if (isRedisReady()) {
    try {
      await redisClient.del(`crawler:ban:${ip}`)
      await redisClient.del(`crawler:violations:${ip}`)
      await redisClient.del(`crawler:rate:${ip}`)
      await redisClient.del(`crawler:burst:${ip}`)
    } catch {
      /* ignore */
    }
  }
  for (const key of memoryStore.keys()) {
    if (key.includes(ip)) memoryStore.delete(key)
  }
  return { success: true }
}

module.exports = {
  CONFIG,
  isProtectedPath,
  inspectRequest,
  createChallenge,
  verifyChallenge,
  recordHoneypotHit,
  getAdminStats,
  listEvents,
  unbanIp,
  getClientIp
}
