// utils/ossService.js
const OSS = require('ali-oss')
const path = require('path')

class OSSService {
  constructor() {
    this.client = null
    this.init()
  }

  init() {
    try {
      this.client = new OSS({
        region: process.env.OSS_REGION,
        accessKeyId: process.env.OSS_ACCESS_KEY_ID,
        accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
        bucket: process.env.OSS_BUCKET,
        endpoint: process.env.OSS_ENDPOINT
      })
      console.log('✅ 阿里云OSS客户端初始化成功')
    } catch (error) {
      console.error('❌ OSS初始化失败:', error)
      throw error
    }
  }

  /**
   * 生成唯一的文件名
   */
  generateFileName(originalName, prefix = 'products') {
    const ext = path.extname(originalName).toLowerCase()
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}/${timestamp}_${random}${ext}`
  }

  /**
   * 上传文件到OSS
   */
  async uploadFile(fileBuffer, filename, options = {}) {
    try {
      console.log(`📤 开始上传文件到OSS: ${filename}`)
      
      const result = await this.client.put(filename, fileBuffer, {
        headers: {
          'Content-Type': this.getMimeType(filename),
          ...options.headers
        }
      })
      
      console.log('✅ 文件上传成功:', result.url)
      return {
        success: true,
        url: result.url,
        name: result.name,
        etag: result.etag
      }
    } catch (error) {
      console.error('❌ OSS上传错误:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 上传本地文件到OSS
   */
  async uploadLocalFile(localPath, remoteFilename) {
    try {
      const result = await this.client.put(remoteFilename, localPath)
      return {
        success: true,
        url: result.url
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 删除OSS文件
   */
  async deleteFile(filename) {
    try {
      await this.client.delete(filename)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 生成预签名URL（临时访问）
   */
  async generatePresignedUrl(filename, expires = 3600) {
    try {
      const url = this.client.signatureUrl(filename, {
        expires,
        method: 'GET'
      })
      return {
        success: true,
        url
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filename) {
    try {
      const result = await this.client.head(filename)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 根据文件名获取MIME类型
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp'
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const result = await this.client.list({ 'max-keys': 1 })
      return {
        success: true,
        message: 'OSS连接测试成功',
        data: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

module.exports = new OSSService()