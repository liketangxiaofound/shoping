require('dotenv').config()
const https = require('https')
const { PrismaClient } = require('@prisma/client')
const { CATEGORY_GALLERY } = require('../src/utils/productImages')

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      resolve({ url, status: res.statusCode })
    })
    req.on('error', (e) => resolve({ url, status: 'ERR', err: e.message }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ url, status: 'TIMEOUT' })
    })
    req.end()
  })
}

async function main() {
  const all = new Set()
  Object.values(CATEGORY_GALLERY).flat().forEach((u) => all.add(u))

  console.log('--- Gallery URLs ---')
  for (const url of all) {
    const r = await head(url)
    const bad = r.status !== 200 && r.status !== 301 && r.status !== 302
    if (bad) console.log('BAD', r.status, url)
  }
  console.log('done gallery check')

  const prisma = new PrismaClient()
  const products = await prisma.product.findMany({
    select: { id: true, name: true, image: true }
  })
  console.log('\n--- Product main images ---')
  for (const p of products) {
    const r = await head(p.image)
    const bad = r.status !== 200 && r.status !== 301 && r.status !== 302
    if (bad) console.log('BAD', p.id, p.name, r.status, p.image)
  }
  await prisma.$disconnect()
}

main().catch(console.error)
