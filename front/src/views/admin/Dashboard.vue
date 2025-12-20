<!-- src/views/admin/Dashboard.vue -->
<template>
  <div class="admin-dashboard">
    <h2 class="page-title">数据概览</h2>
    
    <!-- 统计卡片 -->
    <div class="stats-cards">
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

    <!-- 最近订单 -->
    <el-card class="recent-orders">
      <template #header>
        <div class="card-header">
          <h3>最近订单</h3>
          <el-button type="primary" text @click="$router.push('/admin/orders')">查看全部</el-button>
        </div>
      </template>
      
      <el-table :data="recentOrders" v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="user.username" label="用户" width="120" />
        <el-table-column prop="totalPrice" label="金额" width="100">
          <template #default="{ row }">¥{{ row.totalPrice.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" @click="viewOrderDetail(row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
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
const recentOrders = ref([])
const loading = ref(false)

// 状态映射
const statusTextMap = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已收货',
  cancelled: '已取消'
}

const statusTagTypeMap = {
  pending: 'warning',
  paid: 'primary',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger'
}

const getStatusText = (status) => statusTextMap[status] || '未知'
const getStatusTagType = (status) => statusTagTypeMap[status] || 'info'

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取统计数据
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

// 获取最近订单
const fetchRecentOrders = async () => {
  try {
    const response = await request.get('/api/admin/orders', {
      params: { page: 1, limit: 5 }
    })
    if (response.success) {
      recentOrders.value = response.data.orders || []
    }
  } catch (error) {
    console.error('获取最近订单失败:', error)
  }
}

// 查看订单详情
const viewOrderDetail = (orderId) => {
  router.push(`/admin/orders?view=${orderId}`)
}

onMounted(() => {
  fetchStats()
  fetchRecentOrders()
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-orders {
  border-radius: 8px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>