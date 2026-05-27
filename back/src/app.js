// src/app.js
const express = require('express')
const cors = require('cors')
require('dotenv').config()

// 导入路由
const userRoutes = require('./routes/userRoutes')
const productRoutes=require('./routes/productRoutes')
const uploadRoutes=require('./routes/uploadRoutes')
const cartRoutes=require('./routes/cartRoutes')
const authRoutes=require('./routes/authRoutes')
const orderRoutes=require('./routes/orderRoutes')
const adminRoutes=require('./routes/admin')
const sellerRoutes=require('./routes/seller')
const analyticsRoutes=require('./routes/analytics')
const recommendationRoutes=require('./routes/recommendation')
const antiCrawlerRoutes=require('./routes/antiCrawler')
const antiCrawlerMiddleware=require('./middleware/antiCrawler')
// 初始化OSS服务
const OSSService = require('./utils/ossService')

const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json({ limit: '10mb'}))
app.use(express.urlencoded({ extended: true }))

// 3.4 反爬虫（商品/推荐读接口）
app.use(antiCrawlerMiddleware)

// 基础路由
app.get('/', (req, res) => {
  res.redirect('http://localhost:3001/login')
})

app.get('/health', async (req, res) => {
  try {
    const prisma = require('./utils/prisma')
    await prisma.$queryRaw`SELECT 1`
    
    res.json({ 
      status: 'OK', 
      message: '服务器和数据库连接正常'
    })
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: '数据库连接失败'
    })
  }
})

// ✅ 正确：使用 app.use() 挂载路由

app.use('/api/auth', authRoutes)
app.use('/api/products',productRoutes)
app.use('/api/upload',uploadRoutes)
app.use('/api/carts',cartRoutes)
app.use('/api/orders',orderRoutes)
app.use('/api/admin',adminRoutes)
app.use('/api/seller', sellerRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/recommendations', recommendationRoutes)
app.use('/api/anti-crawler', antiCrawlerRoutes)


// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: '接口不存在',
    path: req.originalUrl
  })
})

//oss test
app.get('/api/oss/test', async (req, res) => {
  try {
    const result = await OSSService.testConnection()
    res.json(result)
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OSS测试失败: ' + error.message
    })
  }
})

// 错误处理
app.use((error, req, res, next) => {
  console.error('服务器错误:', error)
  res.status(500).json({ 
    success: false,
    error: '服务器内部错误'
  })
})

app.listen(PORT, async () => {
  console.log(`
    🚀 服务器启动成功
    📍 地址: http://localhost:${PORT}
    🖼️  图片服务: ${process.env.IMAGE_PROVIDER}
    ☁️  OSS状态: ${OSSService.client ? '✅ 已连接' : '❌ 未连接'}

    可用接口:
    POST /api/upload/image           - 上传单张图片
    POST /api/upload/images          - 批量上传图片  
    POST /api/upload/product         - 上传商品图片
    DELETE /api/upload/image         - 删除图片
    GET  /api/oss/test              - OSS连接测试
    
  `)

  
  // 启动时测试OSS连接
  if (OSSService.client) {
    const testResult = await OSSService.testConnection()
    console.log('🔗 OSS连接测试:', testResult.success ? '✅ 成功' : '❌ 失败')
  }
})
module.exports = app