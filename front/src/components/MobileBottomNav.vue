<!-- 移动端底部导航（用户端） -->
<template>
  <nav class="mobile-bottom-nav safe-bottom" aria-label="主导航">
    <router-link
      v-for="item in items"
      :key="item.path"
      :to="item.path"
      class="nav-item"
      :class="{ active: isActive(item) }"
    >
      <el-icon :size="22"><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { House, ShoppingCart, Document, User } from '@element-plus/icons-vue'

const route = useRoute()

const items = [
  { path: '/home', label: '首页', icon: House, match: ['/home'] },
  { path: '/cart', label: '购物车', icon: ShoppingCart, match: ['/cart', '/checkout'] },
  { path: '/orders', label: '订单', icon: Document, match: ['/orders'] },
  { path: '/home', label: '我的', icon: User, match: [] }
]

function isActive(item) {
  const p = route.path
  if (item.label === '我的') return false
  return item.match.some((m) => p === m || p.startsWith(m + '/'))
}
</script>

<style scoped>
.mobile-bottom-nav {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  height: 56px;
  background: #fff;
  border-top: 1px solid #ebeef5;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  justify-content: space-around;
  align-items: center;
}

@media (max-width: 768px) {
  .mobile-bottom-nav {
    display: flex;
  }
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #909399;
  text-decoration: none;
  font-size: 11px;
  padding: 4px 0;
  min-height: 44px;
}

.nav-item.active {
  color: #e1251b;
}

.nav-item .el-icon {
  font-size: 22px;
}
</style>
