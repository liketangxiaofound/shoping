<template>
  <div class="product-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="skeleton-detail">
        <el-skeleton :rows="5" animated />
        <div class="skeleton-image">
          <el-skeleton-item variant="image" style="width: 100%; height: 400px" />
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <el-empty description="加载失败" :image-size="200">
        <template #description>
          <p>{{ errorMessage }}</p>
        </template>
        <template #default>
          <el-button type="primary" @click="retry">重试</el-button>
          <el-button @click="goBack">返回</el-button>
        </template>
      </el-empty>
    </div>

    <!-- 商品详情 -->
    <div v-else-if="product" class="product-detail">
      <!-- 面包屑导航 -->
      <div class="breadcrumb">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item :to="{ path: '/products' }">所有商品</el-breadcrumb-item>
          <el-breadcrumb-item>{{ product.category || '未分类' }}</el-breadcrumb-item>
          <el-breadcrumb-item>{{ product.name }}</el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 商品内容 -->
      <div class="product-content">
        <!-- 商品图片 -->
        <div class="product-gallery">
          <div class="main-image">
            <img 
              :src="currentImage || getProductImage(product)" 
              :alt="product.name"
              class="product-image"
              @error="handleImageError"
            />
          </div>
          <div v-if="imageList.length > 1" class="thumbnail-list">
            <div
              v-for="(img, index) in imageList"
              :key="index"
              class="thumbnail-item"
              :class="{ active: currentImage === img }"
              @click="currentImage = img"
            >
              <img
                :src="img"
                :alt="`${product.name} 缩略图 ${index + 1}`"
                class="thumbnail-image"
                @error="handleThumbError($event, index)"
              />
            </div>
          </div>
        </div>

        <!-- 商品信息 -->
        <div class="product-info">
          <h1 class="product-name">{{ product.name }}</h1>
          
          <div class="product-meta">
            <div class="meta-item">
              <span class="meta-label">商品编号:</span>
              <span class="meta-value">PROD{{ product.id.toString().padStart(6, '0') }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">分类:</span>
              <span class="meta-value">{{ product.category || '未分类' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">上架时间:</span>
              <span class="meta-value">{{ formatDate(product.createdAt) }}</span>
            </div>
          </div>

          <div class="price-section">
            <div class="current-price">
              <span class="price-label">价格:</span>
              <span class="price-value">¥{{ product.price.toFixed(2) }}</span>
            </div>
          </div>

          <div class="stock-section">
            <span class="stock-label">库存:</span>
            <span class="stock-value" :class="{ 'low-stock': product.stock < 10 }">
              {{ product.stock }} 件
              <el-tag v-if="product.stock < 10" size="small" type="danger">库存紧张</el-tag>
            </span>
          </div>

          <div class="quantity-control">
            <el-input-number 
              v-model="quantity" 
              :min="1" 
              :max="product.stock" 
              size="large"
              :disabled="product.stock <= 0"
            />
            <el-button 
              type="primary" 
              size="large" 
              :disabled="product.stock <= 0"
              @click="addToCart"
              :loading="addingToCart"
              class="add-to-cart-btn"
            >
              {{ product.stock > 0 ? '加入购物车' : '已售罄' }}
            </el-button>
          </div>

          <div class="product-description">
            <h3>商品描述</h3>
            <p>{{ product.description || '暂无商品描述' }}</p>
          </div>
        </div>
      </div>

      <ProductRecommendStrip
        v-if="alsoBought.length"
        title="浏览过此商品的人也买了..."
        subtitle="根据相似用户的购买与浏览记录推荐"
        :products="alsoBought"
      />

      <ProductRecommendStrip
        v-if="cfRecommend.length && userStore.user"
        title="协同过滤为您推荐"
        subtitle="根据与您兴趣相似的用户购买行为"
        :products="cfRecommend"
      />
    </div>

    <!-- 空状态（商品不存在） -->
    <div v-else class="empty-container">
      <el-empty description="商品不存在" :image-size="200">
        <template #default>
          <el-button type="primary" @click="goBack">返回</el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import ProductRecommendStrip from '@/components/ProductRecommendStrip.vue'

const alsoBought = ref([])
const cfRecommend = ref([])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const viewStartedAt = ref(Date.now())

// 响应式数据
const product = ref(null)
const loading = ref(true)
const error = ref(false)
const errorMessage = ref('')
const addingToCart = ref(false)
const quantity = ref(1)
const currentImage = ref(null)

// 获取商品详情
const fetchProduct = async () => {
  try {
    loading.value = true
    error.value = false
    const productId = parseInt(route.params.id)
    
    if (isNaN(productId)) {
      throw new Error('商品ID格式错误')
    }

    const response = await request.get(`/api/products/${productId}`)
    
    if (response.success) {
      product.value = response.data
      viewStartedAt.value = Date.now()
      const list = imageList.value
      currentImage.value = list[0] || product.value.imageUrl || ''
      fetchRecommendations(productId)
    } else {
      throw new Error(response.message || '获取商品详情失败')
    }
  } catch (err) {
    error.value = true
    errorMessage.value = err.message || '网络错误，请重试'
    console.error('获取商品详情失败:', err)
  } finally {
    loading.value = false
  }
}

// 获取商品图片
const IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'

const getProductImage = (product) => {
  if (!product) return IMAGE_FALLBACK
  return product.imageUrl || IMAGE_FALLBACK
}

// 商品图集（仅展示真实 URL，无图时不生成假缩略图）
const imageList = computed(() => {
  if (!product.value) return []
  const fromApi = product.value.images
  if (Array.isArray(fromApi) && fromApi.length > 0) {
    return [...new Set(fromApi.filter((u) => typeof u === 'string' && u.trim()))]
  }
  if (product.value.imageUrl) {
    return [product.value.imageUrl]
  }
  return []
})

const handleImageError = (event) => {
  if (event.target.dataset.fallback === '1') return
  event.target.dataset.fallback = '1'
  event.target.src = IMAGE_FALLBACK
}

const handleThumbError = (event, index) => {
  const list = imageList.value
  if (list[index]) {
    event.target.src = list[0]
  } else {
    handleImageError(event)
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 加入购物车
const addToCart = async () => {
  if (!product.value) return

  addingToCart.value = true
  try {
    // 检查用户是否登录（这里假设有用户状态管理）
    // 实际项目中，你需要检查用户是否登录，如果没有登录则跳转到登录页
    // if (!userStore.isLoggedIn) {
    //   router.push('/login')
    //   return
    // }

    // 调用加入购物车接口
    const response = await request.post('/api/cart', {
      productId: product.value.id,
      quantity: quantity.value
    })

    if (response.success) {
      ElMessage.success('已加入购物车')
      // 重置数量
      quantity.value = 1
    } else {
      ElMessage.error(response.message || '加入购物车失败')
    }
  } catch (err) {
    console.error('加入购物车失败:', err)
    ElMessage.error('网络错误，请重试')
  } finally {
    addingToCart.value = false
  }
}

// 返回
const goBack = () => {
  router.go(-1) // 返回上一页
}

// 重试
const retry = () => {
  fetchProduct()
}

const fetchRecommendations = async (productId) => {
  try {
    const alsoRes = await request.get(`/api/recommendations/also-bought/${productId}`, {
      params: { limit: 8 }
    })
    if (alsoRes.success) {
      alsoBought.value = alsoRes.data.products || []
    }
    if (userStore.user) {
      const cfRes = await request.get('/api/recommendations/for-you', { params: { limit: 6 } })
      if (cfRes.success) {
        const list = cfRes.data.products || []
        const ids = new Set([productId, ...alsoBought.value.map((p) => p.id)])
        cfRecommend.value = list.filter((p) => !ids.has(p.id))
      }
    }
  } catch {
    // 推荐失败不影响详情页
  }
}

const reportBrowseDuration = async () => {
  if (!product.value?.id || !userStore.user) return
  const dwellSeconds = Math.max(1, Math.round((Date.now() - viewStartedAt.value) / 1000))
  try {
    await request.post('/api/analytics/browse', {
      productId: product.value.id,
      category: product.value.category || '未分类',
      dwellSeconds
    })
  } catch {
    // 采集失败不影响用户操作
  }
}

onMounted(() => {
  fetchProduct()
})

onBeforeUnmount(() => {
  reportBrowseDuration()
})
</script>

<style scoped>
.product-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 60px);
  text-align: left;
}

.loading-container,
.error-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 500px;
}

.breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.product-detail {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.product-content {
  display: flex;
  gap: 40px;
}

.product-gallery {
  flex: 0 0 50%;
}

.main-image {
  margin-bottom: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  background: #f8f9fa;
  padding: 15px;
  text-align: center;
}

.product-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
}

.thumbnail-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.thumbnail-item {
  width: 80px;
  height: 80px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  padding: 5px;
  background: white;
  transition: all 0.3s;
}

.thumbnail-item:hover {
  border-color: #409eff;
}

.thumbnail-item.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-info {
  flex: 1;
}

.product-name {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 0 20px 0;
}

.product-meta {
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.meta-item {
  margin-bottom: 10px;
  font-size: 14px;
}

.meta-label {
  color: #666;
  display: inline-block;
  width: 80px;
}

.meta-value {
  color: #333;
}

.price-section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.current-price {
  display: flex;
  align-items: center;
}

.price-label {
  font-size: 16px;
  color: #666;
  margin-right: 10px;
}

.price-value {
  font-size: 28px;
  font-weight: bold;
  color: #e1251b;
}

.stock-section {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
}

.stock-label {
  font-size: 16px;
  color: #666;
  margin-right: 10px;
}

.stock-value {
  font-size: 18px;
  color: #333;
}

.low-stock {
  color: #e1251b;
  font-weight: 500;
}

.quantity-control {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
}

.add-to-cart-btn {
  flex: 1;
}

.product-description {
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.product-description h3 {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 15px 0;
}

.product-description p {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 992px) {
  .product-content {
    flex-direction: column;
  }
  
  .product-gallery {
    flex: 0 0 auto;
    margin-bottom: 30px;
  }
}

@media (max-width: 576px) {
  .product-detail {
    padding: 20px;
  }
  
  .product-name {
    font-size: 20px;
  }
  
  .price-value {
    font-size: 24px;
  }
  
  .quantity-control {
    flex-direction: column;
  }
  
  .add-to-cart-btn {
    width: 100%;
  }
}
</style>