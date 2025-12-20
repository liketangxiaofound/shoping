// utils/jwt.js
const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'fallback'

const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

const verifyToken = (token) => {
  try{
    return jwt.verify(token, JWT_SECRET)
  }catch(error){
    if(error.name=== 'TokenExpiredError'){
      throw new Error('Token过期')
    }
    if(error.name === 'JsonWebTokenError'){
      throw new Error('无效的token')
    }
    throw error;
  }
  
}

const extractTokenFromHeader=(authHeader)=>{
    if(!authHeader) return null;
    const parts =authHeader.split(' ');
    if(parts.length ==2 && parts[0] === 'Bearer'){
      return parts[1];
    }
    return null;
}


module.exports = {
  extractTokenFromHeader,
  generateToken,
  verifyToken,
  
}