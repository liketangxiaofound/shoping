<!-- 数据导入/导出（管理员 / 卖家共用） -->
<template>
  <div class="data-io-panel">
    <div class="page-header">
      <h2>数据导入 / 导出</h2>
      <p class="hint">3.4 附加功能 · 支持 CSV（UTF-8，可用 Excel 打开）</p>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :md="12">
        <el-card>
          <template #header><span>数据导出</span></template>
          <p class="card-desc">将数据导出为 CSV 文件到本地。</p>
          <div class="export-list">
            <el-button
              v-for="item in exportOptions"
              :key="item.type"
              type="primary"
              plain
              :loading="exporting === item.type"
              @click="handleExport(item)"
            >
              {{ item.label }}
            </el-button>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12">
        <el-card>
          <template #header><span>商品导入</span></template>
          <p class="card-desc">
            上传 CSV 批量新增商品。表头：
            <code>name,price,stock,category,description,image,status</code>
          </p>
          <div class="import-actions">
            <el-button @click="downloadTemplate">下载导入模板</el-button>
            <el-upload
              :auto-upload="false"
              :show-file-list="false"
              accept=".csv,text/csv"
              :on-change="onFileChange"
            >
              <el-button type="success">选择 CSV 文件</el-button>
            </el-upload>
            <el-button
              type="primary"
              :loading="importing"
              :disabled="!selectedFile"
              @click="handleImport"
            >
              开始导入
            </el-button>
          </div>
          <p v-if="selectedFile" class="file-name">已选：{{ selectedFile.name }}</p>
          <el-alert
            v-if="importResult"
            :title="importResult.message"
            :type="importResult.failed > 0 ? 'warning' : 'success'"
            show-icon
            class="result-alert"
          />
          <ul v-if="importResult?.errors?.length" class="error-list">
            <li v-for="(e, i) in importResult.errors" :key="i">第 {{ e.line }} 行：{{ e.message }}</li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadAuthenticatedFile, uploadCsvFile } from '@/utils/fileDownload'

const props = defineProps({
  mode: {
    type: String,
    default: 'admin' // admin | seller
  }
})

const exporting = ref('')
const importing = ref(false)
const selectedFile = ref(null)
const importResult = ref(null)

const adminExports = [
  { type: 'products', label: '导出商品' },
  { type: 'orders', label: '导出订单' },
  { type: 'purchases', label: '导出购买记录' },
  { type: 'users', label: '导出用户' },
  { type: 'login_logs', label: '导出登录日志' },
  { type: 'browse_logs', label: '导出浏览日志' }
]

const sellerExports = [{ type: 'products', label: '导出我的商品' }]

const exportOptions = computed(() => (props.mode === 'seller' ? sellerExports : adminExports))

const exportUrl = (type) => {
  if (props.mode === 'seller') return '/api/seller/data-export/products'
  return `/api/admin/data-export/${type}`
}

const templateUrl = () =>
  props.mode === 'seller' ? '/api/seller/data-import/template' : '/api/admin/data-import/template'

const importUrl = () =>
  props.mode === 'seller' ? '/api/seller/data-import/products' : '/api/admin/data-import/products'

async function handleExport(item) {
  exporting.value = item.type
  try {
    const url = exportUrl(item.type)
    const name =
      props.mode === 'seller'
        ? `products_${Date.now()}.csv`
        : `${item.type}_${Date.now()}.csv`
    await downloadAuthenticatedFile(url, name)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally {
    exporting.value = ''
  }
}

async function downloadTemplate() {
  try {
    await downloadAuthenticatedFile(templateUrl(), 'product_import_template.csv')
  } catch {
    ElMessage.error('模板下载失败')
  }
}

function onFileChange(uploadFile) {
  selectedFile.value = uploadFile?.raw || null
  importResult.value = null
}

async function handleImport() {
  if (!selectedFile.value) return
  importing.value = true
  importResult.value = null
  try {
    const res = await uploadCsvFile(importUrl(), selectedFile.value)
    importResult.value = res.data || res
    if (res.success) ElMessage.success(res.message || res.data?.message || '导入完成')
    else ElMessage.warning(res.message || '部分导入失败')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.data-io-panel {
  text-align: left;
}
.page-header h2 {
  margin: 0 0 8px;
}
.hint {
  color: #909399;
  font-size: 13px;
  margin: 0 0 20px;
}
.card-desc {
  font-size: 13px;
  color: #606266;
  margin: 0 0 16px;
  line-height: 1.6;
}
.card-desc code {
  font-size: 12px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 4px;
}
.export-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.import-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.file-name {
  margin-top: 12px;
  font-size: 13px;
  color: #409eff;
}
.result-alert {
  margin-top: 16px;
}
.error-list {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 12px;
  color: #e6a23c;
}
</style>
