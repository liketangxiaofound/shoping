<template>
  <div class="seller-view">
    <section class="seller-header">
      <div>
        <h2>卖家后台</h2>
        <p>欢迎，{{ userStore.user?.username }}（{{ userStore.user?.role }}）</p>
      </div>
      <el-button @click="handleLogout" text>退出登录</el-button>
    </section>

    <el-card class="seller-nav-card">
      <el-menu
        mode="horizontal"
        router
        :default-active="$route.path"
        class="seller-menu"
      >
        <el-menu-item index="/seller/products">商品管理</el-menu-item>
        <el-menu-item index="/seller/orders">订单管理</el-menu-item>
        <!-- 分类由平台统一管理，卖家不可维护
        <el-menu-item index="/seller/categories">分类管理</el-menu-item>
        -->
        <el-menu-item index="/seller/metrics">绩效概览</el-menu-item>
        <el-menu-item index="/seller/logs">操作日志</el-menu-item>
        <el-menu-item index="/seller/data-io">导入导出</el-menu-item>
      </el-menu>
    </el-card>

    <div class="seller-content">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出卖家后台吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.seller-view {
  padding: 24px;
  background-color: #f5f7fa;
  color: #2c3e50;
  min-height: 100vh;
}
.seller-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}
.seller-header h2,
.seller-header p {
  color: #2c3e50;
}
.seller-nav-card {
  margin-bottom: 20px;
  background: #ffffff;
}
.seller-content {
  min-height: 480px;
  background-color: transparent;
}
</style>
