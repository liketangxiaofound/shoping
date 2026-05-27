<!-- 3.4 反爬虫侦测与应对 -->
<template>
  <div class="anti-crawler">
    <div class="page-header">
      <h2>反爬虫监控</h2>
      <p class="hint">3.4 侦测：频率超限、突发请求、可疑 UA、蜜罐陷阱 · 应对：人机验证、临时封禁</p>
    </div>

    <div class="toolbar">
      <el-button type="primary" :loading="loading" @click="loadAll">刷新</el-button>
    </div>

    <div class="count-cards" v-loading="loading">
      <el-card class="count-card">
        <div class="count-value">{{ stats.last24h?.total ?? 0 }}</div>
        <div class="count-label">24h 拦截事件</div>
      </el-card>
      <el-card class="count-card" v-for="item in reasonCards" :key="item.reason">
        <div class="count-value">{{ item.count }}</div>
        <div class="count-label">{{ reasonLabel(item.reason) }}</div>
      </el-card>
    </div>

    <el-card class="section" v-loading="loading">
      <div class="section-title">策略阈值</div>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="滑动窗口">{{ config.windowMs }} ms</el-descriptions-item>
        <el-descriptions-item label="未登录上限">{{ config.maxRequests }} 次/窗口</el-descriptions-item>
        <el-descriptions-item label="已登录上限">{{ config.maxRequestsAuthed }} 次/窗口</el-descriptions-item>
        <el-descriptions-item label="突发窗口">{{ config.burstWindowMs }} ms / {{ config.burstMax }} 次</el-descriptions-item>
        <el-descriptions-item label="封禁时长">{{ config.banDurationSec }} 秒</el-descriptions-item>
        <el-descriptions-item label="验证令牌">{{ config.tokenTtlSec }} 秒</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="section" v-loading="loading">
      <div class="section-title">24h 高频 IP TOP10</div>
      <el-table :data="stats.last24h?.topIps || []" stripe border style="width: 100%">
        <el-table-column prop="ip" label="IP" min-width="140" />
        <el-table-column prop="count" label="事件数" width="100" align="center" />
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleUnban(row.ip)">解封</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section">
      <div class="section-title">拦截日志</div>
      <div class="filters">
        <el-select v-model="filterReason" placeholder="原因" clearable style="width: 160px" @change="loadEvents">
          <el-option label="频率超限" value="rate_limit" />
          <el-option label="突发请求" value="burst" />
          <el-option label="可疑 UA" value="suspicious_ua" />
          <el-option label="蜜罐" value="honeypot" />
          <el-option label="已封禁" value="banned" />
        </el-select>
        <el-input v-model="filterIp" placeholder="IP 筛选" clearable style="width: 180px" @clear="loadEvents" />
        <el-button @click="loadEvents">查询</el-button>
      </div>
      <el-table :data="events" stripe border style="width: 100%" v-loading="eventsLoading">
        <el-table-column prop="ipAddress" label="IP" width="130" />
        <el-table-column prop="reason" label="原因" width="120">
          <template #default="{ row }">{{ reasonLabel(row.reason) }}</template>
        </el-table-column>
        <el-table-column prop="action" label="处置" width="90" />
        <el-table-column prop="path" label="路径" min-width="160" show-overflow-tooltip />
        <el-table-column prop="userAgent" label="UA" min-width="180" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="120" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleUnban(row.ipAddress)">解封</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="limit"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadEvents"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const eventsLoading = ref(false)
const stats = ref({ last24h: {}, config: {} })
const config = computed(() => stats.value.config || {})
const events = ref([])
const page = ref(1)
const limit = ref(15)
const total = ref(0)
const filterReason = ref('')
const filterIp = ref('')

const reasonLabels = {
  rate_limit: '频率超限',
  burst: '突发请求',
  suspicious_ua: '可疑 UA',
  honeypot: '蜜罐命中',
  banned: '封禁访问',
  no_token: '无令牌'
}

const reasonLabel = (r) => reasonLabels[r] || r

const reasonCards = computed(() => stats.value.last24h?.byReason || [])

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

async function loadStats() {
  const res = await request.get('/api/admin/anti-crawler/stats')
  if (res.success) stats.value = res.data
}

async function loadEvents() {
  eventsLoading.value = true
  try {
    const res = await request.get('/api/admin/anti-crawler/events', {
      params: {
        page: page.value,
        limit: limit.value,
        reason: filterReason.value || undefined,
        ip: filterIp.value || undefined
      }
    })
    if (res.success) {
      events.value = res.data.items
      total.value = res.data.total
    }
  } finally {
    eventsLoading.value = false
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadStats(), loadEvents()])
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleUnban(ip) {
  try {
    await ElMessageBox.confirm(`确定解除 IP ${ip} 的封禁？`, '解封', { type: 'warning' })
    const res = await request.post(`/api/admin/anti-crawler/unban/${encodeURIComponent(ip)}`)
    if (res.success) {
      ElMessage.success(res.message || '已解封')
      loadAll()
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('解封失败')
  }
}

onMounted(loadAll)
</script>

<style scoped>
.anti-crawler {
  padding: 0;
}
.page-header h2 {
  margin: 0 0 8px;
}
.hint {
  color: #909399;
  font-size: 13px;
  margin: 0 0 16px;
}
.toolbar {
  margin-bottom: 16px;
}
.count-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.count-card {
  text-align: center;
}
.count-value {
  font-size: 28px;
  font-weight: 700;
  color: #e6a23c;
}
.count-label {
  font-size: 13px;
  color: #606266;
  margin-top: 4px;
}
.section {
  margin-bottom: 20px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
