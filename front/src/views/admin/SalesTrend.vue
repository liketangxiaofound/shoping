<!-- 3.3 商品销售趋势预测与评估 -->
<template>
  <div class="sales-trend">
    <div class="page-header">
      <h2>销售趋势预测</h2>
      <p class="hint">基于历史购买记录的一元线性回归预测（日/周/月）</p>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="周期">
          <el-radio-group v-model="filters.period" @change="fetchTrend">
            <el-radio-button value="day">日</el-radio-button>
            <el-radio-button value="week">周</el-radio-button>
            <el-radio-button value="month">月</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" clearable placeholder="全部分类" style="width: 160px" @change="fetchTrend">
            <el-option label="全部分类" value="" />
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="预测期数">
          <el-input-number v-model="filters.forecastPeriods" :min="3" :max="14" @change="fetchTrend" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchTrend">刷新</el-button>
          <el-button link type="primary" @click="$router.push('/admin/analytics/sales-trend-chart')">
            趋势图 →
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" v-loading="loading">
      <el-col :xs="24" :md="8">
        <el-card class="eval-card">
          <div class="eval-title">趋势评估</div>
          <el-tag :type="trendTagType" size="large">{{ trendLabel }}</el-tag>
          <p class="eval-summary">{{ trendData.evaluation?.summary || '—' }}</p>
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="增长率">{{ trendData.evaluation?.growthRate ?? 0 }}%</el-descriptions-item>
            <el-descriptions-item label="回测 MAPE">{{ trendData.evaluation?.mape ?? 0 }}%</el-descriptions-item>
            <el-descriptions-item label="预测精度">{{ trendData.evaluation?.accuracy || '—' }}</el-descriptions-item>
            <el-descriptions-item label="模型">{{ trendData.evaluation?.model || '—' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="16">
        <el-card>
          <div class="section-title">销售额趋势图</div>
          <div class="chart-wrap">
            <div
              v-for="bar in chartBars"
              :key="bar.label"
              class="bar-col"
              :title="`${bar.label}: ¥${bar.revenue}`"
            >
              <div
                class="bar"
                :class="{ forecast: bar.isForecast }"
                :style="{ height: bar.height + '%' }"
              />
              <span class="bar-label">{{ bar.shortLabel }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="tables-row">
      <el-col :xs="24" :md="12">
        <el-card v-loading="loading">
          <div class="section-title">历史销售</div>
          <el-table :data="trendData.historical || []" stripe border size="small" style="width: 100%">
            <el-table-column prop="label" label="周期" width="110" />
            <el-table-column prop="revenue" label="销售额">
              <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="销量" width="80" />
            <el-table-column prop="orderCount" label="订单数" width="80" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card v-loading="loading">
          <div class="section-title">预测销售</div>
          <el-table :data="trendData.forecast || []" stripe border size="small" style="width: 100%">
            <el-table-column prop="label" label="周期" width="110" />
            <el-table-column prop="revenue" label="预测额">
              <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="区间" min-width="140">
              <template #default="{ row }">
                ¥{{ row.revenueLow.toFixed(0) }} ~ ¥{{ row.revenueHigh.toFixed(0) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const categories = ref([])
const trendData = ref({ historical: [], forecast: [], evaluation: {} })
const filters = reactive({
  period: 'day',
  category: '',
  forecastPeriods: 7
})

const trendLabel = computed(() => {
  const t = trendData.value.evaluation?.trend
  return { up: '上升趋势', down: '下降趋势', stable: '平稳趋势' }[t] || '—'
})

const trendTagType = computed(() => {
  const t = trendData.value.evaluation?.trend
  return { up: 'danger', down: 'success', stable: 'info' }[t] || ''
})

const chartBars = computed(() => {
  const hist = (trendData.value.historical || []).map((h) => ({ ...h, isForecast: false }))
  const fore = (trendData.value.forecast || []).map((f) => ({ ...f, isForecast: true }))
  const all = [...hist, ...fore].slice(-20)
  const max = Math.max(...all.map((b) => b.revenue), 1)
  return all.map((b) => ({
    ...b,
    height: Math.max(8, (b.revenue / max) * 100),
    shortLabel: b.label.length > 8 ? b.label.slice(5) : b.label
  }))
})

const fetchTrend = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/admin/analytics/sales-trend', {
      params: {
        period: filters.period,
        category: filters.category || undefined,
        forecastPeriods: filters.forecastPeriods
      }
    })
    if (res.success) {
      trendData.value = res.data
      categories.value = res.data.availableCategories || []
    }
  } catch {
    ElMessage.error('获取销售趋势失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchTrend)
</script>

<style scoped>
.sales-trend {
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
.eval-card .eval-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.eval-summary {
  margin: 12px 0;
  color: #606266;
  font-size: 14px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.chart-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 220px;
  padding: 8px 0;
  overflow-x: auto;
}
.bar-col {
  flex: 1;
  min-width: 28px;
  max-width: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.bar {
  width: 100%;
  background: linear-gradient(180deg, #409eff, #79bbff);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  transition: height 0.3s;
}
.bar.forecast {
  background: linear-gradient(180deg, #e6a23c, #f3d19e);
}
.bar-label {
  font-size: 10px;
  color: #909399;
  margin-top: 4px;
  transform: rotate(-35deg);
  white-space: nowrap;
}
.tables-row {
  margin-top: 16px;
}
</style>
