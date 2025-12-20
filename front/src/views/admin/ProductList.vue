<!-- src/views/admin/ProductList.vue -->
<template>
  <div class="product-management">
    <div class="page-header">
      <h2 class="page-title">商品管理</h2>
      <el-button type="primary" @click="$router.push('/admin/products/new')">
        <el-icon><Plus /></el-icon>
        添加商品
      </el-button>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card">
      <div class="search-form">
        <el-input
          v-model="searchParams.keyword"
          placeholder="搜索商品名称"
          style="width: 300px"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button @click="handleSearch" :icon="Search">搜索</el-button>
          </template>
        </el-input>
        
        <el-select v-model="searchParams.category" placeholder="分类筛选" clearable>
          <el-option
            v-for="category in categories"
            :key="category"
            :label="category"
            :value="category"
          />
        </el-select>
        
        <el-select v-model="searchParams.status" placeholder="状态筛选" clearable>
          <el-option label="在售" value="active" />
          <el-option label="下架" value="inactive" />
        </el-select>
      </div>
    </el-card>

    <!-- 商品表格 -->
    <el-card>
      <el-table :data="products" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="商品名称" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editProduct(row.id)">编辑</el-button>
            <el-button 
              size="small" 
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleProductStatus(row)"
            >
              {{ row.status === 'active' ? '下架' : '上架' }}
            </el-button>
            <el-button size="small" type="danger" @click="deleteProduct(row)">删除</el-button>
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
import { Search, Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

const router = useRouter()

const products = ref([])
const categories = ref([])
const loading = ref(false)
const searchParams = ref({
  keyword: '',
  category: '',
  status: ''
})

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0
})

// 获取商品列表
const fetchProducts = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...searchParams.value
    }
    
    const response = await request.get('/api/admin/products', { params })
    if (response.success) {
      products.value = response.data.products || []
      pagination.value.total = response.data.total || 0
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await request.get('/api/products/categories')
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('获取分类列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  fetchProducts()
}

// 分页
const handlePageChange = (page) => {
  pagination.value.page = page
  fetchProducts()
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  fetchProducts()
}

// 编辑商品
const editProduct = (id) => {
  router.push(`/admin/products/${id}/edit`)
}

// 上下架商品
const toggleProductStatus = async (product) => {
  try {
    const action = product.status === 'active' ? '下架' : '上架'
    await ElMessageBox.confirm(`确定要${action}商品 "${product.name}" 吗？`, '确认操作')
    
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    const response = await request.put(`/api/admin/products/${product.id}/status`, {
      status: newStatus
    })
    
    if (response.success) {
      ElMessage.success(`${action}成功`)
      fetchProducts()
    }
  } catch (error) {
    // 用户取消
  }
}

// 删除商品
const deleteProduct = async (product) => {
  try {
    await ElMessageBox.confirm(`确定要删除商品 "${product.name}" 吗？此操作不可恢复！`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
    
    const response = await request.delete(`/api/admin/products/${product.id}`)
    if (response.success) {
      ElMessage.success('删除成功')
      fetchProducts()
    }
  } catch (error) {
    // 用户取消
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchProducts()
  fetchCategories()
})
</script>

<style scoped>
.product-management {
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

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  gap: 15px;
  align-items: center;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.product-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>