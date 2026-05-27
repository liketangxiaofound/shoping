const {PrismaClient} =require('@prisma/client');
const {verifyToken,extractTokenFromHeader}=require('../utils/jwt')

const prisma =new PrismaClient();

// jwt认证中间件
const authenticateJWT=async (req,res,next)=>{
    try{
        const authHeader=req.headers['authorization'];
    
        const token=extractTokenFromHeader(authHeader);

        if(!token){
            return res.status(401).json({
                success:false,
                message:'访问被拒绝,请提供有效的token'
            });
        }
        let decoded;
        try{
            decoded=verifyToken(token);
        }catch(jwtError){
            return res.status(401).json({
                success:false,
                message:`Token验证失败: ${jwtError.message}`
            })
        }
        const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
            id: true,
            username: true,
            email: true,
            role: true,
           
        }
        });

        if (!user) {
        return res.status(401).json({
            success: false,
            message: '用户不存在'
        });
        }

      

        // 4. 附加用户信息到请求对象
        req.user = user;
        next();
    }catch(error){
        console.log('认证中间件错误',error);
        res.status(500).json({
            success: false,
            message: '认证服务暂时不可用'
        });
        
    }
}

/**
 * 角色权限检查中间件
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `需要 ${allowedRoles.join(' 或 ')} 权限`
      });
    }
    next();
  }
};

const requireAdmin = requireRoles('admin');

/** 可选认证：有 token 则附加 req.user，无 token 也放行 */
const optionalAuthenticateJWT = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers['authorization'])
    if (!token) return next()
    const decoded = verifyToken(token)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, role: true }
    })
    if (user) req.user = user
    next()
  } catch (error) {
    next()
  }
}

module.exports={
    authenticateJWT,
    optionalAuthenticateJWT,
    requireAdmin,
    requireRoles
}