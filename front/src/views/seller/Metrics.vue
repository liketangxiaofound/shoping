<!-- src/views/seller/Metrics.vue -->
<template>
  <div class="seller-metrics">
    <div class="page-header">
      <h2>绩效概览</h2>
    </div>

    <div class="stats-grid">
      <el-card class="stat-card" v-loading="loading">
        <div class="stat-title">总销售额</div>
        <div class="stat-value">¥{{ metrics.totalRevenue.toFixed(2) }}</div>
      </el-card>
      <el-card class="stat-card" v-loading="loading">
        <div class="stat-title">总订单数</div>
        <div class="stat-value">{{ metrics.totalOrders }}</div>
      </el-card>
      <el-card class="stat-card" v-loading="loading">
        <div class="stat-title">商品总数</div>
        <div class="stat-value">{{ metrics.productCount }}</div>
      </el-card>
      <el-card class="stat-card" v-loading="loading">
        <div class="stat-title">总库存</div>
        <div class="stat-value">{{ metrics.totalStock }}</div>
      </el-card>
      <el-card class="stat-card" v-loading="loading">
        <div class="stat-title">低库存商品</div>
        <div class="stat-value">{{ metrics.lowStockCount }}</div>
      </el-card>
    </div>

    <el-card class="chart-card" v-loading="loading">
      <div class="section-title">订单状态分布</div>
      <div class="status-tags">
        <el-tag
          v-for="(value, status) in metrics.statusCounts"
          :key="status"
          type="info"
        >
          {{ statusLabel(status) }}: {{ value }} 单
        </el-tag>
      </div>
    </el-card>

    <el-card class="chart-card" v-loading="loading">
      <div class="section-title">分类销售额</div>
      <el-table :data="categoryRevenueList" stripe>
        <el-table-column prop="category" label="分类" />
        <el-table-column prop="revenue" label="销售额" width="180">
          <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const metrics = ref({
  totalRevenue: 0,
  totalOrders: 0,
  productCount: 0,
  totalStock: 0,
  lowStockCount: 0,
  statusCounts: {},
  categoryRevenue: {}
})

const categoryRevenueList = computed(() => {
  return Object.entries(metrics.value.categoryRevenue || {}).map(([category, revenue]) => ({
    category,
    revenue
  }))
})

const fetchMetrics = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/seller/metrics')
    if (response.success) {
      metrics.value = response.data
    }
  } catch (error) {
    console.error('获取绩效失败:', error)
    ElMessage.error('获取绩效失败')
  } finally {
    loading.value = false
  }
}

const statusLabel = (status) => {
  switch (status) {
    case 'pending': return '待支付'
    case 'paid': return '已支付'
    case 'shipped': return '已发货'
    case 'delivered': return '已收货'
    case 'cancelled': return '已取消'
    default: return status || '未知'
  }
}

onMounted(() => {
  fetchMetrics()
})
</script>

<style scoped>
.seller-metrics {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
}
.stat-title {
  color: #666;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 28px;
  font-weight: bold;
}
.chart-card {
  margin-bottom: 20px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.status-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
