// scripts/seed.js — 丰富测试数据（多卖家、历史订单、3.2 采集数据）
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()
const { getGalleryForProduct } = require('../src/utils/productImages')

const PASSWORD_PLAIN = '123456'

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(12, 0, 0, 0)
  return d
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)]
}

function generateOrderNo(suffix = '') {
  return `ORD${Date.now()}${suffix}${randomInt(1000, 9999)}`
}

const REGIONS = [
  '广东省深圳市南山区科技园',
  '北京市朝阳区建国路88号',
  '上海市浦东新区陆家嘴',
  '浙江省杭州市西湖区文三路',
  '江苏省南京市鼓楼区中山路',
  '四川省成都市武侯区天府大道',
  '湖北省武汉市洪山区光谷',
  '福建省厦门市思明区软件园'
]

const SELLER_DEFS = [
  { username: 'seller1', email: 'seller1@example.com' },
  { username: 'seller2', email: 'seller2@example.com' },
  { username: 'seller3', email: 'seller3@example.com' },
  { username: 'seller4', email: 'seller4@example.com' },
  { username: 'seller5', email: 'seller5@example.com' },
  { username: 'seller6', email: 'seller6@example.com' },
  { username: 'seller7', email: 'seller7@example.com' },
  { username: 'seller8', email: 'seller8@example.com' }
]

const CUSTOMER_DEFS = Array.from({ length: 15 }, (_, i) => ({
  username: `user${i + 1}`,
  email: `user${i + 1}@example.com`
}))

const CATEGORY_NAMES = ['手机', '电脑', '耳机', '平板', '配件', '家电', '美妆']

// 每商品独立封面（OSS seed-products/），重新生成: node scripts/generate-and-upload-product-images.js
const PRODUCT_TEMPLATES = [
  {
    name: 'iPhone 15',
    category: '手机',
    price: 5999,
    stock: 80,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192493394_wi1a0k.webp'
  },
  {
    name: '华为 Mate 60',
    category: '手机',
    price: 5499,
    stock: 70,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192493806_712cfg.webp'
  },
  {
    name: '小米 14',
    category: '手机',
    price: 3999,
    stock: 90,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192494201_a0z3k7.webp'
  },
  {
    name: '三星 Galaxy S24',
    category: '手机',
    price: 5199,
    stock: 75,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192494612_s09qk1.webp'
  },
  {
    name: 'MacBook Pro 14',
    category: '电脑',
    price: 12999,
    stock: 40,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192495007_0c7ly8.webp'
  },
  {
    name: 'MacBook Air',
    category: '电脑',
    price: 8999,
    stock: 55,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192495411_t0ielm.webp'
  },
  {
    name: 'ROG 游戏本',
    category: '电脑',
    price: 9999,
    stock: 25,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192495801_yy54wj.webp'
  },
  {
    name: 'AirPods Pro 2',
    category: '耳机',
    price: 1899,
    stock: 150,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192496189_3dl0yj.webp'
  },
  {
    name: 'Sony WH-1000XM5',
    category: '耳机',
    price: 2499,
    stock: 80,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192496599_k4qe1s.webp'
  },
  {
    name: 'Bose QC45',
    category: '耳机',
    price: 2299,
    stock: 70,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192497002_npy3vz.webp'
  },
  {
    name: 'iPad Pro 12.9',
    category: '平板',
    price: 8999,
    stock: 50,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192497392_48wgcf.webp'
  },
  {
    name: '华为 MatePad',
    category: '平板',
    price: 3299,
    stock: 55,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192497795_15h1rs.webp'
  },
  {
    name: 'Apple Watch Ultra',
    category: '配件',
    price: 6299,
    stock: 40,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192498195_jp63j7.webp'
  },
  {
    name: '戴森吹风机',
    category: '家电',
    price: 2990,
    stock: 30,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192498587_dpd0xu.webp'
  },
  {
    name: '兰蔻小黑瓶',
    category: '美妆',
    price: 1080,
    stock: 60,
    image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/seed-products/1779192498977_2ytkxs.webp'
  }
]

async function safeDeleteMany(label, fn) {
  try {
    await fn()
  } catch (error) {
    if (error?.code === 'P2021') {
      console.log(`  跳过 ${label}（表不存在）`)
      return
    }
    throw error
  }
}

async function clearDatabase() {
  console.log('🌱 清除旧数据...')
  await safeDeleteMany('OperationLog', () => prisma.operationLog.deleteMany())
  await safeDeleteMany('BrowseBehaviorLog', () => prisma.browseBehaviorLog.deleteMany())
  await safeDeleteMany('LoginLog', () => prisma.loginLog.deleteMany())
  await safeDeleteMany('PurchaseRecord', () => prisma.purchaseRecord.deleteMany())
  await safeDeleteMany('UserActivityLog', () => prisma.userActivityLog.deleteMany())
  await safeDeleteMany('CrawlerEvent', () => prisma.crawlerEvent.deleteMany())
  await safeDeleteMany('CartItem', () => prisma.cartItem.deleteMany())
  await safeDeleteMany('OrderItem', () => prisma.orderItem.deleteMany())
  await safeDeleteMany('Order', () => prisma.order.deleteMany())
  await safeDeleteMany('Product', () => prisma.product.deleteMany())
  await safeDeleteMany('Category', () => prisma.category.deleteMany())
  await safeDeleteMany('User', () => prisma.user.deleteMany())
  console.log('✅ 旧数据已清除')
}

async function main() {
  console.log('🌱 开始初始化数据库...')
  await clearDatabase()

  const hashed = await bcrypt.hash(PASSWORD_PLAIN, 10)

  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: hashed,
      email: 'admin@shopping.local',
      role: 'admin'
    }
  })

  const sellers = []
  for (const def of SELLER_DEFS) {
    const seller = await prisma.user.create({
      data: {
        username: def.username,
        password: hashed,
        email: def.email,
        role: 'seller'
      }
    })
    sellers.push(seller)
  }

  const customers = []
  for (const def of CUSTOMER_DEFS) {
    const customer = await prisma.user.create({
      data: {
        username: def.username,
        password: hashed,
        email: def.email,
        role: 'customer'
      }
    })
    customers.push(customer)
  }

  const categories = []
  for (const name of CATEGORY_NAMES) {
    categories.push(await prisma.category.create({ data: { name } }))
  }
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]))

  const products = []
  for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
    const tpl = PRODUCT_TEMPLATES[i]
    const seller = sellers[i % sellers.length]
    const cat = categoryByName[tpl.category]
    const gallery = getGalleryForProduct({ id: i + 1, category: tpl.category })
    const product = await prisma.product.create({
      data: {
        name: tpl.name,
        price: tpl.price,
        stock: tpl.stock,
        description: `${tpl.name} — ${tpl.category}类热销商品`,
        category: tpl.category,
        categoryId: cat?.id,
        image: gallery[0],
        images: gallery,
        sellerId: seller.id,
        status: 'active',
        createdAt: daysAgo(randomInt(30, 120))
      }
    })
    products.push(product)
  }

  // 登录日志（销售/管理/用户）
  const allUsers = [adminUser, ...sellers, ...customers]
  for (const user of allUsers) {
    const loginTimes = randomInt(3, 12)
    for (let i = 0; i < loginTimes; i++) {
      await prisma.loginLog.create({
        data: {
          userId: user.id,
          username: user.username,
          role: user.role,
          ipAddress: pick(['127.0.0.1', '192.168.1.10', '10.0.0.5', '58.220.1.100']),
          loginAt: daysAgo(randomInt(1, 60))
        }
      })
    }
  }

  // 浏览行为
  for (const customer of customers) {
    const browseTimes = randomInt(5, 20)
    for (let i = 0; i < browseTimes; i++) {
      const product = pick(products)
      await prisma.browseBehaviorLog.create({
        data: {
          userId: customer.id,
          productId: product.id,
          category: product.category,
          dwellSeconds: randomInt(5, 300),
          ipAddress: pick(['127.0.0.1', '192.168.1.20']),
          browsedAt: daysAgo(randomInt(1, 45))
        }
      })
    }
  }

  // 历史订单（近 90 天，趋势逐月上升）
  const orderStatuses = ['paid', 'paid', 'paid', 'shipped', 'delivered', 'delivered']
  let orderCount = 0
  let purchaseRecordCount = 0

  for (let day = 90; day >= 0; day--) {
    // 越近期订单越多，形成可预测上升趋势
    const baseOrders = day > 60 ? 0 : day > 30 ? 1 : 2
    const extra = day < 15 ? 2 : day < 30 ? 1 : 0
    const ordersToday = baseOrders + extra + (Math.random() > 0.7 ? 1 : 0)

    for (let o = 0; o < ordersToday; o++) {
      const customer = pick(customers)
      const itemCount = randomInt(1, 3)
      const chosen = []
      const usedIds = new Set()
      while (chosen.length < itemCount) {
        const p = pick(products)
        if (!usedIds.has(p.id)) {
          usedIds.add(p.id)
          chosen.push({ product: p, quantity: randomInt(1, 2) })
        }
      }

      const totalPrice = chosen.reduce((s, it) => s + it.product.price * it.quantity, 0)
      const status = pick(orderStatuses)
      const createdAt = daysAgo(day)
      const paidAt = ['paid', 'shipped', 'delivered'].includes(status) ? createdAt : null

      const order = await prisma.order.create({
        data: {
          orderNo: generateOrderNo(`D${day}`),
          totalPrice,
          status,
          userId: customer.id,
          createdAt,
          paidAt,
          paymentMethod: paidAt ? 'simulated' : null,
          address: {
            recipient: customer.username,
            phone: `138${randomInt(10000000, 99999999)}`,
            detail: pick(REGIONS)
          },
          orderItems: {
            create: chosen.map((it) => ({
              productId: it.product.id,
              quantity: it.quantity,
              price: it.product.price
            }))
          }
        },
        include: { orderItems: true }
      })

      orderCount++
      for (const it of chosen) {
        await prisma.purchaseRecord.create({
          data: {
            userId: customer.id,
            orderId: order.id,
            productId: it.product.id,
            category: it.product.category,
            unitPrice: it.product.price,
            quantity: it.quantity,
            purchaseDate: createdAt
          }
        })
        purchaseRecordCount++
      }

      await prisma.userActivityLog.create({
        data: {
          userId: customer.id,
          type: 'create_order',
          detail: `创建订单 ${order.orderNo}`,
          orderId: order.id
        }
      })
    }
  }

  // 销售/管理员操作日志
  for (const seller of sellers.slice(0, 4)) {
    await prisma.operationLog.create({
      data: {
        userId: seller.id,
        username: seller.username,
        role: 'seller',
        content: `上架商品 batch-${seller.username}`,
        ipAddress: '127.0.0.1',
        operatedAt: daysAgo(randomInt(1, 20))
      }
    })
  }
  await prisma.operationLog.create({
    data: {
      userId: adminUser.id,
      username: adminUser.username,
      role: 'admin',
      content: '初始化销售人员账号',
      ipAddress: '127.0.0.1',
      operatedAt: daysAgo(1)
    }
  })

  // 购物车样例
  await prisma.cartItem.createMany({
    data: [
      { userId: customers[0].id, productId: products[0].id, quantity: 1 },
      { userId: customers[0].id, productId: products[4].id, quantity: 1 },
      { userId: customers[1].id, productId: products[8].id, quantity: 2 }
    ]
  })

  console.log('')
  console.log('✅ 数据库初始化完成！')
  console.log('📊 创建数据统计:')
  console.log(`   - 管理员: 1`)
  console.log(`   - 销售人员: ${sellers.length}`)
  console.log(`   - 普通用户: ${customers.length}`)
  console.log(`   - 分类: ${categories.length}`)
  console.log(`   - 商品: ${products.length}`)
  console.log(`   - 订单: ${orderCount}`)
  console.log(`   - 购买记录: ${purchaseRecordCount}`)
  console.log('')
  console.log('🔐 测试账号（密码均为 123456）:')
  console.log('   管理员: admin')
  console.log(`   卖家: ${SELLER_DEFS.map((s) => s.username).join(', ')}`)
  console.log('   用户: user1 ~ user15')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
