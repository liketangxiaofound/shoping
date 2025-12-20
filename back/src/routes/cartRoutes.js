const express =require('express')
const router=express.Router()
const carController=require('../controllers/cartController')
const {authenticateJWT} =require('../middleware/auth')
router.use(authenticateJWT)

router.get('/',carController.getCarts)

router.post('/',carController.addItemToCart)

router.put('/:itemid',carController.updateCaritemQuantity)

router.delete('/:itemid',carController.deleteCarItem)

router.delete('',carController.deleteCar)

module.exports=router
