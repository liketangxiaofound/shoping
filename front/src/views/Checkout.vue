<!-- src/views/CheckoutView.vue -->
<template>
  <div class="checkout-page">
    <div class="checkout-container">
      <h2 class="page-title">确认订单</h2>

      <el-card v-loading="loading" class="order-form">
        <!-- 收货地址表单 -->
        <div class="address-section">
          <h3>收货地址</h3>
          <el-form :model="addressForm" :rules="addressRules" ref="addressFormRef" label-width="80px">
            <el-form-item label="收件人" prop="recipient">
              <el-input v-model="addressForm.recipient" placeholder="请输入收件人姓名" />
            </el-form-item>
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="addressForm.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="详细地址" prop="detail">
              <el-input 
                v-model="addressForm.detail" 
                type="textarea" 
                :rows="3"
                placeholder="请输入省市区+街道门牌号"
              />
            </el-form-item>
          </el-form>
        </div>

        <!-- 订单备注 -->
        <div class="note-section">
          <h3>订单备注（可选）</h3>
          <el-input 
            v-model="note" 
            type="textarea" 
            :rows="2"
            placeholder="例如：请放门口，谢谢！"
          />
        </div>

        <!-- 商品清单 -->
        <div class="cart-items-section">
          <h3>商品清单</h3>
          <div class="cart-items">
            <div
              v-for="item in cartStore.items"
              :key="item.id"
              class="cart-item"
            >
              <img 
                :src="getProductImageUrl(item.product)" 
                class="product-thumb"
              />
              <div class="item-info">
                <h4>{{ item.product.name }}</h4>
                <p>¥{{ item.product.price }} × {{ item.quantity }}</p>
              </div>
              <p class="item-total">¥{{ (item.product.price * item.quantity).toFixed(2) }}</p>
            </div>
          </div>
        </div>

        <!-- 总计 -->
        <div class="summary-row">
          <span>共 {{ cartStore.itemCount }} 件商品</span>
          <span class="total-price">总计: ¥{{ cartStore.totalPrice.toFixed(2) }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <el-button @click="$router.back()">返回购物车</el-button>
          <el-button 
            type="primary" 
            :loading="submitting"
            @click="handleSubmit"
          >
            提交订单
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCartStore } from '@/store/cart'
import request from '@/utils/request'

const router = useRouter()
const cartStore = useCartStore()

const addressForm = ref({
  recipient: '',
  phone: '',
  detail: ''
})
const note = ref('')
const loading = ref(false)
const submitting = ref(false)
const addressFormRef = ref()

const addressRules = {
  recipient: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  detail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }]
}

const getProductImageUrl = (product) => {
  return product.imageUrl || product.image || 'https://via.placeholder.com/100x100/f0f0f0/969696?text=图片'
}

// 添加这个新函数来处理不可用商品
const handleUnavailableItems = async (unavailableItems) => {
  console.log('🔄 处理不可用商品:', unavailableItems)
  
  const messages = unavailableItems.map(item => 
    `"${item.name}"：${item.reason}`
  ).join('\n')
  
  try {
    await ElMessageBox.confirm(
      `以下商品不可用，是否从购物车中移除？\n\n${messages}\n\n移除后您可以继续下单。`,
      '商品不可用',
      {
        confirmButtonText: '移除并继续',
        cancelButtonText: '取消',
        type: 'warning',
        beforeClose: async (action, instance, done) => {
          if (action === 'confirm') {
            instance.confirmButtonLoading = true
            try {
              const productIds = unavailableItems.map(item => item.productId)
              await cartStore.removeItemsByProductIds(productIds)
              
              if (cartStore.isEmpty) {
                ElMessage.warning('购物车中已无可用商品')
                router.push('/cart')
              } else {
                ElMessage.success('已移除不可用商品，请重新提交订单')
              }
            } catch (removeError) {
              console.error('移除商品失败:', removeError)
              ElMessage.error('移除商品失败，请重试')
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
  } catch (cancel) {
    console.log('用户取消移除商品')
  }
}

const handleSubmit = async () => {
  await addressFormRef.value?.validate(async (valid) => {
    if (!valid) return

    submitting.value = true
    try {
      const data = await request.post('/api/orders', {
        address: addressForm.value,
        note: note.value
      })

      console.log('完整响应:', data)
      console.log('response 类型:', typeof data)
      console.log('是否有 success 字段:', 'success' in data)

      if (data.success) {
        ElMessage.success('订单创建成功！')
        router.push(`/order/${data.data.order.id}/pay`)
      } else {
        if (data.data?.length > 0) {
          // 使用新的处理函数
          await handleUnavailableItems(data.data)
        } else {
          ElMessage.error(data.message || '创建订单失败')
        }
      }
    } catch (error) {
      console.error('创建订单失败:', error)
      
      // 处理网络错误
      if (error.response?.data) {
        const errorData = error.response.data
        
        if (errorData.success === false) {
          if (errorData.message === '部分商品不可用' && errorData.data?.length > 0) {
            // 使用新的处理函数
            await handleUnavailableItems(errorData.data)
          } else {
            ElMessage.error(errorData.message || '创建订单失败')
          }
        } else {
          ElMessage.error('网络错误，请稍后重试')
        }
      } else {
        ElMessage.error('创建订单失败，请重试')
      }
    } finally {
      submitting.value = false
    }
  })
}

onMounted(() => {
  if (cartStore.isEmpty) {
    ElMessage.warning('购物车为空')
    router.push('/cart')
  }
})
</script>

<style scoped>
/* 你的原有样式完全不变 */
.checkout-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.page-title {
  text-align: center;
  margin-bottom: 24px;
}
.order-form {
  border-radius: 8px;
}
.address-section, .note-section, .cart-items-section {
  margin-bottom: 24px;
}
.cart-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cart-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
}
.product-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  margin-right: 16px;
}
.item-info {
  flex: 1;
}
.item-total {
  font-weight: bold;
  color: #e60000;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  font-weight: bold;
  padding: 16px 0;
  border-top: 1px solid #eee;
}
.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}
</style>