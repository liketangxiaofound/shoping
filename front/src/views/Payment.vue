<template>
  <div class="payment-page">
    <div class="payment-container">
      <h2 class="page-title">订单支付</h2>

      <el-card v-loading="loading" class="payment-card">
        <div class="order-summary">
          <h3>订单信息</h3>
          <div class="order-details">
            <p class="detail-row">
              <span class="detail-label">订单号：</span>
              <span class="detail-value">{{ order?.orderNo }}</span>
            </p>
            <p class="detail-row">
              <span class="detail-label">总金额：</span>
              <span class="amount">¥{{ order?.totalPrice?.toFixed(2) }}</span>
            </p>
            <p class="detail-row">
              <span class="detail-label">状态：</span>
              <span class="order-status">{{ orderStatusText }}</span>
            </p>
          </div>
        </div>

        <div class="payment-methods" v-if="!isPaid">
          <h3>选择支付方式</h3>
          <el-radio-group v-model="paymentMethod" size="large">
            <el-radio-button label="simulated">模拟支付</el-radio-button>
          </el-radio-group>
        </div>

        <div class="payment-actions" v-if="!isPaid">
          <el-button 
            @click="$router.push('/orders')" 
            class="cancel-btn"
            size="large"
          >
            取消支付
          </el-button>
          <el-button 
            type="success" 
            size="large"
            :loading="paying"
            @click="handlePay"
            class="pay-btn"
          >
            立即支付 ¥{{ order?.totalPrice?.toFixed(2) }}
          </el-button>
        </div>

        <div class="payment-success" v-else>
          <div class="success-icon">
            <svg 
              viewBox="0 0 1024 1024" 
              width="80" 
              height="80"
              class="checkmark"
            >
              <path 
                fill="#52c41a" 
                d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm193.5 301.7l-210.6 292a31.8 31.8 0 0 1-51.7 0L318.5 484.9c-3.8-5.3 0-12.7 6.5-12.7h46.9c10.2 0 19.9 4.9 25.9 13.3l71.2 98.8 157.2-218c6-8.3 15.6-13.3 25.9-13.3H699c6.5 0 10.3 7.4 6.5 12.7z"
              />
            </svg>
          </div>
          <h2 class="success-title">支付成功</h2>
          <p class="success-subtitle">您的订单已支付成功，我们将尽快为您发货！</p>
          <div class="success-actions">
            <el-button 
              type="primary" 
              size="large" 
              @click="$router.push('/orders')"
              class="view-order-btn"
            >
              查看订单
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const orderId = ref(parseInt(route.params.id))
const order = ref(null)
const loading = ref(false)
const paying = ref(false)
const paymentMethod = ref('simulated')

const isPaid = computed(() => order.value?.status === 'paid')
const orderStatusText = computed(() => {
  const statusMap = {
    pending: '待支付',
    paid: '已支付',
    shipped: '已发货',
    delivered: '已收货',
    cancelled: '已取消'
  }
  return statusMap[order.value?.status] || '未知'
})

const fetchOrder = async () => {
  loading.value = true
  try {
    const data  = await request.get(`/api/orders/${orderId.value}`)
    if (data.success) {
      order.value = data.data.order
    } else {
      ElMessage.error('获取订单失败')
      router.push('/orders')
    }
  } catch (error) {
    console.error('获取订单失败:', error)
    ElMessage.error('网络错误')
    router.push('/orders')
  } finally {
    loading.value = false
  }
}

const handlePay = async () => {
  if (isPaid.value) return

  paying.value = true
  try {
    const  data  = await request.post(`/api/orders/${orderId.value}/pay`, {
      paymentMethod: paymentMethod.value
    })

    if (data.success) {
      ElMessage.success('支付成功！')
      order.value = data.data.order
    } else {
      ElMessage.error(data.message || '支付失败')
    }
  } catch (error) {
    console.error('支付失败:', error)
    ElMessage.error('支付失败，请重试')
  } finally {
    paying.value = false
  }
}

onMounted(() => {
  if (!orderId.value) {
    router.push('/orders')
    return
  }
  fetchOrder()
})
</script>

<style scoped>
.payment-page {
  min-height: 100vh;
  background-color: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.payment-container {
  width: 100%;
  max-width: 480px;
}

.page-title {
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.payment-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 30px;
  border: none;
}

.order-summary {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.order-summary h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 8px 0;
  border-bottom: 1px solid #f8f8f8;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  flex: 0 0 80px;
  color: #666;
  font-size: 14px;
}

.detail-value {
  flex: 1;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.amount {
  color: #e60000;
  font-size: 20px;
  font-weight: bold;
  flex: 1;
}

.order-status {
  flex: 1;
  color: #52c41a;
  font-weight: 500;
  padding: 4px 8px;
  background-color: #f6ffed;
  border-radius: 4px;
  display: inline-block;
  font-size: 14px;
}

.payment-methods {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.payment-methods h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.payment-actions {
  display: flex;
  gap: 15px;
  justify-content: space-between;
}

.cancel-btn {
  flex: 1;
  border-color: #d9d9d9;
  color: #666;
}

.cancel-btn:hover {
  border-color: #409eff;
  color: #409eff;
  background-color: #fff;
}

.pay-btn {
  flex: 2;
  height: 48px;
  font-weight: 600;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  border: none;
  transition: all 0.3s;
}

.pay-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(82, 196, 26, 0.4);
  background: linear-gradient(135deg, #52c41a, #73d13d);
}

.pay-btn:active {
  transform: translateY(0);
}

/* 支付成功样式 */
.payment-success {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  margin: 10px auto 20px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: bounceIn 0.6s;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1);
  }
  80% {
    opacity: 1;
    transform: scale(0.89);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.checkmark {
  width: 100%;
  height: 100%;
  animation: checkmark 0.5s ease-in-out 0.4s both;
}

@keyframes checkmark {
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

.success-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  animation: fadeIn 0.5s ease-in-out 0.2s both;
}

.success-subtitle {
  margin: 0 0 30px 0;
  color: #666;
  font-size: 16px;
  line-height: 1.5;
  animation: fadeIn 0.5s ease-in-out 0.4s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-actions {
  animation: fadeIn 0.5s ease-in-out 0.6s both;
}

.view-order-btn {
  width: 200px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background-color: #1890ff;
  border: none;
  transition: all 0.3s;
}

.view-order-btn:hover {
  background-color: #40a9ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
}

/* 响应式设计 */
@media (max-width: 576px) {
  .payment-page {
    padding: 10px;
  }
  
  .payment-card {
    padding: 20px;
  }
  
  .page-title {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  .payment-actions {
    flex-direction: column;
  }
  
  .cancel-btn,
  .pay-btn {
    width: 100%;
  }
  
  .view-order-btn {
    width: 100%;
  }
}
</style>