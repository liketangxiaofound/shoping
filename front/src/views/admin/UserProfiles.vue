<!-- 3.3 用户画像：地域、购买力、偏好分类 -->
<template>
  <div class="user-profiles">
    <div class="page-header">
      <h2>用户画像</h2>
      <p class="hint">基于 3.2 采集数据：地域分布、购买力分级、偏好分类</p>
    </div>

    <div class="overview-cards" v-loading="overviewLoading">
      <el-card class="stat-card">
        <div class="stat-value">{{ overview.totalUsers ?? 0 }}</div>
        <div class="stat-label">分析用户数</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ overview.regionDistribution?.length ?? 0 }}</div>
        <div class="stat-label">覆盖地域数</div>
      </el-card>
      <el-card class="stat-card">
        <div class="stat-value">{{ overview.categoryPreferenceTop?.length ?? 0 }}</div>
        <div class="stat-label">活跃商品类别</div>
      </el-card>
    </div>

    <el-row :gutter="20" class="charts-row">
      <el-col :xs="24" :md="12">
        <el-card v-loading="overviewLoading">
          <div class="section-title">地域分布</div>
          <el-table :data="overview.regionDistribution || []" stripe border size="small" style="width: 100%">
            <el-table-column prop="region" label="地域" />
            <el-table-column prop="count" label="用户数" width="100" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="12">
        <el-card v-loading="overviewLoading">
          <div class="section-title">购买力分布</div>
          <el-table :data="overview.purchasingPowerDistribution || []" stripe border size="small" style="width: 100%">
            <el-table-column prop="label" label="购买力等级" />
            <el-table-column prop="count" label="用户数" width="100" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section" v-loading="overviewLoading">
      <div class="section-title">全站偏好分类 TOP</div>
      <el-table :data="overview.categoryPreferenceTop || []" stripe border style="width: 100%">
        <el-table-column prop="category" label="分类" />
        <el-table-column prop="userCount" label="涉及用户数" width="120" />
        <el-table-column prop="totalScore" label="偏好得分" width="120">
          <template #default="{ row }">{{ row.totalScore.toFixed(2) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="section">
      <div class="section-title">用户画像明细</div>
      <el-table :data="profiles" v-loading="listLoading" stripe border style="width: 100%">
        <el-table-column prop="userId" label="ID" width="70" align="center" />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="region" label="地域" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ row.region }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="purchasingPowerLabel" label="购买力" width="110">
          <template #default="{ row }">
            <el-tag :type="powerTagType(row.purchasingPower)" size="small">{{ row.purchasingPowerLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalSpend" label="累计消费" width="110">
          <template #default="{ row }">¥{{ row.totalSpend.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="topCategory" label="偏好分类" min-width="100" />
        <el-table-column label="偏好 TOP3" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="c in row.preferredCategories.slice(0, 3)"
              :key="c.category"
              size="small"
              class="cat-tag"
            >
              {{ c.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @current-change="fetchProfiles"
          @size-change="fetchProfiles"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="用户画像详情" size="480px">
      <template v-if="currentProfile">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户">{{ currentProfile.username }} (ID {{ currentProfile.userId }})</el-descriptions-item>
          <el-descriptions-item label="地域">{{ currentProfile.region }}（{{ currentProfile.regionSource }}）</el-descriptions-item>
          <el-descriptions-item label="购买力">{{ currentProfile.purchasingPowerLabel }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ currentProfile.totalSpend.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="订单数">{{ currentProfile.orderCount }}（已支付 {{ currentProfile.paidOrderCount }}）</el-descriptions-item>
          <el-descriptions-item label="客单价">¥{{ currentProfile.avgOrderValue.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="浏览次数">{{ currentProfile.browseCount }} 次 / {{ currentProfile.totalBrowseSeconds }} 秒</el-descriptions-item>
        </el-descriptions>
        <h4 class="drawer-subtitle">偏好分类（浏览+购买加权）</h4>
        <el-table :data="currentProfile.preferredCategories" size="small" border>
          <el-table-column prop="category" label="分类" />
          <el-table-column prop="score" label="得分" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const overview = ref({})
const profiles = ref([])
const overviewLoading = ref(false)
const listLoading = ref(false)
const drawerVisible = ref(false)
const currentProfile = ref(null)
const pagination = reactive({ page: 1, limit: 20, total: 0 })

const powerTagType = (level) => {
  const map = { high: 'danger', medium: 'warning', low: 'info', none: '' }
  return map[level] || ''
}

const fetchOverview = async () => {
  overviewLoading.value = true
  try {
    const res = await request.get('/api/admin/analytics/user-profiles/overview')
    if (res.success) overview.value = res.data
  } catch {
    ElMessage.error('获取画像总览失败')
  } finally {
    overviewLoading.value = false
  }
}

const fetchProfiles = async () => {
  listLoading.value = true
  try {
    const res = await request.get('/api/admin/analytics/user-profiles', {
      params: { page: pagination.page, limit: pagination.limit, role: 'customer' }
    })
    if (res.success) {
      profiles.value = res.data.profiles || []
      Object.assign(pagination, res.data.pagination)
    }
  } catch {
    ElMessage.error('获取用户画像列表失败')
  } finally {
    listLoading.value = false
  }
}

const openDetail = async (row) => {
  try {
    const res = await request.get(`/api/admin/analytics/user-profiles/${row.userId}`)
    if (res.success) {
      currentProfile.value = res.data
      drawerVisible.value = true
    }
  } catch {
    ElMessage.error('获取详情失败')
  }
}

onMounted(() => {
  fetchOverview()
  fetchProfiles()
})
</script>

<style scoped>
.user-profiles {
  text-align: left;
}
.page-header {
  margin-bottom: 20px;
}
.hint {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.stat-card {
  text-align: center;
}
.stat-value {
  font-size: 26px;
  font-weight: bold;
  color: #409eff;
}
.stat-label {
  color: #666;
  margin-top: 8px;
  font-size: 13px;
}
.charts-row {
  margin-bottom: 20px;
}
.section {
  margin-bottom: 20px;
}
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
.cat-tag {
  margin-right: 6px;
  margin-bottom: 4px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.drawer-subtitle {
  margin: 20px 0 10px;
  font-size: 14px;
}
</style>
