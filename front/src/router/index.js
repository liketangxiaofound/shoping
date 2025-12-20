// router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import LoginView from '@/views/Login.vue'
import HomeView from '@/views/Home.vue'
import RegisterView from '@/views/Register.vue'
import CartView from '@/views/Cart.vue'
import CheckoutView from '@/views/Checkout.vue'
import PaymentView from '@/views/Payment.vue'
import OrderView from '@/views/Order.vue'
import OrderDetail from '../views/OrderDetail.vue'
import ProductDetail from '../views/ProductDetail.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
const routes = [
  {
    path: '/',
     redirect: '/home' // 首页默认跳转到登录
  },
  {
    path: '/login',
    component: LoginView,
    meta: { guestOnly: true } // 可选：已登录用户不应再进登录页
  },
  {
    path: '/register',
    component: RegisterView,
    meta: { guestOnly: true }
  },
  {
    path: '/home',
    component: HomeView,
    meta: { requiresAuth: true } // ← 需要登录
  },
  {
    path: '/cart',
    component: CartView,
    meta: { requiresAuth: true } // ← 需要登录
  },
  {
    path:'/checkout',
    component:CheckoutView,
    meta: { requiresAuth: true } 
  },
  {
    path:'/order/:id/pay',
    component:PaymentView,
    meta: { requiresAuth: true } 
  },
  {
     path:'/orders',
    component:OrderView,
    meta: { requiresAuth: true } 
  },
  {
    path:'/product/:id',
    component:ProductDetail,
    meta:{ requiresAuth: true } 
  },
  {
    path:'/orders/:id',
    component:OrderDetail,
    meta: { requiresAuth: true } 
  },
   {
    path: '/admin',
    component: AdminLayout,
    redirect: '/admin/dashboard',
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue')
      },
      {
        path: 'products',
        name: 'AdminProducts',
        component: () => import('@/views/admin/ProductList.vue')
      },
      {
        path: 'products/new',
        name: 'AdminProductNew',
        component: () => import('@/views/admin/ProductEdit.vue')
      },
      {
        path: 'products/:id/edit',
        name: 'AdminProductEdit',
        component: () => import('@/views/admin/ProductEdit.vue')
      },
      {
        path: 'orders',
        name: 'AdminOrders',
        component: () => import('@/views/admin/OrderList.vue')
      },
      // {
      //   path: 'users',
      //   name: 'AdminUsers',
      //   component: () => import('@/views/admin/UserList.vue')
      // }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

import { useUserStore } from '@/store/user'



router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const isLoggedIn = !!userStore.user // 或者用 userStore.isLoggedIn

  // 1. 如果目标路由需要登录，但用户未登录 → 跳转到登录页
  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ path: '/login' })
    return
  }

  // 2. （可选）如果用户已登录，却试图访问登录/注册页 → 跳转到首页
  if (to.meta.guestOnly && isLoggedIn) {
    next({ path: '/home' })
    return
  }

    // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && userStore.user?.role !== 'admin') {
    ElMessage.warning('无权限访问管理后台')
    next('/')
    return
  }

  // 3. 其他情况：放行
  next()
})

export default router