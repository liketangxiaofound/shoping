<!-- src/views/admin/SellerList.vue -->
<template>
  <div class="admin-seller-list">
    <div class="page-header">
      <h2>销售人员管理</h2>
      <el-button type="primary" @click="openCreateDialog">新增销售人员</el-button>
    </div>

    <el-card>
      <el-table :data="sellers" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="warning" size="small" @click="resetPassword(row)">重置密码</el-button>
            <el-button type="danger" size="small" @click="deleteSeller(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="createDialogVisible" title="新增销售人员" width="520px" destroy-on-close>
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="用户名" required>
          <el-input v-model="createForm.username" />
        </el-form-item>
        <el-form-item label="邮箱" required>
          <el-input v-model="createForm.email" />
        </el-form-item>
        <el-form-item label="初始密码">
          <el-input v-model="createForm.password" placeholder="默认 123456" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createSeller">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const sellers = ref([])
const loading = ref(false)
const createDialogVisible = ref(false)
const createForm = ref({ username: '', email: '', password: '123456' })

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback

const fetchSellers = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/admin/sellers')
    if (response.success) {
      sellers.value = response.data || []
    }
  } catch (error) {
    console.error('获取销售人员失败:', error)
    ElMessage.error('获取销售人员失败')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  createForm.value = { username: '', email: '', password: '123456' }
  createDialogVisible.value = true
}

const createSeller = async () => {
  if (!createForm.value.username || !createForm.value.email) {
    ElMessage.warning('用户名和邮箱为必填项')
    return
  }
  try {
    const response = await request.post('/api/admin/sellers', { ...createForm.value })
    if (response.success) {
      ElMessage.success('销售人员创建成功')
      createDialogVisible.value = false
      fetchSellers()
    }
  } catch (error) {
    console.error('创建销售人员失败:', error)
    ElMessage.error(getErrorMessage(error, '创建失败'))
  }
}

const deleteSeller = async (seller) => {
  try {
    await ElMessageBox.confirm(`确认删除销售人员 ${seller.username} 吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    const response = await request.delete(`/api/admin/sellers/${seller.id}`)
    if (response.success) {
      ElMessage.success('删除成功')
      fetchSellers()
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '删除失败'))
    }
  }
}

const resetPassword = async (seller) => {
  try {
    const { value: password } = await ElMessageBox.prompt('请输入新密码', '密码重置', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValue: '123456',
      inputPattern: /\S+/, 
      inputErrorMessage: '请输入有效密码'
    })

    const response = await request.put(`/api/admin/sellers/${seller.id}/reset-password`, { password })
    if (response.success) {
      ElMessage.success('密码重置成功')
    }
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(getErrorMessage(error, '密码重置失败'))
    }
  }
}

onMounted(() => {
  fetchSellers()
})
</script>

<style scoped>
.admin-seller-list {
  padding: 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
