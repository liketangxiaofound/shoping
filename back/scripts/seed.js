// scripts/seed.js
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据库...')
  console.log('🌱 开始删除旧数据...')
  
  // 1. 删除购物车项（依赖 User + Product）
  await prisma.cartItem.deleteMany()
  console.log('✅ CartItem 已清空')

  // 2. 删除订单项（依赖 Order + Product）
  await prisma.orderItem.deleteMany()
  console.log('✅ OrderItem 已清空')

  // 3. 删除订单（依赖 User）
  await prisma.order.deleteMany()
  console.log('✅ Order 已清空')

  // 4. 删除用户（被 Order、CartItem 引用）
  await prisma.user.deleteMany()
  console.log('✅ User 已清空')

  // 5. 删除商品（被 CartItem、OrderItem 引用）
  await prisma.product.deleteMany()
  console.log('✅ Product 已清空')
  
  console.log('✅ 旧数据已清除');

  // 1. 创建管理员用户
  const adminPassword = await bcrypt.hash('123456', 10)
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      email: '2021409059@qq.com',
      role: 'admin'
    }
  })
  
  // 2. 创建测试用户
  const userPassword = await bcrypt.hash('123456', 10)
  const testUser = await prisma.user.upsert({
    where: { username: 'user1' },
    update: {},
    create: {
      username: 'user1',
      password: userPassword,
      email: 'user1@example.com',
      role: 'user'
    }
  })
  
  // 3. 创建示例商品
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'iPhone 15',
        price: 5999.00,
        stock: 100,
        description: '最新款 iPhone',
        category: '手机',
        image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/uploads/1764592601348_7chajm.jpg'
      },
      {
        name: 'MacBook Pro',
        price: 12999.00,
        stock: 50,
        description: '专业笔记本电脑',
        category: '电脑',
        image: "http://test-linger.oss-cn-guangzhou.aliyuncs.com/uploads/1764592647828_smaael.webp"
      },
      {
        name: 'AirPods Pro',
        price: 1899.00,
        stock: 200,
        description: '无线蓝牙耳机',
        category: '耳机',
        image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/uploads/1764592684488_1agh6i.webp'
      },
      {
        name: 'iPad Pro',
        price: 7999.00,
        stock: 75,
        description: '高性能平板电脑',
        category: '平板',
        image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/uploads/1764592684488_1agh6i.webp'
      },
      {
        name: 'Apple Watch',
        price: 2999.00,
        stock: 120,
        description: '智能手表',
        category: '配件',
        image: 'http://test-linger.oss-cn-guangzhou.aliyuncs.com/uploads/1764592684488_1agh6i.webp'
      }
    ]
  })
  
  // 4. 获取所有商品ID
  const allProducts = await prisma.product.findMany();
  
  // 5. 为测试用户添加购物车商品
  const cartItems = await prisma.cartItem.createMany({
    data: [
      {
        userId: testUser.id,
        productId: allProducts[0].id, // iPhone 15
        quantity: 2
      },
      {
        userId: testUser.id,
        productId: allProducts[1].id, // MacBook Pro
        quantity: 1
      },
      {
        userId: testUser.id,
        productId: allProducts[2].id, // AirPods Pro
        quantity: 3
      },
      {
        userId: testUser.id,
        productId: allProducts[3].id, // iPad Pro
        quantity: 1
      }
    ]
  });
  
  // 6. 为管理员用户添加购物车商品
  await prisma.cartItem.create({
    data: {
      userId: adminUser.id,
      productId: allProducts[4].id, // Apple Watch
      quantity: 2
    }
  });
  
  // 7. 计算购物车总价值
  const testUserCart = await prisma.cartItem.findMany({
    where: { userId: testUser.id },
    include: { product: true }
  });
  
  const totalValue = testUserCart.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);
  
  console.log('✅ 数据库初始化完成！')
  console.log('📊 创建数据统计:')
  console.log(`   - 用户: ${adminUser.username} (管理员), ${testUser.username} (普通用户)`)
  console.log(`   - 商品: ${allProducts.length} 个示例商品`)
  console.log(`   - 购物车: ${cartItems.count + 1} 个商品项`)
  console.log(`   - 测试用户购物车总价值: ¥${totalValue.toFixed(2)}`)
  console.log('')
  console.log('🔐 测试账号:')
  console.log('   管理员: admin / 123456')
  console.log('   普通用户: user1 / 123456')
  console.log('')
  console.log('🛒 测试用户购物车内容:')
  testUserCart.forEach(item => {
    console.log(`   - ${item.product.name} x ${item.quantity} = ¥${(item.product.price * item.quantity).toFixed(2)}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })