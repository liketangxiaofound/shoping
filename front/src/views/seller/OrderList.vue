<!-- src/views/seller/OrderList.vue -->
<template>
  <div class="seller-order-list">
    <div class="page-header">
      <h2>订单管理</h2>
    </div>

    <el-card class="search-card">
      <div class="search-form">
        <el-select v-model="searchParams.status" placeholder="订单状态" clearable>
          <el-option label="全部" value="" />
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
          value-format="yyyy-MM-dd"
        />

        <el-button type="primary" @click="fetchOrders">筛选</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </el-card>

    <el-card>
      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column prop="user.username" label="买家" width="140" />
        <el-table-column label="订单金额" width="120">
          <template #default="{ row }">¥{{ getTotal(row).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="下单时间" width="180" />
        <el-table-column label="商品明细" min-width="260">
          <template #default="{ row }">
            <div v-for="item in row.orderItems" :key="item.id" class="order-item-row">
              <strong>{{ item.product?.name }}</strong> x{{ item.quantity }} ¥{{ item.price.toFixed(2) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'paid'"
              type="primary"
              size="small"
              @click="handleShip(row)"
            >
              发货
            </el-button>
            <span v-else-if="row.trackingNumber" class="tracking-no">单号: {{ row.trackingNumber }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
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
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const orders = ref([])
const loading = ref(false)
const pagination = ref({ page: 1, limit: 10, total: 0 })
const searchParams = ref({ status: '', dateRange: [] })

const statusTextMap = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  delivered: '已收货',
  cancelled: '已取消'
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      status: searchParams.value.status || undefined,
      startDate: searchParams.value.dateRange[0] || undefined,
      endDate: searchParams.value.dateRange[1] || undefined
    }
    const response = await request.get('/api/seller/orders', { params })
    if (response.success) {
      orders.value = response.data.orders || []
      pagination.value.total = response.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取卖家订单失败:', error)
    ElMessage.error('获取订单失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  searchParams.value = { status: '', dateRange: [] }
  pagination.value.page = 1
  fetchOrders()
}

const handlePageChange = (page) => {
  pagination.value.page = page
  fetchOrders()
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  fetchOrders()
}

const getStatusText = (status) => statusTextMap[status] || '未知'
const getStatusTag = (status) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'paid': return 'primary'
    case 'shipped': return 'info'
    case 'delivered': return 'success'
    case 'cancelled': return 'danger'
    default: return 'info'
  }
}

const getTotal = (order) => {
  return order.orderItems?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
}

const handleShip = async (order) => {
  try {
    const { value: trackingNumber } = await ElMessageBox.prompt(
      '可填写物流运单号（选填）',
      `确认发货：${order.orderNo}`,
      {
        confirmButtonText: '确认发货',
        cancelButtonText: '取消',
        inputPlaceholder: '运单号（选填）'
      }
    )

    const response = await request.put(`/api/seller/orders/${order.id}/ship`, {
      trackingNumber: trackingNumber?.trim() || undefined
    })

    if (response.success) {
      ElMessage.success('发货成功')
      fetchOrders()
    } else {
      ElMessage.error(response.message || '发货失败')
    }
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      ElMessage.error(error?.response?.data?.message || error?.message || '发货失败')
    }
  }
}

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.seller-order-list {
  padding: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.search-card {
  margin-bottom: 20px;
}
.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.order-item-row {
  margin-bottom: 4px;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.tracking-no {
  font-size: 12px;
  color: #606266;
}

.text-muted {
  color: #c0c4cc;
}
</style>
