// src/store/cart.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '@/utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import {useRouter} from 'vue-router'
export const useCartStore = defineStore('cart', () => {
  // === state ===
  const items = ref([])
  const loading = ref(false)

  // === getters ===
  const itemCount = computed(() =>
    items.value.reduce((total, item) => total + item.quantity, 0)
  )

  const totalPrice = computed(() =>
    items.value.reduce((total, item) => {
      return total + (item.product?.price || 0) * item.quantity
    }, 0)
  )

  const isEmpty = computed(() => items.value.length === 0)

  // === actions ===

  // GET /api/carts
  const fetchCart = async () => {
  loading.value = true
  try {
    const res = await request.get('/api/carts')
    if (res.success) {
      // ✅ 后端返回的是 { data: { item: [...] } }
      items.value = res.data?.item || []
      console.log('🛒 购物车加载成功:', items.value)
    } else {
      ElMessage.error('加载购物车失败')
    }
  } catch (error) {
    console.error('加载购物车错误:', error)
    if (error.response?.status !== 401) {
      ElMessage.error('网络错误，请稍后重试')
    }
  } finally {
    loading.value = false
  }
}

  // POST /api/carts
  const addToCart = async (product, quantity = 1) => {
    try {
      const res = await request.post('/api/carts', {
        productId: product.id,
        quantity,
      })
      if (res.success) {
        ElMessage.success(`已添加 ${product.name} 到购物车`)
        await fetchCart() // 同步最新状态
      } else {
        ElMessage.error(res.message || '添加失败')
      }
    } catch (error) {
      console.error('添加购物车失败:', error)
      ElMessage.error('网络错误，请重试')
    }
  }

  // PUT /api/carts/:itemId
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return

    try {
      const res = await request.put(`/api/carts/${itemId}`, {
        quantity: newQuantity,
      })
      if (res.success) {
        const item = items.value.find(i => i.id === itemId)
        if (item) {
          item.quantity = newQuantity
        }
      } else {
        ElMessage.error(res.message || '更新数量失败')
      }
    } catch (error) {
      console.error('更新数量失败:', error)
      ElMessage.error('更新失败，请重试')
    }
  }

  // DELETE /api/carts/:itemId
  const removeFromCart = async (itemId) => {
    try {
      const res = await request.delete(`/api/carts/${itemId}`)
      if (res.success) {
        items.value = items.value.filter(item => item.id !== itemId)
        ElMessage.success('已删除商品')
      } else {
        ElMessage.error(res.message || '删除失败')
      }
    } catch (error) {
      console.error('删除商品失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }

  // DELETE /api/carts （清空）
  const clearCart = async () => {
    try {
      await ElMessageBox.confirm('确定要清空购物车吗？', '提示', {
        type: 'warning',
      })
      const res = await request.delete('/api/carts')
      if (res.success) {
        items.value = []
        ElMessage.success('购物车已清空')
      } else {
        ElMessage.error(res.message || '清空失败')
      }
    } catch (error) {
      // 用户取消
    }
  }
  const router=useRouter()
  const checkout = () => {
    
    router.push('/checkout')
  }

   const removeItemsByProductIds = async (productIds) => {
    try {
      const itemsToRemove = items.value.filter(item => 
        productIds.includes(item.productId)
      )
      
      // 批量删除每个商品
      for (const item of itemsToRemove) {
        await removeFromCart(item.id)
      }
      
      console.log('✅ 已移除商品:', productIds)
      return { success: true }
    } catch (error) {
      console.error('批量删除商品失败:', error)
      return { success: false, error }
    }
  }

  // === return ===
  return {
    // state
    items,
    loading,

    // getters
    itemCount,
    totalPrice,
    isEmpty,

    // actions
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
    removeItemsByProductIds
  }
})