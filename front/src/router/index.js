// router/index.js
import { createRouter, createWebHashHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import LoginView from '@/views/Login.vue'
import HomeView from '@/views/Home.vue'
import RegisterView from '@/views/Register.vue'
import CartView from '@/views/Cart.vue'
import CheckoutView from '@/views/Checkout.vue'
import PaymentView from '@/views/Payment.vue'
import OrderView from '@/views/Order.vue'
import OrderDetail from '../views/OrderDetail.vue'
import ProductDetail from '../views/ProductDetail.vue'
import SellerView from '@/views/Seller.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
const routes = [
  {
    path: '/',
    redirect: '/login'
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
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
    path: '/cart',
    component: CartView,
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
    path:'/checkout',
    component:CheckoutView,
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
    path:'/order/:id/pay',
    component:PaymentView,
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
     path:'/orders',
    component:OrderView,
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
    path:'/product/:id',
    component:ProductDetail,
    meta:{ requiresAuth: true, requiresCustomer: true }
  },
  {
    path:'/orders/:id',
    component:OrderDetail,
    meta: { requiresAuth: true, requiresCustomer: true }
  },
  {
    path: '/seller',
    component: SellerView,
    meta: { requiresAuth: true, requiresSeller: true },
    children: [
      {
        path: '',
        redirect: '/seller/products'
      },
      {
        path: 'products',
        name: 'SellerProducts',
        component: () => import('@/views/seller/ProductList.vue')
      },
      // 分类管理不对卖家开放（由平台维护）
      // {
      //   path: 'categories',
      //   name: 'SellerCategories',
      //   component: () => import('@/views/seller/CategoryList.vue')
      // },
      {
        path: 'orders',
        name: 'SellerOrders',
        component: () => import('@/views/seller/OrderList.vue')
      },
      {
        path: 'metrics',
        name: 'SellerMetrics',
        component: () => import('@/views/seller/Metrics.vue')
      },
      {
        path: 'logs',
        name: 'SellerLogs',
        component: () => import('@/views/seller/Logs.vue')
      },
      {
        path: 'data-io',
        name: 'SellerDataIO',
        component: () => import('@/views/seller/DataImportExport.vue')
      }
    ]
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
        path: 'sellers',
        name: 'AdminSellers',
        component: () => import('@/views/admin/SellerList.vue')
      },
      {
        path: 'sellers/performance',
        name: 'AdminSellerPerformance',
        component: () => import('@/views/admin/SellerPerformance.vue')
      },
      {
        path: 'reports/sales',
        name: 'AdminSalesReport',
        component: () => import('@/views/admin/SalesReport.vue')
      },
      {
        path: 'analytics/collection',
        name: 'AdminDataCollection',
        component: () => import('@/views/admin/DataCollection.vue')
      },
      {
        path: 'analytics/user-profiles',
        name: 'AdminUserProfiles',
        component: () => import('@/views/admin/UserProfiles.vue')
      },
      {
        path: 'analytics/sales-trend',
        name: 'AdminSalesTrend',
        component: () => import('@/views/admin/SalesTrend.vue')
      },
      {
        path: 'analytics/sales-trend-chart',
        name: 'AdminSalesTrendChart',
        component: () => import('@/views/admin/SalesTrendChart.vue')
      },
      {
        path: 'analytics/sales-anomalies',
        name: 'AdminSalesAnomaly',
        component: () => import('@/views/admin/SalesAnomaly.vue')
      },
      {
        path: 'analytics/sales-ranking',
        name: 'AdminSalesRanking',
        component: () => import('@/views/admin/SalesRanking.vue')
      },
      {
        path: 'anti-crawler',
        name: 'AdminAntiCrawler',
        component: () => import('@/views/admin/AntiCrawler.vue')
      },
      {
        path: 'data-io',
        name: 'AdminDataIO',
        component: () => import('@/views/admin/DataImportExport.vue')
      }
    ]
  },
  {
    path: '/admin/data-screen',
    name: 'AdminDataScreen',
    component: () => import('@/views/admin/DataScreen.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, fullscreen: true }
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

  const getDefaultRedirect = () => {
    const role = userStore.user?.role
    if (role === 'seller') return '/seller'
    if (role === 'admin') return '/admin/dashboard'
    return '/home'
  }

  // 1. 如果目标路由需要登录，但用户未登录 → 跳转到登录页
  if (to.meta.requiresAuth && !isLoggedIn) {
    next({ path: '/login' })
    return
  }

  // 2. 如果已登录用户访问根路径，直接进入角色首页
  if (to.path === '/' && isLoggedIn) {
    next({ path: getDefaultRedirect() })
    return
  }

  // 3. 如果用户已登录，却试图访问登录/注册页 → 跳转到角色默认页
  if (to.meta.guestOnly && isLoggedIn) {
    next({ path: getDefaultRedirect() })
    return
  }

  // 卖家分类管理已关闭，旧链接重定向到商品管理
  if (to.path === '/seller/categories' || to.path.startsWith('/seller/categories/')) {
    next({ path: '/seller/products' })
    return
  }

  // 卖家仅可访问卖家后台，不可进入购物平台
  if (to.meta.requiresCustomer && userStore.user?.role === 'seller') {
    ElMessage.warning('卖家账号请使用卖家后台')
    next({ path: '/seller/products' })
    return
  }

  // 检查是否需要卖家权限
  if (to.meta.requiresSeller && !['seller', 'admin'].includes(userStore.user?.role)) {
    ElMessage.warning('无权限访问卖家页面')
    next({ path: getDefaultRedirect() })
    return
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && userStore.user?.role !== 'admin') {
    ElMessage.warning('无权限访问管理后台')
    next({ path: getDefaultRedirect() })
    return
  }

  // 3. 其他情况：放行
  next()
})

export default router