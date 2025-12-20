// controllers/authController.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const prisma = new PrismaClient();

/**
 * 用户登录
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        role: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 生成token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: userWithoutPassword,
        token: token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
}

/**
 * 用户注册（仅需用户名和密码）
 */
/**
 * 用户注册
 */
async function register(req, res) {
  try {
    const { username, password, email } = req.body; // 添加 email 字段

    console.log('📝 注册请求数据:', { username, email: email ? '有邮箱' : '无邮箱' });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    // 检查邮箱是否提供（必填）
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱不能为空'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      });
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: '邮箱已被注册'
        });
      }
    }

    // 加密密码并创建用户（包含邮箱）
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email, // 添加邮箱字段
        role: 'user'
      },
      select: {
        id: true,
        username: true,
        email: true, // 返回邮箱
        role: true,
        createdAt: true
      }
    });

    console.log('✅ 用户注册成功:', user.username, '邮箱:', user.email);

    // 自动登录：生成 token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    
    // 处理数据库唯一约束错误
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'username') {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
      if (field === 'email') {
        return res.status(400).json({
          success: false,
          message: '邮箱已被注册'
        });
      }
    }

    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
}
/**
 * 获取当前用户信息
 */
async function getCurrentUser(req, res) {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
}

/**
 * 用户登出
 */
async function logout(req, res) {
  try {
    // 在实际项目中，这里应该将token加入黑名单
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
}

module.exports = {
  login,
  register,
  getCurrentUser,
  logout
};