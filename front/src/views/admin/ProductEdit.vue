<!-- src/views/admin/ProductEdit.vue -->
<template>
  <div class="product-edit">
    <div class="page-header">
      <h2 class="page-title">{{ isEdit ? '编辑商品' : '添加商品' }}</h2>
      <el-button @click="$router.back()">返回</el-button>
    </div>

    <el-card>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="product-form"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入商品名称"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            :step="0.1"
            placeholder="请输入价格"
          />
          <span class="unit">元</span>
        </el-form-item>

        <el-form-item label="库存" prop="stock">
          <el-input-number
            v-model="form.stock"
            :min="0"
            :step="1"
            placeholder="请输入库存数量"
          />
          <span class="unit">件</span>
        </el-form-item>

        <el-form-item label="分类" prop="category">
          <el-select
            v-model="form.category"
            placeholder="请选择分类"
            filterable
            allow-create
          >
            <el-option
              v-for="cat in categories"
              :key="cat"
              :label="cat"
              :value="cat"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="商品图片" prop="imageUrl">
          <el-upload
            class="image-upload"
            action="/api/upload"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
          >
            <img v-if="form.imageUrl" :src="form.imageUrl" class="product-image" />
            <el-icon v-else class="image-upload-icon"><Plus /></el-icon>
          </el-upload>
          <div class="upload-tip">点击上传商品图片，建议尺寸 800x800</div>
        </el-form-item>

        <el-form-item label="商品描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入商品描述"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio label="active">上架</el-radio>
            <el-radio label="inactive">下架</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            {{ isEdit ? '更新商品' : '创建商品' }}
          </el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const loading = ref(false)

const isEdit = computed(() => route.name === 'AdminProductEdit')

const form = ref({
  name: '',
  price: 0,
  stock: 0,
  category: '',
  imageUrl: '',
  description: '',
  status: 'active'
})

const categories = ref([])

const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格不能为负数', trigger: 'blur' }
  ],
  stock: [
    { required: true, message: '请输入库存', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存不能为负数', trigger: 'blur' }
  ]
}

// 获取商品详情
const fetchProductDetail = async (id) => {
  try {
    const response = await request.get(`/api/admin/products/${id}`)
    if (response.success) {
      form.value = response.data.product
    }
  } catch (error) {
    console.error('获取商品详情失败:', error)
    ElMessage.error('获取商品详情失败')
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

// 图片上传处理
const handleImageSuccess = (response) => {
  if (response.success) {
    form.value.imageUrl = response.data.url
    ElMessage.success('图片上传成功')
  }
}

const beforeImageUpload = (file) => {
  const isJPGOrPNG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPGOrPNG) {
    ElMessage.error('图片只能是 JPG/PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 提交表单
const handleSubmit = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  try {
    const url = isEdit.value 
      ? `/api/admin/products/${route.params.id}`
      : '/api/admin/products'
    
    const method = isEdit.value ? 'put' : 'post'
    
    const response = await request[method](url, form.value)
    
    if (response.success) {
      ElMessage.success(isEdit.value ? '商品更新成功' : '商品创建成功')
      router.push('/admin/products')
    }
  } catch (error) {
    console.error('保存商品失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCategories()
  if (isEdit.value) {
    fetchProductDetail(route.params.id)
  }
})
</script>

<style scoped>
.product-edit {
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

.product-form {
  max-width: 600px;
}

.unit {
  margin-left: 10px;
  color: #666;
}

.image-upload {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-upload:hover {
  border-color: #409eff;
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-upload-icon {
  font-size: 28px;
  color: #8c939d;
}

.upload-tip {
  margin-top: 7px;
  color: #666;
  font-size: 12px;
}
</style>