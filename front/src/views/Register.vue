<template>
  <div class="register-page">
    <el-card class="register-form">
      <h2 class="form-title">用户注册</h2>

      <el-form
        :model="form"
        :rules="rules"
        ref="registerFormRef"
        @submit.prevent="handleRegister"
        class="form-content"
      >
        <el-form-item label="用户名" prop="username" label-width="100px">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名（3-20位字母或数字）"
            clearable
            size="large"
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email" label-width="100px">
          <el-input
            v-model="form.email"
            placeholder="请输入邮箱地址"
            clearable
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password" label-width="100px">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（6-20位）"
            show-password
            size="large"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword" label-width="100px">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
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
            style="background: linear-gradient(to right, #67C23A, #409EFF)"
          >
            {{ loading ? '注册中...' : '立即注册' }}
          </el-button>
        </el-form-item>

        <div class="login-link">
          <el-link
            type="info"
            :underline="false"
            @click="goToLogin"
          >
            ← 已有账号？去登录
          </el-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

const router = useRouter();
const registerFormRef = ref(null);
const loading = ref(false);

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// 表单验证规则
const validateUsername = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入用户名'));
  } else if (!/^[a-zA-Z0-9]{3,20}$/.test(value)) {
    callback(new Error('用户名需为3-20位字母或数字'));
  } else {
    callback();
  }
};

const validateEmail = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入邮箱地址'));
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    callback(new Error('请输入正确的邮箱格式'));
  } else {
    callback();
  }
};

const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'));
  } else if (value.length < 6 || value.length > 20) {
    callback(new Error('密码长度需为6-20位'));
  } else {
    callback();
  }
};

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'));
  } else {
    callback();
  }
};

const rules = reactive({
  username: [{ validator: validateUsername, trigger: 'blur' }],
  email: [{ validator: validateEmail, trigger: 'blur' }],
  password: [{ validator: validatePassword, trigger: 'blur' }],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }]
});

const handleRegister = async () => {
  // 先触发 Element Plus 表单验证
  if (!registerFormRef.value) return;

  registerFormRef.value.validate(async (valid) => {
    if (!valid) return;

    loading.value = true;
    try {
      const response = await request.post('/api/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password
      });

      if (response?.success) {
        ElMessage.success('注册成功！即将跳转到登录页...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        ElMessage.error(response.message || '注册失败，请稍后重试');
      }
    } catch (error) {
      console.error('注册异常:', error);
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message);
      } else {
        ElMessage.error('网络错误，请检查后重试');
      }
    } finally {
      loading.value = false;
    }
  });
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.register-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #f0f0f0 0%, #e6e6e6 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  overflow: hidden;
}

.register-form {
  width: 450px;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  background: white;
  overflow: hidden;
  transition: all 0.3s ease;
}

.register-form:hover {
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
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
  box-shadow: 0 4px 15px rgba(103, 194, 58, 0.4);
  transition: all 0.2s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(103, 194, 58, 0.5);
}

.login-link {
  text-align: center;
  margin-top: 16px;
}

.login-link a {
  font-size: 14px;
  color: #67c23a;
  cursor: pointer;
}

/* 输入框样式复用 */
.el-input__inner {
  height: 48px;
  border-radius: 10px;
  padding: 0 15px;
  font-size: 15px;
  transition: all 0.2s;
}

.el-input__inner:focus {
  border-color: #67c23a;
  box-shadow: 0 0 0 2px rgba(103, 194, 58, 0.2);
}
</style>