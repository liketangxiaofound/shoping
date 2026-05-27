<!-- 商品推荐横向列表 -->
<template>
  <section v-if="products.length" class="recommend-strip">
    <div class="strip-header">
      <h3>{{ title }}</h3>
      <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
    </div>
    <div class="strip-scroll">
      <div
        v-for="item in products"
        :key="item.id"
        class="rec-card"
        @click="goDetail(item.id)"
      >
        <img :src="item.imageUrl" :alt="item.name" class="rec-img" @error="onImgError" />
        <div class="rec-body">
          <p class="rec-name">{{ item.name }}</p>
          <p class="rec-price">¥{{ item.price.toFixed(2) }}</p>
          <el-tag v-if="item.category" size="small" type="info">{{ item.category }}</el-tag>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  title: { type: String, default: '推荐商品' },
  subtitle: { type: String, default: '' },
  products: { type: Array, default: () => [] }
})

const router = useRouter()

const goDetail = (id) => router.push(`/product/${id}`)

const onImgError = (e) => {
  if (e.target.dataset.fallback === '1') return
  e.target.dataset.fallback = '1'
  e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'
}
</script>

<style scoped>
.recommend-strip {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #eee;
  text-align: left;
}
.strip-header {
  margin-bottom: 16px;
}
.strip-header h3 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #303133;
}
.subtitle {
  font-size: 13px;
  color: #909399;
}
.strip-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.rec-card {
  flex: 0 0 180px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}
.rec-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
.rec-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  background: #f5f7fa;
}
.rec-body {
  padding: 10px 12px;
}
.rec-name {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rec-price {
  margin: 0 0 8px;
  color: #e1251b;
  font-weight: 600;
  font-size: 15px;
}
</style>
