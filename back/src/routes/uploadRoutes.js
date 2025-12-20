// routes/uploadRoutes.js
const express = require('express')
const multer = require('multer')
const router = express.Router()
const uploadController = require('../controllers/uploadController')

// 配置multer（内存存储）
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 10 // 最多10个文件
  },
  fileFilter: (req, file, cb) => {
    // 验证文件类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'), false)
    }
  }
})

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小不能超过5MB'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '上传文件数量超过限制'
      })
    }
  }
  next(error)
}

// 路由定义
router.get('/config', uploadController.getUploadConfig)
router.post('/image', upload.single('image'), handleUploadError, uploadController.uploadImage)
router.post('/images', upload.array('images', 10), handleUploadError, uploadController.uploadMultiple)
router.post('/product', upload.single('image'), handleUploadError, uploadController.uploadProductImage)
router.delete('/image', uploadController.deleteImage)

module.exports = router