<!-- src/views/admin/OrderList.vue -->
<template>
  <div class="order-management">
    <div class="page-header">
      <h2 class="page-title">订单管理</h2>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <div class="filter-form">
        <el-input
          v-model="searchParams.orderNo"
          placeholder="订单号"
          style="width: 200px"
          clearable
        />
        
        <el-select v-model="searchParams.status" placeholder="订单状态" clearable>
          <el-option label="待支付" value="pending" />
          <el-option label="已支付" value="paid" />
          <el-option label="已发货" value="shipped" />
          <el-option label="已收货" value="delivered" />
          <el-option label="已取消" value="cancelled" />
        </el-select>
        
        <el-date-picker
          v-model="searchParams.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
        
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </el-card>

    <!-- 订单表格 -->
    <el-card>
      <el-table :data="orders" v-loading="loading">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="user.username" label="用户" width="120" />
        <el-table-column label="金额" width="100">
          <template #default="{ row }">¥{{ row.totalPrice.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="viewOrderDetail(row.id)">查看</el-button>
            <el-button 
              v-if="row.status === 'paid'" 
              type="primary" 
              size="small"
              @click="handleShip(row)"
            >
              发货
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

const orders = ref([])
const loading = ref(false)
const searchParams = ref({
  orderNo: '',
  status: '',
  dateRange: []
})

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0
})

// 状态映射
const statusTextMap = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已收货',
  cancelled: '已取消'
}

const statusTagTypeMap = {
  pending: 'warning',
  paid: 'primary',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'danger'
}

const getStatusText = (status) => statusTextMap[status] || '未知'
const getStatusTagType = (status) => statusTagTypeMap[status] || 'info'

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...searchParams.value
    }
    
    // 处理日期范围
    if (searchParams.value.dateRange && searchParams.value.dateRange.length === 2) {
      params.startDate = searchParams.value.dateRange[0]
      params.endDate = searchParams.value.dateRange[1]
    }

    const response = await request.get('/api/admin/orders', { params })
    if (response.success) {
      orders.value = response.data.orders || []
      pagination.value.total = response.data.total || 0
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  fetchOrders()
}

// 重置
const handleReset = () => {
  searchParams.value = {
    orderNo: '',
    status: '',
    dateRange: []
  }
  pagination.value.page = 1
  fetchOrders()
}

// 分页
const handlePageChange = (page) => {
  pagination.value.page = page
  fetchOrders()
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  fetchOrders()
}

// 查看订单详情
const viewOrderDetail = (orderId) => {
  router.push(`/orders/${orderId}`)
}

// 发货
const handleShip = async (order) => {
  try {
    const { value: trackingNumber } = await ElMessageBox.prompt(
      '请输入运单号',
      '发货确认',
      {
        confirmButtonText: '确认发货',
        cancelButtonText: '取消',
        inputPattern: /\S+/,
        inputErrorMessage: '请输入运单号'
      }
    )

    const response = await request.put(`/api/admin/orders/${order.id}/ship`, {
      trackingNumber
    })
    
    if (response.success) {
      ElMessage.success('发货成功')
      fetchOrders()
    }
  } catch (error) {
    // 用户取消
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.order-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>