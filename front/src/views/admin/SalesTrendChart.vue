<!-- 3.3 销售趋势图（日/周/月） -->
<template>
  <div class="sales-trend-chart">
    <div class="page-header">
      <h2>销售趋势图</h2>
      <p class="hint">按日 / 周 / 月展示销售额与销量走势（连续时间轴）</p>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="粒度">
          <el-radio-group v-model="filters.period" @change="fetchChart">
            <el-radio-button value="day">日趋势</el-radio-button>
            <el-radio-button value="week">周趋势</el-radio-button>
            <el-radio-button value="month">月趋势</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="filters.category"
            clearable
            placeholder="全部分类"
            style="width: 150px"
            @change="fetchChart"
          >
            <el-option label="全部分类" value="" />
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchChart">刷新</el-button>
          <el-button link type="primary" @click="$router.push('/admin/analytics/sales-trend')">
            趋势预测 →
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="summary-row" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">区间总销售额</div>
          <div class="summary-value primary">¥{{ (chartData.summary?.totalRevenue ?? 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">区间总销量</div>
          <div class="summary-value">{{ chartData.summary?.totalQuantity ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">均值销售额</div>
          <div class="summary-value">¥{{ (chartData.summary?.avgRevenue ?? 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">峰值</div>
          <div class="summary-value small">
            {{ chartData.summary?.peakLabel }} ¥{{ (chartData.summary?.peakRevenue ?? 0).toFixed(0) }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-loading="loading" class="chart-card">
      <div class="chart-head">
        <span class="section-title">{{ periodTitle }}销售趋势</span>
        <div class="legend">
          <span class="legend-item revenue"><i /> 销售额</span>
          <span class="legend-item quantity"><i /> 销量</span>
        </div>
      </div>

      <div v-if="!chartData.series?.length" class="empty-chart">暂无数据</div>
      <div v-else class="svg-chart" @mouseleave="hoverIndex = null">
        <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" preserveAspectRatio="xMidYMid meet">
          <!-- 网格线 -->
          <line
            v-for="(y, i) in gridY"
            :key="'g' + i"
            :x1="padL"
            :y1="y"
            :x2="svgWidth - padR"
            :y2="y"
            class="grid-line"
          />
          <!-- 销售额面积 -->
          <path :d="revenueAreaPath" class="area-revenue" />
          <!-- 销售额折线 -->
          <polyline :points="revenueLinePoints" class="line-revenue" />
          <!-- 销量折线 -->
          <polyline :points="quantityLinePoints" class="line-quantity" />
          <!-- 数据点 -->
          <circle
            v-for="(pt, i) in plotPoints"
            :key="i"
            :cx="pt.x"
            :cy="pt.yRev"
            r="4"
            class="dot-revenue"
            @mouseenter="hoverIndex = i"
          />
          <!-- Y轴刻度（销售额） -->
          <text
            v-for="(tick, i) in yTicks"
            :key="'yt' + i"
            :x="padL - 8"
            :y="tick.y + 4"
            class="axis-text"
            text-anchor="end"
          >{{ tick.label }}</text>
          <!-- X轴标签 -->
          <text
            v-for="(pt, i) in plotPoints"
            v-show="showXLabel(i)"
            :key="'xl' + i"
            :x="pt.x"
            :y="svgHeight - 8"
            class="axis-text"
            text-anchor="middle"
          >{{ chartData.labels[i] }}</text>
        </svg>
        <div
          v-if="hoverIndex !== null && plotPoints[hoverIndex]"
          class="tooltip"
          :style="tooltipStyle"
        >
          <div class="tip-title">{{ chartData.rawLabels?.[hoverIndex] || chartData.labels[hoverIndex] }}</div>
          <div>销售额：¥{{ chartData.series[hoverIndex].revenue.toFixed(2) }}</div>
          <div>销量：{{ chartData.series[hoverIndex].quantity }}</div>
          <div>订单：{{ chartData.series[hoverIndex].orderCount }}</div>
        </div>
      </div>
    </el-card>

    <el-card v-loading="loading" class="table-card">
      <div class="section-title">明细数据</div>
      <el-table :data="chartData.series || []" stripe border size="small" style="width: 100%">
        <el-table-column prop="label" label="时间" width="120" />
        <el-table-column prop="displayLabel" label="显示" width="100" />
        <el-table-column prop="revenue" label="销售额">
          <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="销量" width="90" />
        <el-table-column prop="orderCount" label="订单数" width="90" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const categories = ref([])
const chartData = ref({ series: [], labels: [], chart: {}, summary: {} })
const hoverIndex = ref(null)
const filters = reactive({ period: 'day', category: '' })

const svgWidth = 860
const svgHeight = 300
const padL = 56
const padR = 24
const padT = 20
const padB = 36
const chartW = svgWidth - padL - padR
const chartH = svgHeight - padT - padB

const periodTitle = computed(() => {
  const m = { day: '每日', week: '每周', month: '每月' }
  return m[filters.period] || ''
})

const maxRevenue = computed(() => {
  const arr = chartData.value.chart?.revenue || []
  return Math.max(...arr, 1)
})

const maxQuantity = computed(() => {
  const arr = chartData.value.chart?.quantity || []
  return Math.max(...arr, 1)
})

const plotPoints = computed(() => {
  const rev = chartData.value.chart?.revenue || []
  const qty = chartData.value.chart?.quantity || []
  const n = rev.length
  if (n === 0) return []
  const step = n > 1 ? chartW / (n - 1) : 0
  return rev.map((r, i) => ({
    x: padL + (n === 1 ? chartW / 2 : i * step),
    yRev: padT + chartH - (r / maxRevenue.value) * chartH,
    yQty: padT + chartH - ((qty[i] || 0) / maxQuantity.value) * chartH
  }))
})

const revenueLinePoints = computed(() =>
  plotPoints.value.map((p) => `${p.x},${p.yRev}`).join(' ')
)

const quantityLinePoints = computed(() =>
  plotPoints.value.map((p) => `${p.x},${p.yQty}`).join(' ')
)

const revenueAreaPath = computed(() => {
  const pts = plotPoints.value
  if (!pts.length) return ''
  const base = padT + chartH
  let d = `M ${pts[0].x} ${base} L ${pts[0].x} ${pts[0].yRev}`
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].yRev}`
  d += ` L ${pts[pts.length - 1].x} ${base} Z`
  return d
})

const gridY = computed(() => {
  const lines = 4
  return Array.from({ length: lines + 1 }, (_, i) => padT + (chartH / lines) * i)
})

const yTicks = computed(() => {
  const lines = 4
  return Array.from({ length: lines + 1 }, (_, i) => {
    const y = padT + (chartH / lines) * i
    const val = maxRevenue.value * (1 - i / lines)
    const label = val >= 10000 ? `${(val / 10000).toFixed(1)}万` : val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)
    return { y, label }
  })
})

const tooltipStyle = computed(() => {
  if (hoverIndex.value === null || !plotPoints.value[hoverIndex.value]) return {}
  const pt = plotPoints.value[hoverIndex.value]
  return {
    left: `${(pt.x / svgWidth) * 100}%`,
    top: '12px'
  }
})

const showXLabel = (i) => {
  const n = chartData.value.labels?.length || 0
  if (n <= 10) return true
  if (filters.period === 'day') return i % 5 === 0 || i === n - 1
  return i % 2 === 0 || i === n - 1
}

const fetchChart = async () => {
  loading.value = true
  hoverIndex.value = null
  try {
    const res = await request.get('/api/admin/analytics/sales-trend-chart', {
      params: {
        period: filters.period,
        category: filters.category || undefined
      }
    })
    if (res.success) {
      chartData.value = res.data
      categories.value = res.data.availableCategories || []
    }
  } catch {
    ElMessage.error('获取销售趋势图失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchChart)
</script>

<style scoped>
.sales-trend-chart {
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
.filter-card {
  margin-bottom: 16px;
}
.summary-row {
  margin-bottom: 16px;
}
.summary-card {
  text-align: center;
  margin-bottom: 12px;
}
.summary-label {
  font-size: 13px;
  color: #909399;
}
.summary-value {
  font-size: 20px;
  font-weight: 600;
  margin-top: 8px;
}
.summary-value.primary {
  color: #409eff;
}
.summary-value.small {
  font-size: 14px;
  font-weight: 500;
}
.chart-card {
  margin-bottom: 16px;
}
.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.section-title {
  font-weight: 600;
  font-size: 15px;
}
.legend {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #606266;
}
.legend-item i {
  display: inline-block;
  width: 12px;
  height: 3px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 2px;
}
.legend-item.revenue i {
  background: #409eff;
}
.legend-item.quantity i {
  background: #67c23a;
}
.svg-chart {
  position: relative;
  width: 100%;
  min-height: 280px;
}
.svg-chart svg {
  width: 100%;
  height: auto;
  display: block;
}
.grid-line {
  stroke: #ebeef5;
  stroke-width: 1;
}
.area-revenue {
  fill: url(#revGrad);
  fill: rgba(64, 158, 255, 0.12);
}
.line-revenue {
  fill: none;
  stroke: #409eff;
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.line-quantity {
  fill: none;
  stroke: #67c23a;
  stroke-width: 2;
  stroke-dasharray: 6 4;
  stroke-linejoin: round;
}
.dot-revenue {
  fill: #409eff;
  stroke: #fff;
  stroke-width: 2;
  cursor: pointer;
}
.dot-revenue:hover {
  r: 6;
}
.axis-text {
  font-size: 11px;
  fill: #909399;
}
.tooltip {
  position: absolute;
  transform: translateX(-50%);
  background: rgba(48, 49, 51, 0.92);
  color: #fff;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  line-height: 1.6;
  white-space: nowrap;
}
.tip-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.empty-chart {
  text-align: center;
  padding: 60px;
  color: #909399;
}
.table-card {
  margin-bottom: 16px;
}
</style>
