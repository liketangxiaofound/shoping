// controllers/adminProductController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../utils/redis'); // 导入Redis客户端
const { toStoredImages } = require('../utils/productImages');

/**
 * 清除商品相关缓存
 */
const clearProductCache = async (productId) => {
  try {
    const cacheKey = `product:${productId}`;
    await redisClient.del(cacheKey);
    console.log(`🗑️ 清除商品 ${productId} 的缓存`);
    
    // 可选：清除商品列表相关缓存
    await clearProductListCaches();
    
    return true;
  } catch (error) {
    console.error('清除缓存失败:', error);
    return false;
  }
};

/**
 * 清除商品列表缓存（批量清除）
 */
const clearProductListCaches = async () => {
  try {
    // 查找所有商品列表相关的缓存键
    const pattern = 'products:page:*';
    const keys = await redisClient.keys(pattern);
    
    if (keys && keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️ 清除 ${keys.length} 个商品列表缓存`);
    }
  } catch (error) {
    console.warn('清除商品列表缓存失败:', error.message);
  }
};

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, keyword, category, status } = req.query
    const skip = (page - 1) * limit
    
    const where = {}
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } }
      ]
    }
    if (category) {
      where.category = category
    }
    if (status) {
      where.status = status
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          // 可以包含关联数据，比如分类信息等
        }
      }),
      prisma.product.count({ where })
    ])

    res.json({
      success: true,
      data: {
        products,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取商品列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    })
  }
}

// 创建商品
const createProduct = async (req, res) => {
  try {
    const { name, price, stock, description, category, imageUrl } = req.body

    // 验证必填字段
    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: '商品名称、价格和库存为必填项'
      })
    }

    const mainImage = imageUrl ? String(imageUrl).trim() : ''
    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stock: parseInt(stock),
        description: description || '',
        category: category || '',
        image: mainImage,
        images: toStoredImages(mainImage),
        categoryId: req.body.categoryId || null,
        sellerId: req.body.sellerId || null,
        status: 'active'
      }
    })

    await clearProductCache(product.id)

    res.json({
      success: true,
      message: '商品创建成功',
      data: { product }
    })
  } catch (error) {
    console.error('创建商品错误:', error)
    res.status(500).json({
      success: false,
      message: '创建商品失败'
    })
  }
}

// 更新商品
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, price, stock, description, category, imageUrl, status } = req.body

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      })
    }

    const updateData = {
      ...(name && { name }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(req.body.categoryId !== undefined && { categoryId: req.body.categoryId || null }),
      ...(status && { status })
    }
    if (imageUrl !== undefined) {
      const mainImage = imageUrl ? String(imageUrl).trim() : ''
      updateData.image = mainImage
      updateData.images = toStoredImages(mainImage)
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    await clearProductCache(parseInt(id));

    res.json({
      success: true,
      message: '商品更新成功',
      data: { product: updatedProduct }
    })
  } catch (error) {
    console.error('更新商品错误:', error)
    res.status(500).json({
      success: false,
      message: '更新商品失败'
    })
  }
}

// 删除商品
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      })
    }

    // 检查商品是否有关联的订单
    const orderItems = await prisma.orderItem.findMany({
      where: { productId: parseInt(id) },
      take: 1
    })

    if (orderItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该商品已有订单记录，无法删除'
      })
    }

    await prisma.product.delete({
      where: { id: parseInt(id) }
    })

    await clearProductCache(parseInt(id));
    
    res.json({
      success: true,
      message: '商品删除成功'
    })
  } catch (error) {
    console.error('删除商品错误:', error)
    res.status(500).json({
      success: false,
      message: '删除商品失败'
    })
  }
}

// 更新商品状态
const updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

     if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '状态值无效'
      })
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) }
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '商品不存在'
      })
    }

    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { status }
    })

     await clearProductCache(parseInt(id));

    res.json({
      success: true,
      message: `商品已${status === 'active' ? '上架' : '下架'}`,
      data: { product: updatedProduct }
    })
  } catch (error) {
    console.error('更新商品状态错误:', error)
    res.status(500).json({
      success: false,
      message: '更新商品状态失败'
    })
  }
}
// 获取单个商品详情
const getProductDetail = async (req, res) => {
  try {
    const productId = parseInt(req.params.id)
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return res.status(404).json({ success: false, message: '商品不存在' })
    }
    res.json({ success: true, data: { product } })
  } catch (error) {
    console.error('获取商品详情失败:', error)
    res.status(500).json({ success: false, message: '获取商品详情失败' })
  }
}

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStatus,
  getProductDetail
}