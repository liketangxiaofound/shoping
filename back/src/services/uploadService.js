// services/uploadService.js
const OSSService = require('../utils/ossService')
const sharp = require('sharp')

class UploadService {
  constructor() {
    this.ossService = OSSService
  }

  /**
   * 处理图片上传（主要入口）
   */
  async uploadImage(file, options = {}) {
    const {
      prefix = 'uploads',
      compress = true,
      maxWidth = 1200,
      quality = 80
    } = options

    try {
      // 1. 验证文件
      const validation = this.validateFile(file)
      if (!validation.success) {
        return validation
      }

      // 2. 处理图片（压缩、调整尺寸）
      let processedBuffer = file.buffer
      if (compress && this.isImage(file.mimetype)) {
        processedBuffer = await this.processImage(file.buffer, {
          maxWidth,
          quality
        })
      }

      // 3. 生成文件名
      const filename = this.ossService.generateFileName(
        file.originalname,
        prefix
      )

      // 4. 上传到OSS
      const uploadResult = await this.ossService.uploadFile(
        processedBuffer,
        filename
      )

      if (!uploadResult.success) {
        throw new Error(`OSS上传失败: ${uploadResult.error}`)
      }

      return {
        success: true,
        filename: filename,
        url: uploadResult.url,
        size: processedBuffer.length,
        originalSize: file.size,
        compressed: compress && this.isImage(file.mimetype)
      }

    } catch (error) {
      console.error('图片上传服务错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 验证文件
   */
  validateFile(file) {
    // 检查文件是否存在
    if (!file || !file.buffer) {
      return {
        success: false,
        error: '文件不能为空'
      }
    }

    // 检查文件大小（5MB限制）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: `文件大小不能超过 ${maxSize / 1024 / 1024}MB`
      }
    }

    // 检查文件类型
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp'
    ]
    
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        success: false,
        error: '不支持的文件类型，仅支持图片文件'
      }
    }

    return { success: true }
  }

  /**
   * 处理图片（压缩、调整尺寸）
   */
  async processImage(buffer, options = {}) {
    try {
      const { maxWidth = 1200, quality = 80 } = options
      
      let sharpInstance = sharp(buffer)
      
      // 获取图片元数据
      const metadata = await sharpInstance.metadata()
      
      // 如果图片宽度超过最大宽度，进行缩放
      if (metadata.width > maxWidth) {
        sharpInstance = sharpInstance.resize(maxWidth)
      }
      
      // 根据格式进行优化
      if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ quality })
      } else if (metadata.format === 'png') {
        sharpInstance = sharpInstance.png({ quality })
      } else if (metadata.format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality })
      }
      
      return await sharpInstance.toBuffer()
      
    } catch (error) {
      console.warn('图片处理失败，使用原文件:', error)
      return buffer // 处理失败时返回原文件
    }
  }

  /**
   * 检查是否为图片文件
   */
  isImage(mimetype) {
    return mimetype && mimetype.startsWith('image/')
  }

  /**
   * 批量上传图片
   */
  async uploadMultiple(files, options = {}) {
    const results = []
    
    for (const file of files) {
      const result = await this.uploadImage(file, options)
      results.push({
        filename: file.originalname,
        ...result
      })
    }
    
    return results
  }

  /**
   * 删除图片
   */
  async deleteImage(url) {
    try {
      // 从URL中提取文件名
      const filename = this.extractFilenameFromUrl(url)
      if (!filename) {
        return {
          success: false,
          error: '无法从URL中提取文件名'
        }
      }
      
      return await this.ossService.deleteFile(filename)
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 从OSS URL中提取文件名
   */
  extractFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url)
      // OSS URL格式: https://bucket.region.aliyuncs.com/filename
      return urlObj.pathname.substring(1) // 移除开头的斜杠
    } catch (error) {
      console.error('URL解析错误:', error)
      return null
    }
  }
}

module.exports = new UploadService()