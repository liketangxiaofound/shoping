<template>
  <div class="order-detail-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="page-title">订单详情</h2>
    </div>

    <!-- 返回订单列表图标 -->
    <el-tooltip content="返回订单列表" placement="bottom">
      <router-link to="/orders" class="nav-link">
        <el-icon><ArrowLeft /></el-icon>
      </router-link>
    </el-tooltip>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="!order" class="empty-container">
      <el-empty description="订单不存在" :image-size="200">
        <template #default>
          <el-button type="primary" @click="$router.push('/orders')">返回订单列表</el-button>
        </template>
      </el-empty>
    </div>

    <!-- 订单详情内容 -->
    <div v-else class="order-detail">
      <!-- 订单概览 -->
      <el-card class="overview-card">
        <div class="overview-header">
          <div class="overview-info">
            <div class="order-no">订单号: {{ order.orderNo }}</div>
            <div class="order-time">下单时间: {{ formatDate(order.createdAt) }}</div>
          </div>
          <div class="overview-status">
            <el-tag :type="getStatusTagType(order.status)" size="large">
              {{ getStatusText(order.status) }}
            </el-tag>
            <div class="total-amount">¥{{ order.totalPrice.toFixed(2) }}</div>
          </div>
        </div>
      </el-card>

      <!-- 订单状态时间线 -->
      <el-card class="timeline-card">
        <div class="card-title">订单状态历史</div>
        <el-timeline>
          <!-- 订单创建 -->
          <el-timeline-item
            :type="getTimelineType('created')"
            :timestamp="formatDate(order.createdAt)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-title">订单创建</div>
              <div class="timeline-desc">订单已创建，等待支付</div>
            </div>
          </el-timeline-item>

          <!-- 支付完成 -->
          <el-timeline-item
            v-if="order.paidAt"
            :type="getTimelineType('paid')"
            :timestamp="formatDate(order.paidAt)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-title">支付完成</div>
              <div class="timeline-desc">订单支付成功</div>
            </div>
          </el-timeline-item>

          <!-- 商品已发货 -->
          <el-timeline-item
            v-if="order.shippedAt"
            :type="getTimelineType('shipped')"
            :timestamp="formatDate(order.shippedAt)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-title">商品已发货</div>
              <div class="timeline-desc">商家已发货</div>
              <div v-if="order.trackingNumber" class="tracking-info">运单号: {{ order.trackingNumber }}</div>
            </div>
          </el-timeline-item>

          <!-- 已收货 -->
          <el-timeline-item
            v-if="order.deliveredAt"
            :type="getTimelineType('delivered')"
            :timestamp="formatDate(order.deliveredAt)"
            placement="top"
          >
            <div class="timeline-content">
              <div class="timeline-title">已收货</div>
              <div class="timeline-desc">您已确认收货</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <!-- 收货信息 -->
      <el-card class="address-card">
        <div class="card-title">收货信息</div>
        <div class="address-info">
          <div class="address-item">
            <span class="address-label">收件人：</span>
            <span class="address-value">{{ getAddressValue('recipient') }}</span>
          </div>
          <div class="address-item">
            <span class="address-label">联系电话：</span>
            <span class="address-value">{{ getAddressValue('phone') }}</span>
          </div>
          <div class="address-item">
            <span class="address-label">收货地址：</span>
            <span class="address-value">{{ getAddressValue('detail') }}</span>
          </div>
        </div>
      </el-card>

      <!-- 商品清单 -->
      <el-card class="products-card">
        <div class="card-title">商品清单</div>
        <div class="products-list">
          <div v-for="item in order.orderItems" :key="item.id" class="product-item">
            <div class="product-image-container">
              <img 
                :src="getProductImage(item.product)" 
                :alt="item.product.name"
                class="product-image"
              />
            </div>
            <div class="product-info">
              <div class="product-name">{{ item.product.name }}</div>
              <div class="product-price">单价: ¥{{ item.price.toFixed(2) }}</div>
            </div>
            <div class="product-quantity">× {{ item.quantity }}</div>
            <div class="product-total">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
          </div>
        </div>
        
        <div class="summary-section">
          <div class="summary-row">
            <span>商品总额</span>
            <span>¥{{ getSubtotal().toFixed(2) }}</span>
          </div>
          <div class="summary-row">
            <span>运费</span>
            <span>¥0.00</span>
          </div>
          <div class="summary-row total-row">
            <span>应付总额</span>
            <span>¥{{ order.totalPrice.toFixed(2) }}</span>
          </div>
        </div>
      </el-card>

      <!-- 操作按钮 -->
      <div v-if="['pending', 'shipped'].includes(order.status)" class="action-buttons">
        <el-button 
          v-if="order.status === 'pending'" 
          type="primary" 
          size="large"
          @click="goToPayment(order.id)"
        >
          去支付
        </el-button>
        <el-button 
          v-if="order.status === 'pending'" 
          @click="cancelOrder(order)"
          size="large"
        >
          取消订单
        </el-button>
        <el-button 
          v-if="order.status === 'shipped'" 
          type="success" 
          size="large"
          @click="confirmReceipt(order.id)"
        >
          确认收货
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const order = ref(null)
const loading = ref(false)
const confirmingReceipt = ref(false)
const cancellingOrder = ref(false)

// 状态文本映射
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

const getTimelineType = (step) => {
  if (!order.value) return 'primary'
  
  const status = order.value.status
  if (step === 'created') return 'primary'
  if (step === 'paid' && status === 'pending') return 'warning'
  if (step === 'paid' && status !== 'pending') return 'primary'
  if (step === 'shipped' && ['pending', 'paid'].includes(status)) return 'warning'
  if (step === 'shipped' && !['pending', 'paid'].includes(status)) return 'primary'
  if (step === 'delivered') return 'success'
  return 'primary'
}

const getProductImage = (product) => {
  if (!product) return 'https://via.placeholder.com/60x60/f0f0f0/969696?text=商品图片'
  return product.image || 'https://via.placeholder.com/60x60/f0f0f0/969696?text=商品图片'
}

const getAddressValue = (key) => {
  if (!order.value || !order.value.address) return '未填写'
  if (typeof order.value.address === 'string') {
    try {
      const addressObj = JSON.parse(order.value.address)
      return addressObj[key] || '未填写'
    } catch (e) {
      return '未填写'
    }
  }
  return order.value.address[key] || '未填写'
}

const getSubtotal = () => {
  if (!order.value || !order.value.orderItems) return 0
  return order.value.orderItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity)
  }, 0)
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

// 获取订单详情
const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const orderId = route.params.id
    const response = await request.get(`/api/orders/${orderId}`)
    
    if (response.success) {
      order.value = response.data.order
    } else {
      ElMessage.error(response.message || '获取订单详情失败')
    }
  } catch (error) {
    console.error('获取订单详情错误:', error)
    ElMessage.error('网络错误，请重试')
  } finally {
    loading.value = false
  }
}

// 操作
const goToPayment = (orderId) => {
  router.push(`/order/${orderId}/pay`)
}

const cancelOrder = async (order) => {
  cancellingOrder.value = true
  try {
    await ElMessageBox.confirm(
      `确定要取消订单 ${order.orderNo} 吗？`,
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
                // 重新加载订单详情
                await fetchOrderDetail()
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
  } finally {
    cancellingOrder.value = false
  }
}

const confirmReceipt = async (orderId) => {
  confirmingReceipt.value = true
  try {
    await ElMessageBox.confirm(
      '确认收到商品后，订单将完成。请确认您已收到商品且商品完好。',
      '确认收货',
      {
        confirmButtonText: '确认收货',
        cancelButtonText: '取消',
        type: 'info',
        beforeClose: async (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            try {
              const response = await request.put(`/api/orders/${orderId}/confirm-receipt`)
              
              if (response.success) {
                ElMessage.success('确认收货成功')
                // 重新加载订单详情
                await fetchOrderDetail()
              } else {
                ElMessage.error(response.message || '确认收货失败')
              }
            } catch (error) {
              console.error('确认收货错误:', error)
              ElMessage.error('确认收货失败，请重试')
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
  } finally {
    confirmingReceipt.value = false
  }
}

onMounted(() => {
  fetchOrderDetail()
})
</script>

<style scoped>
.order-detail-page {
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
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
  flex-grow: 1;
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
  position: absolute;
  left: 0;
  z-index: 1;
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

/* 卡片通用样式 */
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 订单概览卡片 */
.overview-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
  margin-bottom: 0;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: nowrap;
  gap: 20px;
}

.overview-info {
  flex: 1;
  min-width: 0;
}

.overview-info .order-no {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
  line-height: 1.4;
}

.overview-info .order-time {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.overview-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  min-width: 200px;
  text-align: right;
}

.total-amount {
  font-size: 24px;
  font-weight: bold;
  color: #e1251b;
  line-height: 1.4;
}

/* 通用卡片标题 */
.card-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

/* 时间线卡片 */
.timeline-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
  margin-bottom: 0;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-title {
  font-size: 16px;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
}

.timeline-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.4;
}

.tracking-info {
  font-size: 13px;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  border-left: 3px solid #409eff;
  margin-top: 4px;
  line-height: 1.4;
}

/* 收货信息卡片 */
.address-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
  margin-bottom: 0;
}

.address-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 15px;
  line-height: 1.4;
}

.address-label {
  color: #666;
  font-weight: 600;
  min-width: 80px;
  text-align: right;
}

.address-value {
  color: #333;
  flex: 1;
  word-break: break-word;
}

/* 商品清单卡片 */
.products-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
  margin-bottom: 0;
}

.products-list {
  margin-bottom: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: white;
  gap: 20px;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image-container {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.product-image {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid #e8e8e8;
  padding: 2px;
  box-sizing: border-box;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.product-price {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.product-quantity {
  min-width: 60px;
  text-align: center;
  color: #666;
  font-weight: 600;
  font-size: 15px;
  line-height: 1.4;
}

.product-total {
  min-width: 100px;
  text-align: right;
  font-weight: 600;
  color: #e1251b;
  font-size: 16px;
  line-height: 1.4;
}

/* 总结部分 */
.summary-section {
  padding: 20px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  margin-top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 15px;
  line-height: 1.4;
  color: #666;
}

.total-row {
  font-size: 18px;
  font-weight: bold;
  color: #e1251b;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
  padding-top: 12px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #e8e8e8;
}

.action-buttons .el-button {
  min-width: 120px;
  height: 40px;
  font-weight: 600;
  transition: all 0.3s;
  padding: 0 20px;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.action-buttons .el-button--primary {
  background: linear-gradient(to right, #67C23A, #409EFF);
  border: none;
}

.action-buttons .el-button--success {
  background: linear-gradient(to right, #67C23A, #5cb87a);
  border: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-detail-page {
    padding: 15px;
  }
  
  .page-header {
    margin-bottom: 20px;
  }
  
  .nav-link {
    width: 36px;
    height: 36px;
  }
  
  .nav-link .el-icon {
    font-size: 18px;
  }
  
  .overview-header {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .overview-status {
    align-items: flex-start;
    min-width: 0;
  }
  
  .overview-info .order-no {
    font-size: 16px;
  }
  
  .total-amount {
    font-size: 20px;
  }
  
  .product-item {
    flex-wrap: wrap;
    padding: 12px 15px;
  }
  
  .product-info {
    order: 1;
    flex: 1 1 100%;
    margin-bottom: 8px;
  }
  
  .product-quantity {
    order: 2;
    flex: 1;
    text-align: left;
  }
  
  .product-total {
    order: 3;
    flex: 1;
    text-align: right;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-buttons .el-button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 20px;
  }
  
  .overview-info .order-no {
    font-size: 15px;
  }
  
  .card-title {
    font-size: 16px;
  }
  
  .address-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .address-label {
    min-width: 0;
    text-align: left;
  }
}
</style>