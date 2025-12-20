<!-- src/views/CartView.vue -->
<template>
  <div class="cart-page">
    <div class="cart-container">
      <div class="page-header">
          <!-- 返回首页图标 -->
          <el-tooltip content="返回首页" placement="bottom">
            <router-link to="/home" class="nav-link">
              <el-icon><House /></el-icon>
            </router-link>
          </el-tooltip>
          
          <h2 class="page-title">我的购物车</h2>
      </div>

      
      

      <div v-if="cartStore.loading" class="loading-section">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="cartStore.isEmpty" class="empty-cart-section">
        <el-empty description="购物车是空的" :image-size="200">
          <el-button type="primary" @click="goShopping">去逛逛</el-button>
        </el-empty>
      </div>

      <div v-else class="cart-items-section">
        <div class="cart-items">
          <div
            v-for="item in cartStore.items"
            :key="item.id"
            class="cart-item"
          >
            <div class="item-image">
              <img 
                :src="getProductImageUrl(item.product)" 
                :alt="item.product.name"
                class="product-thumb"
              />
            </div>
            
            <div class="item-info">
              <h4 class="item-name">{{ item.product.name }}</h4>
              <p class="item-price">¥{{ item.product.price }}</p>
              
              <div class="item-controls">
                <div class="quantity-controls">
                  <el-button 
                    size="small" 
                    :disabled="item.quantity <= 1"
                    @click="cartStore.updateQuantity(item.id, item.quantity - 1)"
                  >
                    -
                  </el-button>
                  <span class="quantity">{{ item.quantity }}</span>
                  <el-button 
                    size="small" 
                    :disabled="item.quantity >= (item.product.stock || 999)"
                    @click="cartStore.updateQuantity(item.id, item.quantity + 1)"
                  >
                    +
                  </el-button>
                </div>
                
                <el-button 
                  type="danger" 
                  size="small" 
                  text 
                  @click="cartStore.removeFromCart(item.id)"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="cart-summary">
          <div class="summary-row">
            <span>共 {{ cartStore.itemCount }} 件商品</span>
            <span class="total-price">总计: ¥{{ cartStore.totalPrice.toFixed(2) }}</span>
          </div>
          
          <div class="cart-actions">
            <el-button 
              type="danger" 
              size="large" 
              @click="cartStore.clearCart"
            >
              清空购物车
            </el-button>
            <el-button 
              type="primary" 
              size="large" 
              @click="cartStore.checkout"
            >
              去结算
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/store/cart'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'
import { House} from '@element-plus/icons-vue'
const router = useRouter()
const userStore = useUserStore()
const cartStore = useCartStore()

const getProductImageUrl = (product) => {
  return product.imageUrl || product.image || 'https://via.placeholder.com/300x200/f0f0f0/969696?text=商品图片'
}

const goShopping = () => {
  router.push('/home')
}

onMounted(() => {
  if (!userStore.user) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  cartStore.fetchCart()
})
</script>

<style scoped>
/* 样式同上，此处省略以节省篇幅，可直接沿用你之前的样式 */
.cart-page {
  padding: 30px 20px;
  background: #f8f9fa;
  min-height: 100vh;
}
.cart-container {
  max-width: 1200px;
  margin: 0 auto;
}
.page-title {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
}
.empty-cart-section {
  background: white;
  padding: 60px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.cart-items-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  padding: 20px;
}
.cart-items { margin-bottom: 30px; }
.cart-item {
  display: flex;
  padding: 15px 0;
  border-bottom: 1px solid #f0f0f0;
}
.cart-item:last-child { border-bottom: none; }
.item-image {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 20px;
  flex-shrink: 0;
}
.product-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.item-name {
  margin: 0 0 8px;
  font-weight: 600;
  font-size: 16px;
}
.item-price {
  color: #e1251b;
  font-weight: bold;
  font-size: 18px;
  margin: 0;
}
.item-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quantity {
  min-width: 30px;
  text-align: center;
  font-weight: 600;
}
.cart-summary {
  padding-top: 20px;
  border-top: 1px solid #eee;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 18px;
  margin-bottom: 20px;
}
.total-price {
  color: #e1251b;
  font-weight: bold;
}
.cart-actions {
  display: flex;
  gap: 15px;
}
/* 在你现有的 <style scoped> 块末尾添加 */

.item-name,
.item-price,
.item-controls,
.quantity {
  color: #333; /* 或 #000，确保可读 */
}

/* 如果按钮文字也看不清，可以加强按钮对比度 */
.el-button--small {
  color: inherit;
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
  transition: background-color 0.2s, color 0.2s;
  position: absolute;
  left: 0;
  z-index: 1;
}

.nav-link:hover {
  background-color: #f0f0f0;
  color: #e1251b;
}

.nav-link .el-icon {
  font-size: 24px;
}
@media (max-width: 768px) {
  .cart-item { flex-direction: column; }
  .item-image {
    margin-right: 0;
    margin-bottom: 15px;
    width: 100%;
    height: 150px;
  }
  .cart-actions { flex-direction: column; }
}
</style>