<!-- src/views/admin/Dashboard.vue -->
<template>
  <div class="admin-dashboard">
    <h2 class="page-title">数据概览</h2>

    <div class="stats-cards" v-loading="loading">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon revenue">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">¥{{ stats.totalRevenue.toFixed(2) }}</div>
            <div class="stat-label">总销售额</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon orders">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon products">
            <el-icon><Goods /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalProducts }}</div>
            <div class="stat-label">商品数量</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon users">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">用户数量</div>
          </div>
        </div>
      </el-card>
    </div>

    <el-card class="quick-links">
      <div class="section-title">管理功能</div>
      <el-space wrap>
        <el-button type="primary" @click="router.push('/admin/sellers')">销售人员管理</el-button>
        <el-button @click="router.push('/admin/sellers/performance')">销售业绩监控</el-button>
        <el-button @click="router.push('/admin/reports/sales')">销售统计报表</el-button>
        <el-button @click="router.push('/admin/analytics/collection')">数据采集概览</el-button>
        <el-button @click="router.push('/admin/analytics/user-profiles')">用户画像</el-button>
        <el-button @click="router.push('/admin/analytics/sales-trend-chart')">销售趋势图</el-button>
        <el-button @click="router.push('/admin/analytics/sales-trend')">销售趋势预测</el-button>
        <el-button type="warning" @click="router.push('/admin/analytics/sales-anomalies')">销售异常监控</el-button>
        <el-button @click="router.push('/admin/analytics/sales-ranking')">销售排行榜</el-button>
        <el-button type="danger" plain @click="router.push('/admin/anti-crawler')">反爬虫监控</el-button>
        <el-button type="success" plain @click="router.push('/admin/data-screen')">数据可视化大屏</el-button>
        <el-button @click="router.push('/admin/data-io')">数据导入导出</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Money, ShoppingCart, Goods, User } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const stats = ref({
  totalRevenue: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalUsers: 0
})
const loading = ref(false)

const fetchStats = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/admin/stats/dashboard')
    if (response.success) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.admin-dashboard {
  padding: 0;
}

.page-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 15px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.revenue { background: linear-gradient(135deg, #67C23A, #409EFF); }
.stat-icon.orders { background: linear-gradient(135deg, #E6A23C, #F56C6C); }
.stat-icon.products { background: linear-gradient(135deg, #409EFF, #67C23A); }
.stat-icon.users { background: linear-gradient(135deg, #F56C6C, #E6A23C); }

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.quick-links {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
