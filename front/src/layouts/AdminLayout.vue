<!-- src/layouts/AdminLayout.vue -->
<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar desktop-only">
      <div class="logo">
        <h2>管理后台</h2>
      </div>
      <el-menu
        router
        :default-active="$route.path"
        class="admin-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>仪表板</span>
        </el-menu-item>
        <el-menu-item index="/admin/sellers">
          <el-icon><User /></el-icon>
          <span>销售人员管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/sellers/performance">
          <el-icon><TrendCharts /></el-icon>
          <span>销售业绩监控</span>
        </el-menu-item>
        <el-menu-item index="/admin/reports/sales">
          <el-icon><DataAnalysis /></el-icon>
          <span>销售报表</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/collection">
          <el-icon><Document /></el-icon>
          <span>数据采集</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/user-profiles">
          <el-icon><UserFilled /></el-icon>
          <span>用户画像</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/sales-trend-chart">
          <el-icon><TrendCharts /></el-icon>
          <span>销售趋势图</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/sales-trend">
          <el-icon><DataLine /></el-icon>
          <span>销售趋势预测</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/sales-anomalies">
          <el-icon><Warning /></el-icon>
          <span>销售异常监控</span>
        </el-menu-item>
        <el-menu-item index="/admin/analytics/sales-ranking">
          <el-icon><Trophy /></el-icon>
          <span>销售排行榜</span>
        </el-menu-item>
        <el-menu-item index="/admin/anti-crawler">
          <el-icon><Lock /></el-icon>
          <span>反爬虫监控</span>
        </el-menu-item>
        <el-menu-item index="/admin/data-screen">
          <el-icon><Monitor /></el-icon>
          <span>数据可视化大屏</span>
        </el-menu-item>
        <el-menu-item index="/admin/data-io">
          <el-icon><Upload /></el-icon>
          <span>数据导入导出</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <el-drawer v-model="drawerVisible" direction="ltr" size="260px" title="管理菜单" class="mobile-drawer">
      <el-menu
        router
        :default-active="$route.path"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        @select="drawerVisible = false"
      >
        <el-menu-item index="/admin/dashboard">仪表板</el-menu-item>
        <el-menu-item index="/admin/sellers">销售人员管理</el-menu-item>
        <el-menu-item index="/admin/sellers/performance">销售业绩监控</el-menu-item>
        <el-menu-item index="/admin/reports/sales">销售报表</el-menu-item>
        <el-menu-item index="/admin/analytics/collection">数据采集</el-menu-item>
        <el-menu-item index="/admin/analytics/user-profiles">用户画像</el-menu-item>
        <el-menu-item index="/admin/analytics/sales-trend-chart">销售趋势图</el-menu-item>
        <el-menu-item index="/admin/analytics/sales-trend">销售趋势预测</el-menu-item>
        <el-menu-item index="/admin/analytics/sales-anomalies">销售异常监控</el-menu-item>
        <el-menu-item index="/admin/analytics/sales-ranking">销售排行榜</el-menu-item>
        <el-menu-item index="/admin/anti-crawler">反爬虫监控</el-menu-item>
        <el-menu-item index="/admin/data-screen">数据可视化大屏</el-menu-item>
        <el-menu-item index="/admin/data-io">数据导入导出</el-menu-item>
      </el-menu>
    </el-drawer>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部导航 -->
      <header class="admin-header">
        <div class="header-left">
          <el-button class="menu-toggle mobile-only" text @click="drawerVisible = true">
            <el-icon :size="22"><Menu /></el-icon>
          </el-button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/admin/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="admin-info">管理员：{{ userStore.user?.username }}</span>
          <el-button @click="handleLogout" text>退出</el-button>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Odometer, 
  User,
  DataAnalysis,
  TrendCharts,
  Document,
  UserFilled,
  Warning,
  Trophy,
  DataLine,
  Lock,
  Monitor,
  Menu,
  Upload
} from '@element-plus/icons-vue'

const drawerVisible = ref(false)
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// 计算当前页面标题
const currentPageTitle = computed(() => {
  const map = {
    '/admin/dashboard': '仪表板',
    '/admin/sellers': '销售人员管理',
    '/admin/sellers/performance': '销售业绩监控',
    '/admin/reports/sales': '销售统计报表',
    '/admin/analytics/collection': '数据采集',
    '/admin/analytics/user-profiles': '用户画像',
    '/admin/analytics/sales-trend-chart': '销售趋势图',
    '/admin/analytics/sales-trend': '销售趋势预测',
    '/admin/analytics/sales-anomalies': '销售异常监控',
    '/admin/analytics/sales-ranking': '销售排行榜',
    '/admin/anti-crawler': '反爬虫监控',
    '/admin/data-screen': '数据可视化大屏',
    '/admin/data-io': '数据导入导出'
  }
  return map[route.path] || '管理后台'
})

// 退出登录
const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出管理后台吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (error) {
    // 用户取消
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

.sidebar {
  width: 240px;
  background-color: #304156;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #1f2d3d;
}

.logo h2 {
  color: #fff;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.admin-menu {
  border: none;
  margin-top: 10px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-header {
  height: 60px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.admin-info {
  color: #666;
  font-size: 14px;
}

.content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  text-align: left;
}

.content :deep(.el-table) {
  width: 100%;
  text-align: left;
}

.mobile-only {
  display: none;
}

@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }
  .mobile-only {
    display: inline-flex;
  }
  .menu-toggle {
    margin-right: 4px;
  }
}
</style>