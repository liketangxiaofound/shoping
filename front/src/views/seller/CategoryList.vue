<!-- src/views/seller/CategoryList.vue -->
<template>
  <div class="seller-category-list">
    <div class="page-header">
      <h2>分类管理</h2>
      <div class="actions">
        <el-input
          v-model="newCategory"
          placeholder="输入分类名称"
          size="small"
          style="width: 260px"
        />
        <el-button type="primary" @click="createCategory">新增分类</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="categories" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="分类名称" />
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button type="danger" size="small" @click="deleteCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const categories = ref([])
const newCategory = ref('')
const loading = ref(false)

const fetchCategories = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/seller/categories')
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('获取分类失败:', error)
    ElMessage.error('获取分类失败')
  } finally {
    loading.value = false
  }
}

const createCategory = async () => {
  if (!newCategory.value.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }

  try {
    const response = await request.post('/api/seller/categories', { name: newCategory.value.trim() })
    if (response.success) {
      ElMessage.success('分类创建成功')
      newCategory.value = ''
      fetchCategories()
    }
  } catch (error) {
    console.error('创建分类失败:', error)
    ElMessage.error('创建分类失败')
  }
}

const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(`确认删除分类“${category.name}”吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    const response = await request.delete(`/api/seller/categories/${category.id}`)
    if (response.success) {
      ElMessage.success('分类删除成功')
      fetchCategories()
    }
  } catch (error) {
    // 用户取消或失败
  }
}

onMounted(() => {
  fetchCategories()
})
</script>

<style scoped>
.seller-category-list {
  padding: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  gap: 12px;
  align-items: center;
}
</style>
