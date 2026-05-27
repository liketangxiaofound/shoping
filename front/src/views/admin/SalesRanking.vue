<!-- 3.3 商品销售排行榜 -->
<template>
  <div class="sales-ranking">
    <div class="page-header">
      <h2>商品销售排行榜</h2>
      <p class="hint">按销售额、销量、订单数排序，支持时间窗口与分类筛选</p>
    </div>

    <el-card class="filter-card">
      <el-form :inline="true">
        <el-form-item label="时间范围">
          <el-select v-model="filters.windowDays" style="width: 130px" @change="fetchRanking">
            <el-option label="近7天" value="7" />
            <el-option label="近30天" value="30" />
            <el-option label="近60天" value="60" />
            <el-option label="近90天" value="90" />
            <el-option label="全部" value="all" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" clearable placeholder="全部分类" style="width: 140px" @change="fetchRanking">
            <el-option label="全部分类" value="" />
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序">
          <el-radio-group v-model="filters.sortBy" @change="fetchRanking">
            <el-radio-button value="revenue">销售额</el-radio-button>
            <el-radio-button value="quantity">销量</el-radio-button>
            <el-radio-button value="orderCount">订单数</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="TOP">
          <el-input-number v-model="filters.limit" :min="5" :max="50" @change="fetchRanking" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="fetchRanking">刷新</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-row :gutter="16" class="summary-row" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">总销售额</div>
          <div class="summary-value">¥{{ (data.summary?.totalRevenue ?? 0).toFixed(2) }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">总销量</div>
          <div class="summary-value">{{ data.summary?.totalQuantity ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card">
          <div class="summary-label">涉及订单</div>
          <div class="summary-value">{{ data.summary?.totalOrders ?? 0 }}</div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card shadow="hover" class="summary-card champion">
          <div class="summary-label">销冠商品</div>
          <div class="summary-value small">{{ data.summary?.topProduct?.productName || '—' }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" class="rank-tabs">
      <el-tab-pane label="商品排行" name="product">
        <el-card v-loading="loading">
          <el-table :data="data.productRanking || []" stripe border style="width: 100%">
            <el-table-column label="排名" width="72" align="center">
              <template #default="{ row }">
                <span v-if="row.rank <= 3" class="rank-medal" :class="`rank-${row.rank}`">{{ row.rank }}</span>
                <span v-else>{{ row.rank }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="productName" label="商品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="category" label="分类" width="100" />
            <el-table-column prop="sellerName" label="卖家" width="110" />
            <el-table-column prop="revenue" label="销售额" width="120" sortable>
              <template #default="{ row }">
                <span class="highlight">¥{{ row.revenue.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="销量" width="80" align="center" />
            <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
            <el-table-column prop="stock" label="库存" width="72" align="center" />
            <el-table-column label="占比" width="100">
              <template #default="{ row }">
                <el-progress
                  :percentage="revenuePercent(row.revenue)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="pct-text">{{ revenuePercent(row.revenue) }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="分类排行" name="category">
        <el-card v-loading="loading">
          <el-table :data="data.categoryRanking || []" stripe border style="width: 100%">
            <el-table-column label="排名" width="72" align="center">
              <template #default="{ row }">
                <span v-if="row.rank <= 3" class="rank-medal" :class="`rank-${row.rank}`">{{ row.rank }}</span>
                <span v-else>{{ row.rank }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分类" min-width="120" />
            <el-table-column prop="revenue" label="销售额" width="130">
              <template #default="{ row }">¥{{ row.revenue.toFixed(2) }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="销量" width="90" align="center" />
            <el-table-column prop="orderCount" label="订单数" width="90" align="center" />
            <el-table-column prop="productCount" label="商品数" width="90" align="center" />
            <el-table-column label="占比" min-width="120">
              <template #default="{ row }">
                <el-progress
                  :percentage="revenuePercent(row.revenue)"
                  :stroke-width="8"
                  :show-text="false"
                />
                <span class="pct-text">{{ revenuePercent(row.revenue) }}%</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const loading = ref(false)
const activeTab = ref('product')
const categories = ref([])
const data = ref({ summary: {}, productRanking: [], categoryRanking: [] })
const filters = reactive({
  windowDays: '30',
  category: '',
  sortBy: 'revenue',
  limit: 20
})

const revenuePercent = (revenue) => {
  const total = data.value.summary?.totalRevenue || 0
  if (total <= 0) return 0
  return Math.min(100, Math.round((revenue / total) * 1000) / 10)
}

const fetchRanking = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/admin/analytics/sales-ranking', {
      params: {
        windowDays: filters.windowDays,
        category: filters.category || undefined,
        sortBy: filters.sortBy,
        limit: filters.limit
      }
    })
    if (res.success) {
      data.value = res.data
      categories.value = res.data.availableCategories || []
    }
  } catch {
    ElMessage.error('获取销售排行榜失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchRanking)
</script>

<style scoped>
.sales-ranking {
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
.summary-card.champion {
  background: linear-gradient(135deg, #fff9e6, #fff);
}
.summary-label {
  font-size: 13px;
  color: #909399;
}
.summary-value {
  font-size: 22px;
  font-weight: 600;
  margin-top: 8px;
  color: #303133;
}
.summary-value.small {
  font-size: 15px;
  font-weight: 500;
}
.rank-tabs {
  margin-top: 8px;
}
.rank-medal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-weight: 700;
  color: #fff;
  font-size: 13px;
}
.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb800);
}
.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
}
.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}
.highlight {
  color: #e6a23c;
  font-weight: 600;
}
.pct-text {
  font-size: 12px;
  color: #909399;
  margin-left: 6px;
}
</style>
