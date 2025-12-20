import axios from 'axios'

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
  (error) => {
    if (error.response) {
      const { status, config } = error.response

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