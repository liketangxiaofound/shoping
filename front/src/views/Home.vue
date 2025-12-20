<template>
  <div class="home-container">
    <!-- 顶部搜索栏 -->
    <header class="header">
      <div class="header-content">
        <div class="logo-section">
          <h1 class="logo">购物商城</h1>
        </div>
        
        <div class="search-section">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品名称、描述或分类..."
            class="search-input"
            size="large"
            @keyup.enter="handleSearch"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <template #append>
              <el-button @click="handleSearch" :icon="Search">搜索</el-button>
            </template>
          </el-input>
        </div>
        
        <div class="user-section">
          <span v-if="userStore.user" class="welcome-text">欢迎，{{ userStore.user.username }}</span>

            
           <!-- 管理员入口 - 简化版 -->
          <el-dropdown v-if="userStore.user?.role === 'admin'" class="admin-dropdown">
            <span class="admin-link">
              <el-icon><Setting /></el-icon>
            </span>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="$router.push('/admin/dashboard')">
                  <el-icon><DataAnalysis /></el-icon> 仪表板
                </el-dropdown-item>
                <el-dropdown-item @click="$router.push('/admin/products')">
                  <el-icon><Goods /></el-icon> 商品管理
                </el-dropdown-item>
                <el-dropdown-item @click="$router.push('/admin/orders')">
                  <el-icon><List /></el-icon> 订单管理
                </el-dropdown-item>
                <!-- <el-dropdown-item @click="$router.push('/admin/users')">
                  <el-icon><User /></el-icon> 用户管理
                </el-dropdown-item> -->
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <router-link to="/cart" class="cart-link">
          <el-icon><ShoppingCart /></el-icon>
          </router-link>
          <router-link to="/orders" class="nav-link">
          <el-icon><Document/></el-icon>
          </router-link>
          <el-button @click="handleLogout" text>退出登录</el-button>
        </div>
      </div>
    </header>

    <!-- 商品展示区域 -->
    <main class="main-content">
      <!-- 搜索状态和筛选 -->
      <div class="content-header">
        <div class="search-status" v-if="searchKeyword">
          <span class="search-result">搜索"{{ searchKeyword }}" 的结果</span>
          <span class="product-count">找到 {{ products.length }} 个商品</span>
          <el-button @click="clearSearch" text size="small">清除搜索</el-button>
        </div>
        
        <div class="filter-controls" v-if="!searchKeyword">
          <el-select v-model="sortBy" placeholder="排序方式" size="small" @change="handleSortChange">
            <el-option label="最新上架" value="createdAt_desc" />
            <el-option label="价格从低到高" value="price_asc" />
            <el-option label="价格从高到低" value="price_desc" />
          </el-select>
          
          <el-select v-model="categoryFilter" placeholder="全部分类" size="small" clearable @change="handleCategoryChange">
            <el-option 
              v-for="category in categories" 
              :key="category" 
              :label="category" 
              :value="category" 
            />
          </el-select>
        </div>
      </div>

      <!-- 商品网格 - 修正：添加图片显示 -->
      <div class="products-grid">
        <div
          v-for="product in displayedProducts"
          :key="product.id"
          class="product-card"
        >
          <div class="product-image-container">
            <!-- ✅ 关键修正：添加图片显示 -->
            
            <img 
            :src="getProductImageUrl(product)" 
            :alt="product.name"
            @error="handleImageError"
            class="product-image"
           />
  
            <div class="product-actions">
              <el-button 
                type="primary" 
                size="small" 
                class="action-btn"
                @click="addToCart(product)"
              >
                加入购物车
              </el-button>
              <el-button 
                type="info" 
                size="small" 
                class="action-btn"
                @click="viewProductDetail(product.id)"
              >
                查看详情
              </el-button>
            </div>
            <div v-if="product.stock < 10" class="low-stock-badge">库存紧张</div>
          </div>
          
          <div class="product-info">
            <h3 class="product-name" @click="viewProductDetail(product.id)">{{ product.name }}</h3>
            <p class="product-desc">{{ truncateDescription(product.description) }}</p>
            
            <div class="product-meta">
              <el-tag v-if="product.category" size="small" type="info">{{ product.category }}</el-tag>
              <span class="stock-info">库存: {{ product.stock }}</span>
            </div>
            
            <div class="product-footer">
              <div class="price-section">
                <span class="current-price">¥{{ product.price }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="skeleton-grid">
          <div v-for="i in 8" :key="i" class="skeleton-card">
            <el-skeleton style="width: 100%; height: 200px" animated />
            <div class="skeleton-content">
              <el-skeleton-item variant="h3" style="width: 80%; margin-bottom: 10px" />
              <el-skeleton-item variant="text" style="width: 100%; margin-bottom: 5px" />
              <el-skeleton-item variant="text" style="width: 60%" />
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && products.length === 0" class="empty-state">
        <el-empty description="暂无商品" :image-size="200">
          <el-button type="primary" @click="loadProducts">重新加载</el-button>
        </el-empty>
      </div>

      <!-- 分页控件 -->
      <div v-if="totalPages > 1" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="totalProducts"
          layout="prev, pager, next, jumper, total"
          @current-change="handlePageChange"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search ,ShoppingCart,Document,
   Setting,  // 添加
  DataAnalysis,  // 添加
  Goods,  // 添加
  List,  // 添加
  User 
} from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const products = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(12)
const sortBy = ref('createdAt_desc')
const categoryFilter = ref('')
const categories = ref([])

// 计算属性
const displayedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return products.value.slice(start, end)
})

const totalProducts = computed(() => products.value.length)
const totalPages = computed(() => Math.ceil(totalProducts.value / pageSize.value))

// 方法
const loadProducts = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      sortBy: sortBy.value
    }
    
    if (searchKeyword.value) {
      params.search = searchKeyword.value
    }
    
    if (categoryFilter.value) {
      params.category = categoryFilter.value
    }

    console.log('🔄 请求商品数据:', params)
    const response = await request.get('/api/products', { params })
    
    if (response.success) {
      console.log('✅ 获取商品成功，数量:', response.data.products?.length)
      products.value = response.data.products || []
      
      // 调试：检查数据格式
      // if (products.value.length > 0) {
      //   const sampleProduct = products.value[0]
      //   // console.log('🔍 商品数据结构:', {
      //   //   是否有imageUrl: !!sampleProduct.imageUrl,
      //   //   是否有image: !!sampleProduct.image,
      //   //   图片URL: sampleProduct.imageUrl || sampleProduct.image
      //   // })
      // }
      
      await loadCategories()
    } else {
      ElMessage.error('加载商品失败')
      products.value = getMockProducts()
    }
  } catch (error) {
    console.error('加载商品错误:', error)
    ElMessage.error('网络错误，加载商品失败')
    products.value = getMockProducts()
  } finally {
    loading.value = false
  }
}

const loadCategories = async () => {
  try {
    const response = await request.get('/api/products/categories')
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('加载分类列表错误:', error)
    categories.value = ['手机', '电脑', '耳机', '配件', '家电']
  }
}

// 获取商品图片URL
const getProductImageUrl = (product) => {
  // 优先使用后端返回的imageUrl，如果没有则使用image字段
  return product.imageUrl || product.image || 'https://via.placeholder.com/300x200/f0f0f0/969696?text=商品图片'
}

const handleImageError = (event) => {
  console.warn('图片加载失败，使用占位图')
  event.target.src = 'https://via.placeholder.com/300x200/f0f0f0/969696?text=图片加载失败'
}

// 其他方法保持不变...
const handleSearch = () => {
  currentPage.value = 1
  loadProducts()
}

const clearSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  loadProducts()
}

const viewProductDetail = (productId) => {
  router.push(`/product/${productId}`)
}

const addToCart = async (product) => {
  if (!userStore.user) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  try {
    const response = await request.post('/api/carts', {
      productId: product.id,
      quantity: 1
    })
    
    if (response.success) {
      ElMessage.success(`已添加 ${product.name} 到购物车`)
    } else {
      ElMessage.error('添加购物车失败')
    }
  } catch (error) {
    console.error('添加购物车错误:', error)
    ElMessage.error('网络错误，请重试')
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      type: 'warning',
    })
    await userStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch (error) {
    // 用户取消退出
  }
}

const truncateDescription = (description) => {
  if (!description) return '暂无描述'
  return description.length > 60 ? description.substring(0, 60) + '...' : description
}

const handlePageChange = (page) => {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleSortChange = () => {
  currentPage.value = 1
  loadProducts()
}

const handleCategoryChange = () => {
  currentPage.value = 1
  loadProducts()
}

// 模拟数据
const getMockProducts = () => {
  return [
    {
      id: 1,
      name: 'iPhone 15 Pro',
      price: 7999,
      stock: 50,
      description: '最新款苹果手机，A17芯片，钛金属机身',
      image: 'https://picsum.photos/300/200?random=1',
      imageUrl: 'https://picsum.photos/300/200?random=1',
      category: '手机',
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'MacBook Pro',
      price: 12999,
      stock: 30,
      description: '专业级笔记本电脑，M2芯片',
      image: 'https://picsum.photos/300/200?random=2',
      imageUrl: 'https://picsum.photos/300/200?random=2',
      category: '电脑',
      createdAt: '2024-01-10'
    }
  ].map(p => ({
    ...p,
    imageUrl: p.imageUrl || p.image // 确保有imageUrl
  }))
}

// 生命周期
onMounted(() => {
  loadProducts()
})
</script>

<!-- 样式部分保持不变 -->
<style scoped>
.home-container {
  min-height: 100vh;
  background: #f8f9fa;
}

.header {
  background: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 30px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  color: #e1251b;
  font-size: 28px;
  font-weight: bold;
  margin: 0;
}

.search-section {
  flex: 1;
  max-width: 600px;
  margin: 0 40px;
}

.search-input {
  width: 100%;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.welcome-text {
  color: #666;
  font-size: 14px;
}

.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px;
  min-height: calc(100vh - 80px);
}

.content-header {
  margin-bottom: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.search-status {
  display: flex;
  align-items: center;
  gap: 15px;
  background: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-result {
  font-weight: 500;
  color: #333;
}

.product-count {
  color: #e1251b;
  font-size: 14px;
  font-weight: 500;
}

.filter-controls {
  display: flex;
  gap: 15px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.product-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.product-image-container {
  position: relative;
  height: 200px;
  overflow: hidden;
  cursor: pointer;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image {
  transform: scale(1.05);
}

.product-actions {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.product-card:hover .product-actions {
  opacity: 1;
}

.action-btn {
  padding: 8px 16px;
  font-size: 12px;
}

.low-stock-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ff4d4f;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.product-info {
  padding: 20px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  margin: 0 0 10px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  cursor: pointer;
  transition: color 0.2s;
}

.product-name:hover {
  color: #e1251b;
}

.product-desc {
  color: #666;
  font-size: 13px;
  margin: 0 0 15px;
  line-height: 1.5;
  flex-grow: 1;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.stock-info {
  font-size: 12px;
  color: #999;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-price {
  color: #e1251b;
  font-size: 20px;
  font-weight: bold;
}

.loading-container {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 25px;
}

.skeleton-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.skeleton-content {
  padding: 20px;
}

.empty-state {
  background: white;
  padding: 60px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.cart-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #666;
  text-decoration: none;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s;
}

.cart-link:hover {
  background-color: #f0f0f0;
  color: #e1251b;
}

/* 导航链接样式 */
.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #666;
  text-decoration: none;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s;
  position: relative;
}

.nav-link:hover {
  background-color: #f0f0f0;
  color: #e1251b;
}

.nav-link .el-icon {
  font-size: 20px;
}
/* 管理员入口样式 */
.admin-dropdown {
  cursor: pointer;
}

.admin-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #666;
  border-radius: 50%;
  transition: all 0.2s;
  text-decoration: none;
}

.admin-link:hover {
  background-color: #f0f0f0;
  color: #e1251b;
}

.admin-link .el-icon {
  font-size: 20px;
}

/* 下拉菜单样式 */
.el-dropdown-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

/* 保持现有导航链接样式 */
.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #666;
  text-decoration: none;
  border-radius: 50%;
  transition: background-color 0.2s, color 0.2s;
  position: relative;
}

.nav-link:hover {
  background-color: #f0f0f0;
  color: #e1251b;
}

.nav-link .el-icon {
  font-size: 20px;
}
/* 响应式设计 */
@media (max-width: 1200px) {
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .header-content {
    padding: 0 20px;
  }
  
  .main-content {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    height: auto;
    padding: 15px 20px;
    gap: 15px;
  }
  
  .search-section {
    margin: 0;
    max-width: 100%;
    order: 3;
    width: 100%;
  }
  
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  .content-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .products-grid {
    grid-template-columns: 1fr;
  }
}

</style>