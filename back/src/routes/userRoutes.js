const express=require('express')
const router=express.Router()
const userController=require('../controllers/userController')

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '用户API服务正常',
    endpoints: {
      login: 'POST /api/users/login',
      register: 'POST /api/users/register'
    }
  })
})

router.post('/login',userController.login)
router.post('/register',userController.register)

module.exports=router