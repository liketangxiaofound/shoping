const express=require('express')
const router=express.Router()
const authController=require('../controllers/authController')
const {authenticateJWT}  =require('../middleware/auth')

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '认证API服务正常',
  })
})

router.post('/login',authController.login)

router.post('/register',authController.register)

router.get('/me',authenticateJWT,authController.getCurrentUser)



module.exports=router