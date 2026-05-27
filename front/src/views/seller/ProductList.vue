<!-- src/views/seller/ProductList.vue -->
<template>
  <div class="seller-product-list">
    <div class="page-header">
      <h2>商品管理</h2>
      <el-button type="primary" @click="openAddProduct">
        添加商品
      </el-button>
    </div>

    <el-card class="search-card">
      <div class="search-form">
        <el-input
          v-model="searchParams.keyword"
          placeholder="搜索商品名称或描述"
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
            :key="category.id ?? category"
            :label="category.name || category"
            :value="category.name || category"
          />
        </el-select>

        <el-select v-model="searchParams.status" placeholder="状态筛选" clearable>
          <el-option label="在售" value="active" />
          <el-option label="下架" value="inactive" />
        </el-select>

        <el-button type="primary" @click="handleSearch">筛选</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </el-card>

    <el-card>
      <el-table :data="products" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" min-width="220" />
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">¥{{ row.price.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="100" />
        <el-table-column prop="category" label="分类" width="140" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditProduct(row)">编辑</el-button>
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
      <div v-if="!loading && products.length === 0" class="empty-state">
        <el-empty description="当前无商品，点击“添加商品”创建第一个商品。" />
      </div>

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

    <el-dialog
      :title="isEdit ? '编辑商品' : '新增商品'"
      v-model="dialogVisible"
      width="640px"
      destroy-on-close
    >
      <el-form ref="productFormRef" :model="productForm" :rules="rules" label-width="100px" :status-icon="true">
        <el-form-item label="商品名称" prop="name" required>
          <el-input v-model="productForm.name" />
        </el-form-item>
        <el-form-item label="价格" prop="price" required>
          <el-input-number v-model="productForm.price" :min="0" :step="0.01" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="库存" prop="stock" required>
          <el-input-number v-model="productForm.stock" :min="0" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="productForm.category" placeholder="选择分类" clearable>
            <el-option
              v-for="category in categories"
              :key="category.id ?? category"
              :label="category.name || category"
              :value="category.id ?? category"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="商品图片" prop="imageUrl">
          <el-upload
            class="upload-demo"
            drag
            name="image"
            action="/api/upload/image"
            :headers="uploadHeaders"
            :data="{ prefix: 'products' }"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :show-file-list="false"
            accept="image/*"
          >
            <i class="el-icon-upload"></i>
            <div class="el-upload__text">将图片拖到此处，或<em>点击上传</em></div>
            <div class="el-upload__tip">支持 JPG/PNG/GIF/WebP，最大 5MB</div>
          </el-upload>
          <el-input
            v-model="productForm.imageUrl"
            placeholder="或手动输入图片 URL"
            clearable
            class="image-url-input"
          />
          <img v-if="productForm.imageUrl" :src="productForm.imageUrl" class="preview-image" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="productForm.status">
            <el-option label="在售" value="active" />
            <el-option label="下架" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input type="textarea" v-model="productForm.description" rows="4" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

const products = ref([])
const categories = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const productFormRef = ref(null)
const pagination = ref({ page: 1, limit: 10, total: 0 })
const searchParams = ref({ keyword: '', category: '', status: '' })
const productForm = ref({
  id: null,
  name: '',
  price: 0,
  stock: 0,
  description: '',
  category: '',
  imageUrl: '',
  status: 'active'
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${window.localStorage.getItem('token') || ''}`
}))

const rules = {
  name: [{ required: true, message: '请输入商品名称', trigger: 'blur' }],
  price: [
    { required: true, message: '请输入商品价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格必须大于等于 0', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择商品状态', trigger: 'change' }],
  imageUrl: [
    { type: 'url', message: '请输入有效的图片 URL', trigger: 'blur' }
  ]
}

const fetchProducts = async () => {
  console.log('[ProductList] fetchProducts start', { page: pagination.value.page, limit: pagination.value.limit, searchParams: searchParams.value })
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      ...searchParams.value
    }
    const response = await request.get('/api/seller/products', { params })
    if (response.success) {
      products.value = response.data.products || []
      pagination.value.total = response.data.total || 0
    }
  } catch (error) {
    console.error('获取卖家商品列表失败:', error)
    ElMessage.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

const fetchCategories = async () => {
  try {
    const response = await request.get('/api/products/categories')
    if (response.success && Array.isArray(response.data)) {
      categories.value = response.data
    }
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  fetchProducts()
}

const beforeUpload = (file) => {
  const isValidType = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isValidType) {
    ElMessage.error('上传图片只能是 JPG/PNG/GIF/WebP 格式')
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
  }
  return isValidType && isLt5M
}

const handleUploadSuccess = (response) => {
  console.log('[ProductList] handleUploadSuccess', response)
  if (response.success) {
    productForm.value.imageUrl = response.data.url
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '图片上传失败')
  }
}

const handleUploadError = (error) => {
  console.log('[ProductList] handleUploadError', error)
  console.error('图片上传错误', error)
  ElMessage.error('图片上传失败，请重试')
}

const resetFilter = () => {
  searchParams.value = { keyword: '', category: '', status: '' }
  pagination.value.page = 1
  fetchProducts()
}

const handlePageChange = (page) => {
  pagination.value.page = page
  fetchProducts()
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
  fetchProducts()
}

const openAddProduct = () => {
  console.log('[ProductList] openAddProduct called')
  isEdit.value = false
  productForm.value = {
    id: null,
    name: '',
    price: 0,
    stock: 0,
    description: '',
    category: '',
    imageUrl: '',
    status: 'active'
  }
  console.log('[ProductList] openAddProduct reset form', productForm.value)
  nextTick(() => {
    productFormRef.value?.clearValidate()
    console.log('[ProductList] openAddProduct cleared validation')
  })
  dialogVisible.value = true
  console.log('[ProductList] openAddProduct set dialogVisible = true')
}

const openEditProduct = (product) => {
  console.log('[ProductList] openEditProduct called', product)
  isEdit.value = true
  productForm.value = {
    id: product.id,
    name: product.name,
    price: product.price,
    stock: product.stock,
    description: product.description || '',
    category: product.categoryId || product.category || '',
    imageUrl: product.image || '',
    status: product.status
  }
  nextTick(() => {
    productFormRef.value?.clearValidate()
    console.log('[ProductList] openEditProduct cleared validation')
  })
  dialogVisible.value = true
  console.log('[ProductList] openEditProduct set dialogVisible = true')
}

const submitProduct = async () => {
  console.log('[ProductList] submitProduct called')
  productFormRef.value?.validate(async (valid) => {
    console.log('[ProductList] submitProduct validation result', valid)
    if (!valid) {
      return
    }

    try {
      const payload = {
        name: productForm.value.name,
        price: productForm.value.price,
        stock: productForm.value.stock,
        description: productForm.value.description,
        imageUrl: productForm.value.imageUrl,
        status: productForm.value.status
      }
      if (productForm.value.category !== '') {
        const matchedCategory = categories.value.find(
          (cat) => (cat.id ?? cat) === productForm.value.category
        )
        if (matchedCategory && matchedCategory.id !== undefined) {
          payload.categoryId = productForm.value.category
        } else {
          payload.category = productForm.value.category
        }
      }

      let response
      if (isEdit.value) {
        response = await request.put(`/api/seller/products/${productForm.value.id}`, payload)
      } else {
        response = await request.post('/api/seller/products', payload)
      }

      if (response.success) {
        ElMessage.success('保存成功')
        dialogVisible.value = false
        fetchProducts()
      }
    } catch (error) {
      console.error('保存商品失败:', error)
      const message = error?.response?.data?.message || '保存失败'
      ElMessage.error(message)
    }
  })
}

const toggleProductStatus = async (product) => {
  try {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    await request.put(`/api/seller/products/${product.id}/status`, { status: newStatus })
    ElMessage.success('状态更新成功')
    fetchProducts()
  } catch (error) {
    console.error('更新商品状态失败:', error)
    ElMessage.error('更新失败')
  }
}

const deleteProduct = async (product) => {
  try {
    await ElMessageBox.confirm(`确定删除商品“${product.name}”吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    const response = await request.delete(`/api/seller/products/${product.id}`)
    if (response.success) {
      ElMessage.success('删除成功')
      fetchProducts()
    }
  } catch (error) {
    console.error('删除商品失败:', error)
    const message = error?.response?.data?.message || '删除失败'
    if (message !== 'canceled') {
      ElMessage.error(message)
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

watch(dialogVisible, (val) => {
  console.log('[ProductList] dialogVisible changed', val)
})

onMounted(() => {
  console.log('[ProductList] mounted', { dialogVisible: dialogVisible.value })
  fetchProducts()
  fetchCategories()
})
</script>

<style scoped>
.seller-product-list {
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
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.empty-state {
  padding: 40px 0;
  display: flex;
  justify-content: center;
}

.upload-demo {
  width: 100%;
  margin-bottom: 16px;
}

.image-url-input {
  margin-top: 12px;
}

.preview-image {
  max-width: 200px;
  margin-top: 12px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
}
</style>
