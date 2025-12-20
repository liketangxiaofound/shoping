// middleware/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: '请先登录'
    })
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '无权限访问'
    })
  }
  
  next()
}

module.exports = adminMiddleware