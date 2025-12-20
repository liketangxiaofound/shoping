// controllers/uploadController.js
const uploadService = require('../services/uploadService')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

class UploadController {
  
  /**
   * 上传单张图片
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的图片'
        })
      }

      console.log('📤 接收上传请求:', {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      })

      const { prefix = 'uploads', compress = true } = req.body

      const result = await uploadService.uploadImage(req.file, {
        prefix,
        compress
      })

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        })
      }

      res.json({
        success: true,
        message: '图片上传成功',
        data: {
          url: result.url,
          filename: result.filename,
          size: result.size,
          originalSize: result.originalSize,
          compressed: result.compressed
        }
      })

    } catch (error) {
      console.error('上传控制器错误:', error)
      res.status(500).json({
        success: false,
        message: '图片上传失败: ' + error.message
      })
    }
  }

  /**
   * 批量上传图片
   */
  async uploadMultiple(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的图片'
        })
      }

      console.log(`📤 批量上传 ${req.files.length} 个文件`)

      const { prefix = 'uploads', compress = true } = req.body

      const results = await uploadService.uploadMultiple(req.files, {
        prefix,
        compress
      })

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      res.json({
        success: true,
        message: `上传完成，成功 ${successful.length} 个，失败 ${failed.length} 个`,
        data: {
          successful,
          failed
        }
      })

    } catch (error) {
      console.error('批量上传错误:', error)
      res.status(500).json({
        success: false,
        message: '批量上传失败'
      })
    }
  }

  /**
   * 上传商品图片（关联到商品）
   */
  async uploadProductImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请选择要上传的图片'
        })
      }

      const { productId } = req.body

      // 验证商品存在
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: parseInt(productId) }
        })
        if (!product) {
          return res.status(404).json({
            success: false,
            message: '商品不存在'
          })
        }
      }

      const result = await uploadService.uploadImage(req.file, {
        prefix: 'products',
        compress: true
      })

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        })
      }

      // 如果有关联商品，更新商品图片
      if (productId) {
        await prisma.product.update({
          where: { id: parseInt(productId) },
          data: { image: result.url }
        })
      }

      res.json({
        success: true,
        message: '商品图片上传成功',
        data: {
          url: result.url,
          filename: result.filename,
          productId: productId || null
        }
      })

    } catch (error) {
      console.error('商品图片上传错误:', error)
      res.status(500).json({
        success: false,
        message: '商品图片上传失败'
      })
    }
  }

  /**
   * 删除图片
   */
  async deleteImage(req, res) {
    try {
      const { url } = req.body

      if (!url) {
        return res.status(400).json({
          success: false,
          message: '图片URL不能为空'
        })
      }

      const result = await uploadService.deleteImage(url)

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.error
        })
      }

      res.json({
        success: true,
        message: '图片删除成功'
      })

    } catch (error) {
      console.error('删除图片错误:', error)
      res.status(500).json({
        success: false,
        message: '图片删除失败'
      })
    }
  }

  /**
   * 获取上传配置
   */
  async getUploadConfig(req, res) {
    try {
      res.json({
        success: true,
        data: {
          maxSize: '5MB',
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          supportsCompression: true,
          provider: 'aliyun-oss'
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取配置失败'
      })
    }
  }
}

module.exports = new UploadController()