<script setup>

import { useRoute } from 'vue-router'
import { watch } from 'vue'

const route = useRoute()
watch(
  () => route.path,
  (newPath) => {
    // console.log('🎯 当前匹配的路由:', newPath)
    // console.log('🧩 matched:', route.matched)
  },
  { immediate: true }
)
</script>

<template>
  
  <router-view></router-view>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
#app {
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
  box-sizing: border-box;
}
</style>
