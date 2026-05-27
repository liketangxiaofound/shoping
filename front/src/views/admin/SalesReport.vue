<!-- src/views/admin/SalesReport.vue -->
<template>
  <div class="admin-sales-report">
    <div class="page-header">
      <h2>销售统计报表</h2>
    </div>

    <el-card class="report-card" v-loading="loading">
      <div class="section-title">按分类统计</div>
      <el-table :data="report.categoryReport" stripe>
        <el-table-column prop="category" label="分类" />
        <el-table-column prop="productCount" label="商品数" width="120" />
        <el-table-column prop="revenue" label="销售额" width="140">
          <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="report-card" v-loading="loading">
      <div class="section-title">订单状态统计</div>
      <el-table :data="report.statusReport" stripe>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">{{ statusText(row.status) }}</template>
        </el-table-column>
        <el-table-column prop="count" label="数量" width="120" />
      </el-table>
    </el-card>

    <el-card class="report-card" v-loading="loading">
      <div class="section-title">库存分布</div>
      <el-table :data="report.stockReport" stripe>
        <el-table-column prop="label" label="区间" />
        <el-table-column prop="count" label="数量" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const report = ref({ categoryReport: [], statusReport: [], stockReport: [] })
const loading = ref(false)

const statusTextMap = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已收货',
  cancelled: '已取消'
}
const statusText = (status) => statusTextMap[status] || status || '未知'

const fetchReport = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/admin/reports/sales')
    if (response.success) {
      report.value = response.data || { categoryReport: [], statusReport: [], stockReport: [] }
    }
  } catch (error) {
    console.error('获取销售报表失败:', error)
    ElMessage.error('获取销售报表失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchReport()
})
</script>

<style scoped>
.admin-sales-report {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}
.report-card {
  margin-bottom: 20px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
