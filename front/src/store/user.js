import {defineStore} from 'pinia'
import { ref,computed } from 'vue'

export const useUserStore = defineStore('user',()=>{
    const token =ref(localStorage .getItem('token') || null)
    const user =ref(localStorage.getItem('user')||null)
    const isLoggedIn= ref(false)

    const userId= computed(()=>user.value?.id || null)

    const login=(userData)=>{
        console.log('登录操作');
        
        token.value=userData.token
        user.value=userData.user
        isLoggedIn.value =true

        localStorage.setItem('token',userData.token)
        localStorage.setItem('user',JSON.stringify(userData.user))

        console.log('登录完成');
        
    }

    const logout = ()=>{
         console.log('🔄 执行退出登录')
        
        // 清除状态
        token.value = null
        user.value = null
        isLoggedIn.value = false
        
        // 清除本地存储
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        console.log('✅ 已退出登录')
    }

    const  updateUser =(userInfo)=>{
        console.log('🔄 更新用户信息')
        user.value = { ...user.value, ...userInfo }
        localStorage.setItem('user', JSON.stringify(user.value))
    }
    // ========== 初始化检查 ==========
  const checkAuthStatus = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
      isLoggedIn.value = true
      console.log('🔍 检测到已登录用户')
      console.log(user.value);
      
    }
  }

  // 应用启动时检查登录状态
  checkAuthStatus()

  // 返回所有状态和方法
  return {
    // 状态
    token,
    user,
    isLoggedIn,
    
    // 计算属性
    isLoggedIn,
    
    userId,
    
    // 操作方法
    login,
    logout,
    updateUser,
    checkAuthStatus
  }
}) 