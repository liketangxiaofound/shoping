// controllers/productController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const redisClient = require('../utils/redis');
/**
 * 获取商品列表
 * 根据你的Prisma模型，每个商品只有一个image字段，没有status字段
 */
const getProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      search, 
      category, 
      minPrice, 
      maxPrice,
      sortBy = 'createdAt_desc'
    } = req.query;

    // 构建查询条件 - 移除status字段
    const where = {};
    
    // 搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // 分类筛选
    if (category && category !== 'all') {
      where.category = category;
    }
    
    // 价格区间筛选
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // 构建排序
    const [sortField, sortOrder] = sortBy.split('_');
    const orderBy = { [sortField]: sortOrder };

    // 执行查询
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy,
        select: {
          id: true,
          name: true,
          price: true,
          image: true,        // 直接使用image字段
          category: true,
          stock: true,
          description: true,
          createdAt: true
          // 注意：没有status字段
        }
      }),
      prisma.product.count({ where })
    ]);

    // 处理图片URL，确保每个商品都有有效的图片
    const productsWithImages = products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
      description: product.description,
      createdAt: product.createdAt,
      // 使用image字段，如果为空则使用占位图
      imageUrl: product.image || generatePlaceholderImage(product.name, product.id)
    }));

    res.json({
      success: true,
      data: {
        products: productsWithImages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败，请稍后重试'
    });
  }
};

/**
 * 获取单个商品详情
 */
const getProductById = async (req, res) => {
  try {
    // console.log(req.params.id);
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {   
      return res.status(400).json({
        success: false,
        message: '商品ID格式错误'
      });
    }


    const cacheKey = `product:${productId}`;
    try {
      const cachedProduct = await redisClient.get(cacheKey);
      
      if (cachedProduct) {
        console.log('✅ 从 Redis 缓存获取商品:', productId);
        const product = JSON.parse(cachedProduct);
        
        const formattedProduct = {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          stock: product.stock,
          description: product.description,
          createdAt: product.createdAt,
          imageUrl: product.image || generatePlaceholderImage(product.name, product.id)
        };

        return res.json({
          success: true,
          data: formattedProduct,
          source: 'cache',  // 标记数据来源
          cacheHit: true
        });
      }
    } catch (redisError) {
      console.warn('⚠️ Redis 缓存读取失败，继续查询数据库:', redisError.message);
    }

    const product = await prisma.product.findUnique({
      where: { 
        id: productId
      }
    });

    if (!product) {
      try {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(null));
      } catch (cacheError) {
        console.warn('无法缓存空结果:', cacheError.message);
      }

      return res.status(404).json({
        success: false,
        message: '商品不存在'
      });
    }

    try {
      // 缓存 1 小时（3600 秒）
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(product));
      console.log('💾 商品已存入 Redis 缓存:', productId);
    } catch (cacheError) {
      console.warn('❌ 商品存入缓存失败:', cacheError.message);
    }

    // 格式化商品数据
    const formattedProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      stock: product.stock,
      description: product.description,
      createdAt: product.createdAt,
      // 注意：模型中没有updatedAt字段
      // 使用单图字段
      imageUrl: product.image || generatePlaceholderImage(product.name, product.id)
    };

    res.json({
      success: true,
      data: formattedProduct
    });
    

  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取商品详情失败'
    });
  }
};

/**
 * 获取商品分类列表
 */
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      where: {
        category: {
          not: null
        }
        // 移除status条件
      },
      select: {
        category: true
      },
      orderBy: {
        category: 'asc'
      }
    });

    // 提取分类名称
    const categoryList = categories
      .map(item => item.category)
      .filter(Boolean);

    res.json({
      success: true,
      data: categoryList
    });

  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取分类列表失败'
    });
  }
};

/**
 * 搜索商品
 */
const searchProducts = async (req, res) => {
  try {
    const { q: query, limit = 10, page = 1 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '请输入搜索关键词'
      });
    }

    const products = await prisma.product.findMany({
      where: {
        // 移除status条件
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        price: true,
        image: true,
        category: true
      },
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit)
    });

    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      imageUrl: product.image || generatePlaceholderImage(product.name, product.id)
    }));

    res.json({
      success: true,
      data: formattedProducts
    });

  } catch (error) {
    console.error('搜索商品错误:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败，请稍后重试'
    });
  }
};

/**
 * 清除商品缓存（用于商品更新时）
 */
const clearProductCache = async (productId) => {
  try {
    const cacheKey = `product:${productId}`;
    await redisClient.del(cacheKey);
    console.log('🗑️ 清除商品缓存:', productId);
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
};

/**
 * 生成占位图片URL
 */
const generatePlaceholderImage = (productName, productId) => {
  const encodedName = encodeURIComponent(productName ? productName.substring(0, 20) : '商品');
  const width = 400;
  const height = 300;
  
  return `https://via.placeholder.com/${width}x${height}/4A90E2/ffffff?text=${encodedName}`;
};

module.exports = {
  getProducts,
  getProductById,
  getCategories,
  searchProducts,
  clearProductCache
};