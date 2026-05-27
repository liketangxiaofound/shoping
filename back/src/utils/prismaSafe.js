/**
 * Prisma 安全查询（表未迁移时避免 500）
 */
const prisma = require('./prisma')

function isMissingTableError(err) {
  return err?.code === 'P2021' || /does not exist/i.test(err?.message || '')
}

async function safeCrawlerCount(where = {}) {
  try {
    if (!prisma.crawlerEvent) return 0
    return await prisma.crawlerEvent.count({ where })
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn('[prismaSafe] CrawlerEvent 表不存在，请执行: npx prisma migrate deploy')
      return 0
    }
    throw err
  }
}

module.exports = { isMissingTableError, safeCrawlerCount }
