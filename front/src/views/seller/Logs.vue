<!-- src/views/seller/Logs.vue -->
<template>
  <div class="seller-logs">
    <div class="page-header">
      <h2>操作日志</h2>
      <p class="hint">记录操作时间、内容、IP、账号（3.2 数据采集）</p>
    </div>

    <el-card>
      <el-table class="logs-table" :data="logs" v-loading="loading" stripe border style="width: 100%">
        <el-table-column label="操作时间" width="180">
          <template #default="{ row }">{{ formatDate(row.operatedAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="role" label="角色" width="90">
          <template #default="{ row }">{{ roleText(row.role) }}</template>
        </el-table-column>
        <el-table-column prop="content" label="操作内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP 地址" width="140">
          <template #default="{ row }">{{ row.ipAddress || '-' }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const logs = ref([])
const loading = ref(false)

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const roleText = (role) => {
  const map = { admin: '管理者', seller: '销售人员', customer: '用户' }
  return map[role] || role
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/seller/logs')
    if (response.success) {
      logs.value = response.data || []
    }
  } catch (error) {
    console.error('获取日志失败:', error)
    ElMessage.error('获取日志失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.seller-logs {
  padding: 0;
  text-align: left;
}
.page-header {
  margin-bottom: 20px;
}
.hint {
  margin: 8px 0 0;
  color: #909399;
  font-size: 13px;
}
.logs-table {
  text-align: left;
}
</style>
