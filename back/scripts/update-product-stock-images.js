/**
 * 为所有商品写入 Unsplash 免费图库主图 + 4 张详情图集
 * 用法: node scripts/update-product-stock-images.js
 */
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const redisClient = require('../src/utils/redis')
const { getGalleryForProduct, getMainImage } = require('../src/utils/productImages')

const prisma = new PrismaClient()

async function main() {
  const products = await prisma.product.findMany({ select: { id: true, name: true, category: true } })
  console.log(`更新 ${products.length} 个商品的图片...`)

  for (const p of products) {
    const images = getGalleryForProduct(p)
    const image = getMainImage({ ...p, image: images[0], images })
    await prisma.product.update({
      where: { id: p.id },
      data: { image, images }
    })
    try {
      if (redisClient.isOpen) await redisClient.del(`product:${p.id}`)
    } catch (_) {
      /* redis 可选 */
    }
    console.log(`  ✓ [${p.id}] ${p.name}`)
  }

  console.log('\n完成。已清除商品 Redis 缓存，请刷新前端页面。')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
