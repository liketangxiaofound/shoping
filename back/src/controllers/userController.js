// src/controllers/userController.js
const prisma = require('../utils/prisma')
const bcrypt = require('bcryptjs')
const { generateToken } = require('../utils/jwt') // 👈 引入封装

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在，请注册' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' })
    }

    // ✅ 使用封装的 generateToken
    const token = generateToken({
      userId: user.id,
      username: user.username
    })

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username }
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' })
    }
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, message: '用户名长度需为3-20个字符' })
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' })
    }

    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return res.status(409).json({ success: false, message: '用户名已存在' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = await prisma.user.create({
      data: { username, password: hashedPassword },
      select: { id: true, username: true }
    })

    // ✅ 同样使用封装的 generateToken
    const token = generateToken({
      userId: newUser.id,
      username: newUser.username
    })

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: { id: newUser.id, username: newUser.username }
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: '用户名已存在' })
    }
    res.status(500).json({ success: false, message: '服务器内部错误' })
  }
}