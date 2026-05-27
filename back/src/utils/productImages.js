/**
 * 免费图库（Unsplash）按分类提供的商品图集
 * 仅使用经 HEAD 校验可访问的 photo ID
 * 许可说明：https://unsplash.com/license
 */
const CATEGORY_GALLERY = {
  手机: [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
    'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&q=80',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&fit=crop&crop=entropy'
  ],
  电脑: [
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
    'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80'
  ],
  耳机: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80',
    'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&fit=crop'
  ],
  平板: [
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80',
    'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&fit=crop',
    'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&fit=crop'
  ],
  配件: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&fit=crop',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&fit=crop'
  ],
  家电: [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&fit=crop'
  ],
  美妆: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80',
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80'
  ]
}

/** 列表/详情图加载失败时的兜底图（已校验 200） */
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'

const DEFAULT_GALLERY = CATEGORY_GALLERY['手机']

function getGalleryForProduct(product) {
  const pool = CATEGORY_GALLERY[product?.category] || DEFAULT_GALLERY
  const offset = (product?.id || 0) % pool.length
  const images = []
  for (let i = 0; i < 4; i++) {
    images.push(pool[(offset + i) % pool.length])
  }
  return images
}

/** 卖家/管理员上传单图时写入 images 字段 */
function toStoredImages(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return []
  const url = imageUrl.trim()
  return url ? [url] : []
}

function normalizeImages(product) {
  const main =
    product?.image && typeof product.image === 'string' ? product.image.trim() : ''
  const raw = product?.images
  let list = []
  if (Array.isArray(raw) && raw.length > 0) {
    list = [...new Set(raw.filter((u) => typeof u === 'string' && u.trim()))]
  }

  // 主图与图集首图不一致：多为只更新了 image、images 仍是旧图集 → 以主图为准
  if (main && list.length > 0 && list[0] !== main && !list.includes(main)) {
    return [main]
  }

  if (list.length > 0) return list

  if (main) return [main]

  return getGalleryForProduct({ id: product?.id || 0, category: product?.category || '手机' })
}

function getMainImage(product) {
  if (product?.image && String(product.image).trim()) {
    return String(product.image).trim()
  }
  const gallery = normalizeImages(product)
  return gallery[0] || FALLBACK_IMAGE
}

module.exports = {
  CATEGORY_GALLERY,
  FALLBACK_IMAGE,
  getGalleryForProduct,
  toStoredImages,
  normalizeImages,
  getMainImage
}
