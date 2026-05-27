const redis = require('redis');

// 创建 Redis 客户端
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// 连接 Redis
redisClient.connect()
  .then(() => {
    console.log('✅ Redis 连接成功');
  })
  .catch((err) => {
    console.error('❌ Redis 连接失败:', err.message);
  });

// 错误处理
redisClient.on('error', (err) => {
  console.error('Redis 客户端错误:', err);
});

// 连接成功事件
redisClient.on('connect', () => {
  console.log('🔗 已连接到 Redis 服务器');
});

// 重连事件
redisClient.on('reconnecting', () => {
  console.log('🔄 Redis 重新连接中...');
});

module.exports = redisClient;