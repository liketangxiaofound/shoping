<!-- src/views/admin/SellerPerformance.vue -->
<template>
  <div class="admin-seller-performance">
    <div class="page-header">
      <h2>销售人员绩效</h2>
    </div>

    <el-card>
      <el-table
        class="performance-table"
        :data="performance"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="sellerId" label="ID" width="80" align="center" />
        <el-table-column prop="username" label="用户名" min-width="120" show-overflow-tooltip />
        <el-table-column prop="email" label="邮箱" min-width="200" show-overflow-tooltip />
        <el-table-column prop="productCount" label="商品数量" width="110" align="center" />
        <el-table-column prop="orderCount" label="关联订单数" width="120" align="center" />
        <el-table-column prop="revenue" label="销售额" min-width="130" align="right">
          <template #default="{ row }">¥{{ Number(row.revenue || 0).toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const performance = ref([])
const loading = ref(false)

const fetchPerformance = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/admin/sellers/performance')
    if (response.success) {
      performance.value = response.data || []
    }
  } catch (error) {
    console.error('获取绩效数据失败:', error)
    ElMessage.error('获取绩效数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPerformance()
})
</script>

<style scoped>
.admin-seller-performance {
  padding: 0;
}
.page-header {
  margin-bottom: 20px;
}

/* 避免 #app 全局 text-align:center 导致表头/表体列宽错位 */
.performance-table {
  text-align: left;
}
</style>
