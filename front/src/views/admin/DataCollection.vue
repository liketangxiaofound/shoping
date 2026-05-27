<!-- 3.2 数据采集概览（管理员验收） -->
<template>
  <div class="data-collection">
    <div class="page-header">
      <h2>数据采集概览</h2>
      <p class="hint">3.2 大数据采集：登录、浏览、购买、操作日志</p>
    </div>

    <div class="count-cards" v-loading="loading">
      <el-card v-for="item in countItems" :key="item.key" class="count-card">
        <div class="count-value">{{ summary.counts?.[item.key] ?? 0 }}</div>
        <div class="count-label">{{ item.label }}</div>
      </el-card>
    </div>

    <el-card class="section" v-loading="loading">
      <div class="section-title">最近登录（时间 / IP / 账号）</div>
      <el-table :data="summary.recent?.logins || []" stripe border style="width: 100%">
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="role" label="角色" width="100" />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="loginAt" label="登录时间" min-width="180">
          <template #default="{ row }">{{ formatDate(row.loginAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section" v-loading="loading">
      <div class="section-title">最近浏览（类别 / 停留秒数）</div>
      <el-table :data="summary.recent?.browses || []" stripe border style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column prop="category" label="商品类别" width="120" />
        <el-table-column prop="dwellSeconds" label="停留(秒)" width="100" />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="browsedAt" label="时间" min-width="180">
          <template #default="{ row }">{{ formatDate(row.browsedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section" v-loading="loading">
      <div class="section-title">最近购买（类别 / 单价 / 数量 / 日期）</div>
      <el-table :data="summary.recent?.purchases || []" stripe border style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="90" />
        <el-table-column prop="category" label="类别" width="120" />
        <el-table-column prop="unitPrice" label="单价" width="100">
          <template #default="{ row }">¥{{ Number(row.unitPrice).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="purchaseDate" label="日期" min-width="180">
          <template #default="{ row }">{{ formatDate(row.purchaseDate) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section" v-loading="loading">
      <div class="section-title">最近操作日志（销售/管理）</div>
      <el-table :data="summary.recent?.operations || []" stripe border style="width: 100%">
        <el-table-column prop="username" label="账号" width="120" />
        <el-table-column prop="content" label="内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP" width="140" />
        <el-table-column prop="operatedAt" label="操作时间" min-width="180">
          <template #default="{ row }">{{ formatDate(row.operatedAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const summary = ref({ counts: {}, recent: {} })

const countItems = [
  { key: 'loginCount', label: '登录记录' },
  { key: 'browseCount', label: '浏览行为' },
  { key: 'purchaseCount', label: '购买记录' },
  { key: 'operationCount', label: '操作日志' }
]

const formatDate = (v) => (v ? new Date(v).toLocaleString('zh-CN') : '-')

const fetchSummary = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/admin/analytics/collection')
    if (res.success) summary.value = res.data
  } catch {
    ElMessage.error('获取采集数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchSummary)
</script>

<style scoped>
.data-collection { text-align: left; }
.page-header { margin-bottom: 20px; }
.hint { color: #909399; font-size: 13px; margin-top: 8px; }
.count-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.count-card { text-align: center; }
.count-value { font-size: 28px; font-weight: bold; color: #409eff; }
.count-label { color: #666; margin-top: 8px; }
.section { margin-bottom: 20px; }
.section-title { font-weight: 600; margin-bottom: 12px; }
</style>
