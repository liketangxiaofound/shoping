import axios from 'axios'
import {
  getCrawlerToken,
  promptCrawlerVerify,
  isCrawlerBlockedResponse
} from '@/utils/crawlerGuard'

const request = axios.create({
  baseURL: '/',
  timeout: 10000
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const crawlerToken = getCrawlerToken()
    if (crawlerToken) {
      config.headers['X-Crawler-Token'] = crawlerToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    return response.data
  },
  async (error) => {
    if (error.response) {
      const { status, config } = error.response

      // 3.4 反爬虫：需人机验证时弹窗，通过后重试原请求
      if (isCrawlerBlockedResponse(error) && config && !config.__crawlerRetried) {
        const msg = error.response.data?.message || '请完成人机验证'
        const ok = await promptCrawlerVerify(msg)
        if (ok) {
          config.__crawlerRetried = true
          config.headers = config.headers || {}
          config.headers['X-Crawler-Token'] = getCrawlerToken()
          return request(config)
        }
      }

      // ✅ 关键：如果是登录接口，不在此处处理 401！交给调用方处理
      if (config.url === '/api/user/login') {
        // 直接 reject，让 handleLogin 的 catch 处理
        return Promise.reject(error)
      }

      // 其他接口的 401 才做全局跳转
      if (status === 401) {
        console.error('认证已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      if (status === 500) {
        alert('服务器内部错误')
        return Promise.reject(error)
      }
    }

    // 网络错误等
    if (error.request) {
      alert('网络错误，请检查连接')
    }

    return Promise.reject(error)
  }
)

export default request