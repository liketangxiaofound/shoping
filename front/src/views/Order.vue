<template>
  <div class="orders-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <!-- 返回首页图标 - 移动到右上角 -->
      <div class="header-right">
        <el-tooltip content="返回首页" placement="bottom">
          <router-link to="/home" class="nav-link">
            <el-icon><House /></el-icon>
          </router-link>     
        </el-tooltip>
      </div>
      
      <h2 class="page-title">我的订单</h2>
    </div>

    <!-- 状态筛选 -->
    <div class="status-filter">
      <el-radio-group v-model="activeStatus" @change="handleStatusChange" size="large">
        <el-radio-button label="all">全部订单</el-radio-button>
        <el-radio-button label="pending">待支付</el-radio-button>
        <el-radio-button label="paid">已支付</el-radio-button>
        <el-radio-button label="shipped">已发货</el-radio-button>
        <el-radio-button label="delivered">已收货</el-radio-button>
        <el-radio-button label="cancelled">已取消</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-list">
        <div v-for="i in 3" :key="i" class="skeleton-card">
          <el-skeleton animated>
            <template #template>
              <div class="skeleton-header">
                <el-skeleton-item variant="h3" style="width: 200px" />
                <el-skeleton-item variant="text" style="width: 100px" />
              </div>
              <div class="skeleton-content">
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                  <el-skeleton-item variant="image" style="width: 80px; height: 80px; margin-right: 20px;" />
                  <div style="flex: 1;">
                    <el-skeleton-item variant="h3" style="width: 60%; margin-bottom: 10px" />
                    <el-skeleton-item variant="text" style="width: 40%" />
                  </div>
                </div>
              </div>
              <div class="skeleton-footer">
                <el-skeleton-item variant="text" style="width: 100px" />
                <el-skeleton-item variant="button" style="width: 80px; height: 32px" />
              </div>
            </template>
          </el-skeleton>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="orders.length === 0" class="empty-state">
      <el-empty description="暂无订单" :image-size="200">
        <template #description>
          <p>还没有任何订单，去选购商品吧！</p>
        </template>
        <template #default>
          <el-button type="primary" @click="goShopping">去购物</el-button>
        </template>
      </el-empty>
    </div>

    <!-- 订单列表 -->
    <div v-else class="orders-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <!-- 订单头部信息 - 修复：确保显示正确的订单号 -->
        <div class="order-header">
          <div class="order-info">
            <span class="order-no">订单号: {{ getOrderNo(order) }}</span>
            <span class="order-time">下单时间: {{ formatDate(order.createdAt) }}</span>
          </div>
          <div class="order-status">
            <el-tag :type="getStatusTagType(order.status)" size="large">
              {{ getStatusText(order.status) }}
            </el-tag>
            <span class="total-amount">¥{{ getTotalPrice(order).toFixed(2) }}</span>
          </div>
        </div>

        <!-- 订单商品列表 - 修复：确保正确显示商品信息 -->
        <div class="order-items">
          <div v-for="item in getOrderItems(order)" :key="item.id" class="order-item">
            <img 
              :src="getProductImage(item.product)" 
              :alt="getProductName(item.product)"
              class="product-image"
              @error="handleImageError"
            />
            <div class="product-info">
              <h4 class="product-name">{{ getProductName(item.product) }}</h4>
              <p class="product-price">¥{{ getItemPrice(item).toFixed(2) }} × {{ getItemQuantity(item) }}</p>
            </div>
            <div class="item-total">¥{{ getItemTotal(item).toFixed(2) }}</div>
          </div>
        </div>

        <!-- 订单操作 -->
        <div class="order-actions">
          <div class="actions-left">
            <span class="item-count">共 {{ getItemCount(order) }} 件商品</span>
            <span class="subtotal-amount">商品总额: ¥{{ getSubtotal(order).toFixed(2) }}</span>
          </div>
          <div class="actions-right">
            <el-button 
              v-if="order.status === 'pending'" 
              type="primary" 
              @click="goToPayment(order.id)"
              :loading="loadingPayment === order.id"
            >
              去支付
            </el-button>
            <el-button 
              v-if="order.status === 'pending'" 
              @click="cancelOrder(order)"
              :loading="cancellingOrderId === order.id"
              :disabled="loadingPayment === order.id"
            >
              取消订单
            </el-button>
            <el-button 
              v-if="order.status === 'shipped'" 
              type="success" 
              @click="confirmReceipt(order.id)"
              :loading="confirmingOrderId === order.id"
            >
              确认收货
            </el-button>
            <el-button 
              @click="viewOrderDetail(order.id)"
              :disabled="loadingPayment === order.id || cancellingOrderId === order.id"
            >
              查看详情
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.limit" class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.limit"
        :total="pagination.total"
        :page-sizes="[5, 10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { House } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const orders = ref([])
const loading = ref(false)
const loadingPayment = ref(null)
const cancellingOrderId = ref(null)
const confirmingOrderId = ref(null)
const activeStatus = ref('all')

// 分页数据
const pagination = ref({
  page: 1,
  limit: 10,
  total: 0
})

// 计算属性
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

// 方法
const getStatusText = (status) => {
  return statusTextMap[status] || '未知状态'
}

const getStatusTagType = (status) => {
  return statusTagTypeMap[status] || 'info'
}

// 安全地获取商品信息
const getProductImage = (product) => {
  if (!product) return 'https://via.placeholder.com/80x80/f0f0f0/969696?text=商品图片'
  return product.imageUrl || product.image || 'https://via.placeholder.com/80x80/f0f0f0/969696?text=商品图片'
}

const getProductName = (product) => {
  if (!product) return '商品已下架'
  return product.name || '商品已下架'
}

// 安全地获取订单信息
const getOrderNo = (order) => {
  if (!order) return ''
  return order.orderNo || 'ORD' + (order.id || '')
}

const getTotalPrice = (order) => {
  if (!order) return 0
  return order.totalPrice || 0
}

const getOrderItems = (order) => {
  if (!order || !order.orderItems) return []
  return order.orderItems
}

const getItemPrice = (item) => {
  if (!item) return 0
  return item.price || 0
}

const getItemQuantity = (item) => {
  if (!item) return 0
  return item.quantity || 0
}

const getItemTotal = (item) => {
  if (!item) return 0
  return (item.price || 0) * (item.quantity || 0)
}

const getItemCount = (order) => {
  if (!order || !order.orderItems) return 0
  return order.orderItems.length || 0
}

const getSubtotal = (order) => {
  if (!order || !order.orderItems) return 0
  return order.orderItems.reduce((sum, item) => {
    return sum + ((item.price || 0) * (item.quantity || 0))
  }, 0)
}

const handleImageError = (event) => {
  event.target.src = 'https://via.placeholder.com/80x80/f0f0f0/969696?text=图片加载失败'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    // 如果选择了特定状态，添加到查询参数
    if (activeStatus.value !== 'all') {
      params.status = activeStatus.value
    }
    
    console.log('🔄 获取订单列表，参数:', params)
    
    const response = await request.get('/api/orders', { params })
    
    if (response.success) {
      orders.value = response.data.orders || []
      pagination.value.total = response.data.pagination?.total || 0
      console.log(`✅ 获取订单成功，共 ${orders.value.length} 条订单`)
      
      // 调试：检查订单数据结构
      if (orders.value.length > 0) {
        const sampleOrder = orders.value[0]
        console.log('🔍 订单数据结构:', {
          orderNo: sampleOrder.orderNo,
          totalPrice: sampleOrder.totalPrice,
          orderItemsCount: sampleOrder.orderItems?.length,
          orderItems: sampleOrder.orderItems?.map(item => ({
            productName: item.product?.name,
            price: item.price,
            quantity: item.quantity
          }))
        })
      }
    } else {
      ElMessage.error(response.message || '获取订单列表失败')
    }
  } catch (error) {
    console.error('获取订单列表错误:', error)
    
    if (error.response?.status === 401) {
      ElMessage.warning('请先登录')
      router.push('/login')
    } else {
      ElMessage.error('获取订单列表失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 状态筛选变化
const handleStatusChange = () => {
  pagination.value.page = 1
  fetchOrders()
}

// 分页变化
const handlePageChange = (page) => {
  console.log('页面变化:', page)
  pagination.value.page = page
  fetchOrders()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleSizeChange = (size) => {
  console.log('每页数量变化:', size)
  pagination.value.page = 1
  pagination.value.limit = size
  fetchOrders()
}

// 去支付
const goToPayment = async (orderId) => {
  loadingPayment.value = orderId
  try {
    router.push(`/order/${orderId}/pay`)
  } catch (error) {
    console.error('跳转支付页面失败:', error)
  } finally {
    loadingPayment.value = null
  }
}

// 查看订单详情
const viewOrderDetail = (orderId) => {
  router.push(`/orders/${orderId}`)
}

// 取消订单
const cancelOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消订单 ${getOrderNo(order)} 吗？`,
      '取消订单',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '再想想',
        type: 'warning',
        beforeClose: async (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            try {
              const response = await request.put(`/api/orders/${order.id}/cancel`, {
                reason: '用户取消'
              })
              
              if (response.success) {
                ElMessage.success('订单已取消')
                // 重新加载订单列表
                fetchOrders()
              } else {
                ElMessage.error(response.message || '取消订单失败')
              }
            } catch (error) {
              console.error('取消订单错误:', error)
              ElMessage.error('取消订单失败，请重试')
            } finally {
              instance.confirmButtonLoading = false
              done()
            }
          } else {
            done()
          }
        }
      }
    )
  } catch (error) {
    // 用户取消操作
    console.log('用户取消了订单取消操作')
  }
}

// 确认收货
const confirmReceipt = async (orderId) => {
  confirmingOrderId.value = orderId
  try {
    await ElMessageBox.confirm(
      '确认收到商品后，订单将完成。请确认您已收到商品且商品完好。',
      '确认收货',
      {
        confirmButtonText: '确认收货',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    // 注意：这里需要调用你的确认收货接口
    // 假设接口是 PUT /api/orders/:id/confirm-receipt
    const response = await request.put(`/api/orders/${orderId}/confirm-receipt`)
    
    if (response.success) {
      ElMessage.success('确认收货成功')
      // 重新加载订单列表
      fetchOrders()
    } else {
      ElMessage.error(response.message || '确认收货失败')
    }
  } catch (error) {
    // 用户取消操作
    console.log('用户取消了确认收货操作')
  } finally {
    confirmingOrderId.value = null
  }
}

// 去购物
const goShopping = () => {
  router.push('/')
}

// 监听分页变化
watch(
  () => [pagination.value.page, pagination.value.limit],
  () => {
    fetchOrders()
  },
  { immediate: false }
)

// 监听状态变化
watch(activeStatus, () => {
  pagination.value.page = 1
  fetchOrders()
})

// 生命周期
onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.orders-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 60px);
  background-color: #f5f5f5;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
  position: relative;
  padding: 0 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex: 1;
}

.header-right {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

/* 导航链接样式 */
.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: #666;
  text-decoration: none;
  border-radius: 50%;
  transition: all 0.2s;
  background-color: #f0f0f0;
  border: 1px solid #e0e0e0;
}

.nav-link:hover {
  background-color: #409eff;
  color: white;
  border-color: #409eff;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.nav-link .el-icon {
  font-size: 20px;
}

.status-filter {
  margin-bottom: 30px;
  overflow-x: auto;
  padding-bottom: 10px;
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-filter .el-radio-group {
  white-space: nowrap;
  flex-wrap: nowrap;
  width: 100%;
  justify-content: space-between;
}

.status-filter .el-radio-button {
  flex: 1;
  text-align: center;
  min-width: 100px;
}

.status-filter .el-radio-button__inner {
  width: 100%;
}

.loading-container {
  padding: 30px 0;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.skeleton-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.skeleton-content {
  margin-bottom: 20px;
}

.skeleton-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.empty-state {
  background: white;
  padding: 60px 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-top: 30px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
}

.order-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: box-shadow 0.3s ease;
  border: 1px solid #e8e8e8;
}

.order-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.order-time {
  font-size: 14px;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.order-status {
  display: flex;
  align-items: center;
  gap: 20px;
}

.total-amount {
  font-size: 20px;
  font-weight: bold;
  color: #e1251b;
  min-width: 100px;
  text-align: right;
  background: #fff5f5;
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #e1251b;
}

.order-items {
  margin-bottom: 20px;
  background: #fafafa;
  border-radius: 6px;
  padding: 15px;
}

.order-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.order-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.product-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  object-fit: cover;
  margin-right: 15px;
  background: white;
  border: 1px solid #e8e8e8;
  padding: 2px;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-name {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.product-price {
  margin: 0;
  font-size: 13px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
}

.item-total {
  min-width: 100px;
  text-align: right;
  font-weight: 600;
  color: #e1251b;
  font-size: 16px;
  background: white;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ffe7e7;
}

.order-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  flex-wrap: wrap;
  gap: 15px;
}

.actions-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.item-count {
  font-size: 14px;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.subtotal-amount {
  font-size: 14px;
  color: #e1251b;
  font-weight: 500;
  background: #fff5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.actions-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions-right .el-button {
  min-width: 100px;
  transition: all 0.3s;
}

.actions-right .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .orders-page {
    padding: 15px;
  }
  
  .page-header {
    margin-bottom: 20px;
  }
  
  .order-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .order-status {
    width: 100%;
    justify-content: space-between;
    margin-top: 10px;
  }
  
  .total-amount {
    min-width: auto;
  }
  
  .order-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .actions-left {
    justify-content: center;
    width: 100%;
    margin-bottom: 10px;
  }
  
  .actions-right {
    width: 100%;
    justify-content: center;
  }
  
  .order-item {
    flex-wrap: wrap;
  }
  
  .product-info {
    flex: 1 1 200px;
  }
  
  .item-total {
    flex: 1;
    text-align: center;
    margin-top: 10px;
  }
  
  .status-filter .el-radio-group {
    flex-wrap: wrap;
  }
  
  .status-filter .el-radio-button {
    min-width: calc(33.333% - 10px);
    margin-bottom: 10px;
  }
  
  .nav-link {
    width: 36px;
    height: 36px;
  }
  
  .nav-link .el-icon {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 20px;
  }
  
  .order-no {
    font-size: 14px;
  }
  
  .order-time {
    font-size: 12px;
  }
  
  .product-name {
    font-size: 14px;
  }
  
  .actions-right {
    flex-direction: column;
    width: 100%;
  }
  
  .actions-right .el-button {
    width: 100%;
  }
  
  .status-filter .el-radio-button {
    min-width: calc(50% - 10px);
  }
}
</style>