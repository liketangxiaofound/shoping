/**
 * 为 seed 商品生成封面图并上传到阿里云 OSS，输出 URL 映射（JSON）
 * 用法: node scripts/generate-and-upload-product-images.js
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const OSSService = require('../src/utils/ossService')

const PRODUCT_TEMPLATES = [
  { name: 'iPhone 15', category: '手机', price: 5999, stock: 80 },
  { name: '华为 Mate 60', category: '手机', price: 5499, stock: 70 },
  { name: '小米 14', category: '手机', price: 3999, stock: 90 },
  { name: '三星 Galaxy S24', category: '手机', price: 5199, stock: 75 },
  { name: 'MacBook Pro 14', category: '电脑', price: 12999, stock: 40 },
  { name: 'MacBook Air', category: '电脑', price: 8999, stock: 55 },
  { name: 'ROG 游戏本', category: '电脑', price: 9999, stock: 25 },
  { name: 'AirPods Pro 2', category: '耳机', price: 1899, stock: 150 },
  { name: 'Sony WH-1000XM5', category: '耳机', price: 2499, stock: 80 },
  { name: 'Bose QC45', category: '耳机', price: 2299, stock: 70 },
  { name: 'iPad Pro 12.9', category: '平板', price: 8999, stock: 50 },
  { name: '华为 MatePad', category: '平板', price: 3299, stock: 55 },
  { name: 'Apple Watch Ultra', category: '配件', price: 6299, stock: 40 },
  { name: '戴森吹风机', category: '家电', price: 2990, stock: 30 },
  { name: '兰蔻小黑瓶', category: '美妆', price: 1080, stock: 60 }
]

const CATEGORY_STYLE = {
  手机: { c1: '#5b6ee1', c2: '#7c3aed', emoji: '📱' },
  电脑: { c1: '#0ea5e9', c2: '#0369a1', emoji: '💻' },
  耳机: { c1: '#10b981', c2: '#047857', emoji: '🎧' },
  平板: { c1: '#f59e0b', c2: '#d97706', emoji: '📲' },
  配件: { c1: '#ec4899', c2: '#be185d', emoji: '⌚' },
  家电: { c1: '#6366f1', c2: '#4338ca', emoji: '🏠' },
  美妆: { c1: '#f472b6', c2: '#db2777', emoji: '✨' }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function generateProductImage(name, category) {
  const style = CATEGORY_STYLE[category] || { c1: '#64748b', c2: '#334155', emoji: '🛍️' }
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.c1}"/>
      <stop offset="100%" stop-color="${style.c2}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="400" cy="280" r="120" fill="rgba(255,255,255,0.12)"/>
  <text x="400" y="310" font-size="96" text-anchor="middle">${style.emoji}</text>
  <rect x="60" y="380" width="680" height="320" rx="28" fill="rgba(255,255,255,0.18)" filter="url(#shadow)"/>
  <text x="400" y="500" font-family="Microsoft YaHei, PingFang SC, Noto Sans SC, Arial, sans-serif"
    font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle">${escapeXml(name)}</text>
  <text x="400" y="560" font-family="Microsoft YaHei, PingFang SC, Arial, sans-serif"
    font-size="26" fill="rgba(255,255,255,0.92)" text-anchor="middle">${escapeXml(category)} · 精选好物</text>
  <text x="400" y="740" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.65)" text-anchor="middle">Shopping Mall</text>
</svg>`

  return sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer()
}

function slug(name) {
  return name.replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
}

async function main() {
  const required = ['OSS_REGION', 'OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET', 'OSS_BUCKET']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length) {
    console.error('缺少 OSS 环境变量:', missing.join(', '))
    process.exit(1)
  }

  const test = await OSSService.testConnection()
  if (!test.success) {
    console.error('OSS 连接失败:', test.error)
    process.exit(1)
  }
  console.log('OSS 连接正常，开始生成并上传', PRODUCT_TEMPLATES.length, '张图片...\n')

  const results = []

  for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
    const tpl = PRODUCT_TEMPLATES[i]
    const buffer = await generateProductImage(tpl.name, tpl.category)
    const filename = OSSService.generateFileName(`${slug(tpl.name)}.webp`, 'seed-products')

    const upload = await OSSService.uploadFile(buffer, filename)
    if (!upload.success) {
      console.error(`上传失败 [${tpl.name}]:`, upload.error)
      process.exit(1)
    }

    results.push({ ...tpl, image: upload.url })
    console.log(`[${i + 1}/${PRODUCT_TEMPLATES.length}] ${tpl.name} -> ${upload.url}`)
    await new Promise((r) => setTimeout(r, 300))
  }

  const outPath = path.join(__dirname, 'seed-product-images.json')
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
  console.log('\n已写入:', outPath)
  return results
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
