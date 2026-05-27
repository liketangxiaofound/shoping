/**
 * 演示反爬虫：模拟可疑 UA 与高频请求
 * 用法: node scripts/test-anti-crawler.js
 */
require('dotenv').config()

const BASE = process.env.API_BASE || 'http://localhost:3000'

async function hit(path, headers = {}) {
  const url = `${BASE}${path}`
  const res = await fetch(url, { headers })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

async function main() {
  console.log('1) 蜜罐接口（应 403 并记录 honeypot）')
  const h1 = await hit('/api/products/export-all-secret', {
    'User-Agent': 'python-requests/2.31'
  })
  console.log(h1.status, h1.body?.code, h1.body?.message)

  console.log('\n2) 可疑 UA 访问商品列表（应 429 + needVerify）')
  const h2 = await hit('/api/products?page=1&limit=5', {
    'User-Agent': 'python-requests/2.31'
  })
  console.log(h2.status, h2.body?.code, h2.body?.needVerify)

  console.log('\n3) 正常浏览器 UA（应 200）')
  const h3 = await hit('/api/products?page=1&limit=5', {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
  })
  console.log(h3.status, h3.body?.success !== false ? 'OK' : h3.body)

  console.log('\n完成。请在管理后台「反爬虫监控」查看事件。')
}

main().catch(console.error)
