<template>
  <div class="login-page">
    <el-card class="login-form">
      <h2 class="form-title">欢迎登录</h2>

      <el-form :model="form" class="form-content" @submit.prevent="handleLogin">
        <el-form-item label="用户名" label-width="80px">
          <el-input 
            v-model="form.username" 
            placeholder="请输入用户名"
            clearable
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" label-width="80px">
          <el-input 
            v-model="form.password" 
            type="password"
            placeholder="请输入密码"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item class="submit-item">
          <el-button 
            type="primary" 
            native-type="submit"
            :loading="loading"
            size="large"
            class="submit-btn"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 👇 新增：跳转注册链接 -->
      <div class="register-link">
        <span>未注册？</span>
        <router-link to="/register" class="register-text">点击这里</router-link>
      </div>
    </el-card>
  </div>
</template>

<script>

</script>
<script setup>
import { reactive, ref } from 'vue';
import  request  from '@/utils/request';
import {useRouter} from 'vue-router'
import { useUserStore } from '../store/user';
const userStore=useUserStore()
const router=useRouter()
const form=reactive({
  username:'',
  password:''
})
const loading =ref(false)
const handleLogin=async ()=>{
  if(!form.username.trim() ||!form.password.trim()){
    alert('账号名或系统不能为空');
    return;
  }
  loading.value=true
  try{
    const response =await request.post('/api/auth/login',{
      username:form.username,
      password:form.password
    })
    
    console.log(response);

    if(response?.success){
      userStore.login(response.data)
      alert('登录成功')
      //登录成功
      router.push('/home')
      return
    }
    else{
      alert('登录失败'||response?.message)
      return
    }
  }catch(error){
    if (error.response) {
      const { status, data } = error.response
      let msg = '登录失败'

      if (status === 401) {
        // ✅ 精确提示
        msg = data?.message || '用户名或密码错误'
      } else if (status === 500) {
        msg = '服务器开小差了，请稍后再试'
      } else {
        msg = data?.message || '未知错误'
      }

      alert(msg) // 👈 只弹这一次！
    }
    else{
      alert('网路连接错误')
    }
  }finally{
    loading.value=false
  }
}
</script>
<style scoped>
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0f0f0 0%, #e6e6e6 100%); /* 浅灰渐变背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden; /* 防止滚动 */
}

.login-form {
  width: 400px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25); /* 增强阴影深度 */
  background: white;
  overflow: hidden;
  transition: all 0.3s ease; /* 卡片悬停效果 */
}

.login-form:hover {
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3); /* 悬停增强阴影 */
}

.form-title {
  text-align: center;
  margin-bottom: 28px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.5px;
}

.form-content {
  padding: 32px 40px;
}

.submit-item {
  margin-top: 20px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  border-radius: 12px;
  background: linear-gradient(to right, #409EFF, #67C23A); /* 精致渐变按钮 */
  box-shadow: 0 4px 15px rgba(64, 158, 255, 0.4);
  transition: all 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.5);
}

/* 优化输入框 */
.el-input__inner {
  height: 48px;
  border-radius: 10px;
  padding: 0 15px;
  font-size: 15px;
  transition: all 0.2s;
}

.el-input__inner:focus {
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.register-link {
  text-align: right;        /* 靠右对齐 */
  margin-top: 16px;
  font-size: 14px;
  color: #666;
  padding-right: 40px;      /* 与表单内边距对齐，视觉更协调 */
}

.register-link .register-text {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
  margin-left: 4px;
}

.register-link .register-text:hover {
  color: #66b1ff;
  text-decoration: underline;
}
</style>