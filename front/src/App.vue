<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import MobileBottomNav from '@/components/MobileBottomNav.vue'

const route = useRoute()
const userStore = useUserStore()

const showMobileNav = computed(() => {
  if (!userStore.user || userStore.user.role !== 'customer') return false
  const p = route.path
  const customerPaths = ['/home', '/cart', '/checkout', '/orders', '/product']
  return customerPaths.some((prefix) => p === prefix || p.startsWith(prefix + '/'))
})

const appClass = computed(() => ({
  'has-mobile-nav': showMobileNav.value
}))
</script>

<template>
  <div id="app-root" :class="appClass">
    <router-view />
    <MobileBottomNav v-if="showMobileNav" />
  </div>
</template>

<style scoped>
#app-root {
  min-height: 100vh;
  width: 100%;
}
</style>
