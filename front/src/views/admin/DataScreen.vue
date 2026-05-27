<!-- 3.4 数据可视化大屏（ECharts） -->
<template>
  <div class="data-screen">
    <header class="screen-header">
      <div class="header-left">
        <h1>购物商城 · 数据可视化大屏</h1>
        <span class="sub">3.4 附加功能 · ECharts 实时分析</span>
      </div>
      <div class="header-center">{{ clock }}</div>
      <div class="header-right">
        <el-button size="small" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button size="small" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏' }}</el-button>
        <el-button size="small" type="primary" plain @click="goBack">返回后台</el-button>
      </div>
    </header>

    <div class="kpi-row" v-loading="loading">
      <div v-for="k in kpiList" :key="k.key" class="kpi-card">
        <div class="kpi-value">{{ k.display }}</div>
        <div class="kpi-label">{{ k.label }}</div>
      </div>
    </div>

    <div class="chart-grid" v-loading="loading">
      <div class="panel panel-wide">
        <div class="panel-title">近14日销售趋势</div>
        <div ref="chartSalesRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">分类销售额占比</div>
        <div ref="chartCategoryRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">商品销售 TOP10</div>
        <div ref="chartProductRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">用户地域分布</div>
        <div ref="chartRegionRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">购买力分布</div>
        <div ref="chartPowerRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">订单状态</div>
        <div ref="chartOrderRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">近7日行为趋势</div>
        <div ref="chartBehaviorRef" class="chart-box" />
      </div>
      <div class="panel">
        <div class="panel-title">运营健康度</div>
        <div ref="chartHealthRef" class="chart-box" />
        <div class="anomaly-list" v-if="data.anomalies?.recent?.length">
          <div v-for="(a, i) in data.anomalies.recent" :key="i" class="anomaly-item" :class="a.level">
            {{ a.title }}
          </div>
        </div>
      </div>
    </div>

    <footer class="screen-footer">
      数据更新时间：{{ lastUpdate }} · 自动刷新 {{ refreshSec }}s
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { loadEcharts } from '@/utils/loadEcharts'

const router = useRouter()
const loading = ref(false)
const data = ref({ kpis: {}, anomalies: {} })
const clock = ref('')
const lastUpdate = ref('—')
const refreshSec = 30
const isFullscreen = ref(false)

const chartSalesRef = ref(null)
const chartCategoryRef = ref(null)
const chartProductRef = ref(null)
const chartRegionRef = ref(null)
const chartPowerRef = ref(null)
const chartOrderRef = ref(null)
const chartBehaviorRef = ref(null)
const chartHealthRef = ref(null)

let echarts = null
const chartInstances = []
let refreshTimer = null
let clockTimer = null

const darkTheme = {
  backgroundColor: 'transparent',
  textStyle: { color: '#a8c5e8' },
  title: { textStyle: { color: '#e8f4ff' } },
  legend: { textStyle: { color: '#a8c5e8' } }
}

const kpiList = computed(() => {
  const k = data.value.kpis || {}
  return [
    { key: 'revenue', label: '累计销售额', display: `¥${formatNum(k.totalRevenue)}` },
    { key: 'orders', label: '订单总数', display: formatNum(k.totalOrders, 0) },
    { key: 'paid', label: '已支付订单', display: formatNum(k.paidOrders, 0) },
    { key: 'products', label: '在售商品', display: formatNum(k.activeProducts, 0) },
    { key: 'users', label: '注册用户', display: formatNum(k.totalUsers, 0) },
    { key: 'browse', label: '浏览日志', display: formatNum(k.browseLogs, 0) },
    { key: 'purchase', label: '购买记录', display: formatNum(k.purchaseRecords, 0) },
    { key: 'crawler', label: '24h反爬拦截', display: formatNum(k.crawlerEvents24h, 0) }
  ]
})

function formatNum(n, digits = 2) {
  const v = Number(n) || 0
  if (digits === 0) return Math.round(v).toLocaleString('zh-CN')
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`
  return v.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

function updateClock() {
  clock.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

function goBack() {
  router.push('/admin/dashboard')
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
    isFullscreen.value = true
  } else {
    document.exitFullscreen?.()
    isFullscreen.value = false
  }
}

function disposeCharts() {
  chartInstances.forEach((c) => c?.dispose())
  chartInstances.length = 0
}

function initChart(dom, option) {
  if (!dom || !echarts) return null
  const existing = echarts.getInstanceByDom(dom)
  if (existing) existing.dispose()
  const chart = echarts.init(dom, null, { renderer: 'canvas' })
  chart.setOption({ ...darkTheme, ...option })
  chartInstances.push(chart)
  return chart
}

function renderCharts() {
  const d = data.value
  if (!echarts) return

  initChart(chartSalesRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['销售额', '销量'], top: 0 },
    grid: { left: 50, right: 50, bottom: 30, top: 40 },
    xAxis: { type: 'category', data: d.salesTrend?.labels || [], axisLabel: { color: '#8ab4d9' } },
    yAxis: [
      { type: 'value', name: '元', axisLabel: { color: '#8ab4d9' }, splitLine: { lineStyle: { color: '#1e3a5f' } } },
      { type: 'value', name: '件', axisLabel: { color: '#8ab4d9' }, splitLine: { show: false } }
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        smooth: true,
        data: d.salesTrend?.revenue || [],
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.5)' },
            { offset: 1, color: 'rgba(64,158,255,0.05)' }
          ])
        },
        itemStyle: { color: '#409EFF' }
      },
      {
        name: '销量',
        type: 'bar',
        yAxisIndex: 1,
        data: d.salesTrend?.quantity || [],
        itemStyle: { color: '#67C23A' }
      }
    ]
  })

  const catData = (d.categoryRanking || []).map((r) => ({ name: r.name, value: r.revenue }))
  initChart(chartCategoryRef.value, {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '55%'],
        data: catData,
        label: { color: '#cfe4ff', fontSize: 11 },
        itemStyle: { borderRadius: 4, borderColor: '#0a1628', borderWidth: 2 }
      }
    ]
  })

  const products = d.productRanking || []
  initChart(chartProductRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 100, right: 20, top: 10, bottom: 20 },
    xAxis: { type: 'value', axisLabel: { color: '#8ab4d9' }, splitLine: { lineStyle: { color: '#1e3a5f' } } },
    yAxis: {
      type: 'category',
      data: products.map((p) => p.name).reverse(),
      axisLabel: { color: '#cfe4ff', width: 90, overflow: 'truncate' }
    },
    series: [
      {
        type: 'bar',
        data: products.map((p) => p.revenue).reverse(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#1a6fb5' },
            { offset: 1, color: '#4fc3f7' }
          ])
        }
      }
    ]
  })

  const regions = d.regionDistribution || []
  initChart(chartRegionRef.value, {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 10, bottom: 40, top: 10 },
    xAxis: {
      type: 'category',
      data: regions.map((r) => r.region),
      axisLabel: { color: '#8ab4d9', rotate: 30, fontSize: 10 }
    },
    yAxis: { type: 'value', axisLabel: { color: '#8ab4d9' }, splitLine: { lineStyle: { color: '#1e3a5f' } } },
    series: [{ type: 'bar', data: regions.map((r) => r.count), itemStyle: { color: '#E6A23C' } }]
  })

  const powers = d.purchasingPowerDistribution || []
  initChart(chartPowerRef.value, {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '65%',
        roseType: 'radius',
        data: powers.map((p) => ({ name: p.label, value: p.count })),
        label: { color: '#cfe4ff' }
      }
    ]
  })

  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    shipped: '已发货',
    delivered: '已完成',
    cancelled: '已取消'
  }
  const orders = d.orderStatus || []
  initChart(chartOrderRef.value, {
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: orders.map((o) => ({ name: statusMap[o.status] || o.status, value: o.count })),
        label: { color: '#cfe4ff' }
      }
    ]
  })

  const logins = d.behaviorTrend?.logins || []
  const browses = d.behaviorTrend?.browses || []
  const dates = logins.map((x) => x.date.slice(5))
  initChart(chartBehaviorRef.value, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['登录', '浏览'], top: 0 },
    grid: { left: 40, right: 10, bottom: 25, top: 35 },
    xAxis: { type: 'category', data: dates, axisLabel: { color: '#8ab4d9' } },
    yAxis: { type: 'value', axisLabel: { color: '#8ab4d9' }, splitLine: { lineStyle: { color: '#1e3a5f' } } },
    series: [
      { name: '登录', type: 'line', smooth: true, data: logins.map((x) => x.count), itemStyle: { color: '#409EFF' } },
      { name: '浏览', type: 'line', smooth: true, data: browses.map((x) => x.count), itemStyle: { color: '#F56C6C' } }
    ]
  })

  const healthVal =
    { normal: 85, info: 65, warning: 45, critical: 25 }[d.anomalies?.healthStatus] ?? 70
  initChart(chartHealthRef.value, {
    series: [
      {
        type: 'gauge',
        center: ['50%', '58%'],
        radius: '85%',
        min: 0,
        max: 100,
        progress: { show: true, width: 10 },
        axisLine: { lineStyle: { width: 10, color: [[0.3, '#F56C6C'], [0.7, '#E6A23C'], [1, '#67C23A']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: d.anomalies?.healthLabel || '正常',
          color: '#e8f4ff',
          fontSize: 16,
          offsetCenter: [0, '20%']
        },
        data: [{ value: healthVal }]
      }
    ]
  })
}

function resizeCharts() {
  chartInstances.forEach((c) => c?.resize())
}

async function fetchData() {
  loading.value = true
  try {
    const res = await request.get('/api/admin/analytics/data-screen')
    if (res.success) {
      data.value = res.data
      lastUpdate.value = new Date(res.data.updatedAt).toLocaleString('zh-CN')
      await nextTick()
      renderCharts()
    }
  } catch (e) {
    ElMessage.error('加载大屏数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  try {
    echarts = await loadEcharts()
  } catch (e) {
    ElMessage.error(e.message)
    return
  }
  await fetchData()
  refreshTimer = setInterval(fetchData, refreshSec * 1000)
  window.addEventListener('resize', resizeCharts)
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
    setTimeout(resizeCharts, 300)
  })
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearInterval(clockTimer)
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped>
.data-screen {
  min-height: 100vh;
  background: linear-gradient(160deg, #050d1a 0%, #0a1628 40%, #0d2137 100%);
  color: #e8f4ff;
  padding: 12px 16px 36px;
  box-sizing: border-box;
}

.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 16px;
  border-bottom: 1px solid rgba(64, 158, 255, 0.25);
}

.header-left h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #4fc3f7, #409eff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-left .sub {
  font-size: 12px;
  color: #6a8fb5;
}

.header-center {
  font-size: 18px;
  font-family: 'Consolas', monospace;
  color: #4fc3f7;
}

.header-right {
  display: flex;
  gap: 8px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
  margin: 16px 0;
}

.kpi-card {
  background: rgba(16, 42, 78, 0.75);
  border: 1px solid rgba(64, 158, 255, 0.2);
  border-radius: 8px;
  padding: 12px 8px;
  text-align: center;
}

.kpi-value {
  font-size: 20px;
  font-weight: 700;
  color: #4fc3f7;
}

.kpi-label {
  font-size: 11px;
  color: #8ab4d9;
  margin-top: 4px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.panel {
  background: rgba(10, 28, 52, 0.85);
  border: 1px solid rgba(64, 158, 255, 0.15);
  border-radius: 8px;
  padding: 10px 12px 8px;
  min-height: 260px;
  display: flex;
  flex-direction: column;
}

.panel-wide {
  grid-column: span 2;
}

.panel-title {
  font-size: 13px;
  color: #7eb8e8;
  margin-bottom: 6px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.chart-box {
  flex: 1;
  min-height: 220px;
}

.anomaly-list {
  margin-top: 4px;
  max-height: 60px;
  overflow-y: auto;
}

.anomaly-item {
  font-size: 11px;
  padding: 2px 6px;
  margin-top: 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
}

.anomaly-item.critical {
  color: #f56c6c;
}
.anomaly-item.warning {
  color: #e6a23c;
}

.screen-footer {
  text-align: center;
  font-size: 11px;
  color: #5a7a9a;
  margin-top: 12px;
}

@media (max-width: 1400px) {
  .kpi-row {
    grid-template-columns: repeat(4, 1fr);
  }
  .chart-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .panel-wide {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .kpi-row {
    grid-template-columns: repeat(2, 1fr);
  }
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .panel-wide {
    grid-column: span 1;
  }
  .screen-header {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
