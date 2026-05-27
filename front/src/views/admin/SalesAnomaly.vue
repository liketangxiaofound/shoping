<!-- 3.3 销售异常判别与实时监控 -->
<template>
  <div class="sales-anomaly">
    <div class="page-header">
      <h2>销售异常监控</h2>
      <p class="hint">
        基于销售额 Z-score、分类下滑、库存与订单积压的实时判别
        <span v-if="autoRefresh" class="refresh-tag">· 每 {{ refreshSec }}s 自动刷新</span>
      </p>
    </div>

    <el-card class="toolbar">
      <el-form :inline="true">
        <el-form-item label="分析窗口">
          <el-select v-model="windowDays" style="width: 120px" @change="fetchData">
            <el-option :value="14" label="近14天" />
            <el-option :value="30" label="近30天" />
            <el-option :value="60" label="近60天" />
          </el-select>
        </el-form-item>
        <el-form-item label="自动刷新">
          <el-switch v-model="autoRefresh" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchData">立即刷新</el-button>
        </el-form-item>
        <el-form-item v-if="data.realtime?.monitoredAt">
          <span class="muted">更新于 {{ formatTime(data.realtime.monitoredAt) }}</span>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="status-banner" :class="data.summary?.healthStatus || 'normal'" v-loading="loading">
      <div class="banner-left">
        <span class="health-dot" />
        <strong>系统状态：{{ data.summary?.healthLabel || '正常' }}</strong>
        <span class="banner-counts">
          严重 {{ data.summary?.critical ?? 0 }} · 警告 {{ data.summary?.warning ?? 0 }} · 提示 {{ data.summary?.info ?? 0 }}
        </span>
      </div>
    </div>

    <el-row :gutter="16" class="metrics-row" v-loading="loading">
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">今日销售额</div>
          <div class="metric-value">¥{{ (data.realtime?.todayRevenue ?? 0).toFixed(2) }}</div>
          <div class="metric-sub" :class="changeClass(data.realtime?.todayChangeRate)">
            较昨日 {{ formatChange(data.realtime?.todayChangeRate) }}
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">较7日均值</div>
          <div class="metric-value" :class="changeClass(data.realtime?.todayVsBaseline)">
            {{ formatChange(data.realtime?.todayVsBaseline) }}
          </div>
          <div class="metric-sub">均值 ¥{{ (data.realtime?.baselineAvg ?? 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">今日订单</div>
          <div class="metric-value">{{ data.realtime?.todayOrderCount ?? 0 }}</div>
          <div class="metric-sub">昨日 {{ data.realtime?.yesterdayOrderCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">待支付订单</div>
          <div class="metric-value warn">{{ data.realtime?.pendingOrderCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">低库存商品</div>
          <div class="metric-value warn">{{ data.realtime?.lowStockCount ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="8" :md="4">
        <el-card shadow="hover" class="metric-card">
          <div class="metric-label">近7天取消率</div>
          <div class="metric-value">{{ data.realtime?.cancelRate7d ?? 0 }}%</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <el-card v-loading="loading">
          <div class="section-title">异常事件列表</div>
          <el-empty v-if="!data.anomalies?.length" description="暂无异常，运行正常" />
          <el-table v-else :data="data.anomalies" stripe border size="small" style="width: 100%">
            <el-table-column label="级别" width="80">
              <template #default="{ row }">
                <el-tag :type="levelTagType(row.level)" size="small">{{ levelText(row.level) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="异常项" min-width="160" show-overflow-tooltip />
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column prop="type" label="类型" width="120" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="10">
        <el-card v-loading="loading">
          <div class="section-title">近14日销售与异常点</div>
          <div class="mini-chart">
            <div
              v-for="bar in chartBars"
              :key="bar.label"
              class="mini-bar-col"
              :title="`${bar.label}: ¥${bar.revenue}${bar.isAnomaly ? ' (异常)' : ''}`"
            >
              <div
                class="mini-bar"
                :class="{ anomaly: bar.isAnomaly }"
                :style="{ height: bar.height + '%' }"
              />
              <span class="mini-label">{{ bar.shortLabel }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const data = ref({ summary: {}, realtime: {}, anomalies: [], dailyWithAnomaly: [] })
const windowDays = ref(30)
const autoRefresh = ref(true)
const refreshSec = 30
let timer = null

const chartBars = computed(() => {
  const list = data.value.dailyWithAnomaly || []
  const max = Math.max(...list.map((b) => b.revenue), 1)
  return list.map((b) => ({
    ...b,
    height: Math.max(6, (b.revenue / max) * 100),
    shortLabel: b.label?.slice(5) || ''
  }))
})

const levelTagType = (level) => ({ critical: 'danger', warning: 'warning', info: 'info' }[level] || '')
const levelText = (level) => ({ critical: '严重', warning: '警告', info: '提示' }[level] || level)

const formatTime = (iso) => new Date(iso).toLocaleString('zh-CN')
const formatChange = (v) => {
  if (v == null) return '—'
  return `${v > 0 ? '+' : ''}${v}%`
}
const changeClass = (v) => {
  if (v == null) return ''
  if (v <= -35) return 'down'
  if (v >= 50) return 'up'
  return ''
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/admin/analytics/sales-anomalies', {
      params: { windowDays: windowDays.value }
    })
    if (res.success) data.value = res.data
  } catch {
    ElMessage.error('获取异常监控数据失败')
  } finally {
    loading.value = false
  }
}

const setupTimer = () => {
  clearInterval(timer)
  if (autoRefresh.value) {
    timer = setInterval(fetchData, refreshSec * 1000)
  }
}

onMounted(() => {
  fetchData()
  setupTimer()
})

onBeforeUnmount(() => {
  clearInterval(timer)
})

watch(autoRefresh, setupTimer)
</script>

<style scoped>
.sales-anomaly {
  text-align: left;
}
.page-header {
  margin-bottom: 16px;
}
.hint {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
.refresh-tag {
  color: #67c23a;
}
.toolbar {
  margin-bottom: 16px;
}
.muted {
  color: #909399;
  font-size: 13px;
}
.status-banner {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}
.status-banner.warning {
  background: #fdf6ec;
  border-color: #faecd8;
}
.status-banner.critical {
  background: #fef0f0;
  border-color: #fde2e2;
}
.status-banner.info {
  background: #ecf5ff;
  border-color: #d9ecff;
}
.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #67c23a;
}
.status-banner.warning .health-dot {
  background: #e6a23c;
}
.status-banner.critical .health-dot {
  background: #f56c6c;
}
.banner-counts {
  color: #606266;
  font-size: 14px;
}
.metrics-row {
  margin-bottom: 16px;
}
.metric-card {
  margin-bottom: 12px;
  text-align: center;
}
.metric-label {
  font-size: 13px;
  color: #909399;
}
.metric-value {
  font-size: 22px;
  font-weight: 600;
  margin: 8px 0 4px;
  color: #303133;
}
.metric-value.warn {
  color: #e6a23c;
}
.metric-value.down {
  color: #f56c6c;
}
.metric-value.up {
  color: #67c23a;
}
.metric-sub {
  font-size: 12px;
  color: #909399;
}
.metric-sub.down {
  color: #f56c6c;
}
.metric-sub.up {
  color: #67c23a;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.mini-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 160px;
  overflow-x: auto;
}
.mini-bar-col {
  flex: 1;
  min-width: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}
.mini-bar {
  width: 100%;
  background: #409eff;
  border-radius: 3px 3px 0 0;
  min-height: 4px;
}
.mini-bar.anomaly {
  background: #f56c6c;
}
.mini-label {
  font-size: 9px;
  color: #909399;
  margin-top: 4px;
}
</style>
