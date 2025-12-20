// controllers/CartController.js
const { PrismaClient } = require('@prisma/client');
const { json } = require('express');
const prisma = new PrismaClient();

const getCarts= async (req,res)=>{
    try{
        const userId=req.user?.id;

        if(!userId){
            return res.status(401).json({
                success:false,
                message:'用户未登录'
            })
        }

        console.log(`获取${userId}的购物车`);
        
        const carItems =await prisma.cartItem.findMany({
            where:{
                userId:userId
            },
            include:{
                product:{
                    select:{
                        id:true,
                        name:true,
                        price:true,
                        image:true,
                        stock:true,
                        description:true,
                        category:true,
                        
                    }
                }
            },
            orderBy:{
                createdAt:'desc'
            }
        });


        res.json({
            success:true,
            message:`获取购物车成功`,
            data:{
                item:carItems
            }
        })


    }catch(error){
        console.error('获取购物车错误:', error);
      res.status(500).json({
        success: false,
        message: '获取购物车失败'
      });
    }

}


const addItemToCart=async (req,res)=>{
     try {
      const userId = req.user.id;
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: '商品ID不能为空'
        });
      }

      // 检查商品是否存在
      const product = await prisma.product.findUnique({
        where: { id: parseInt(productId) }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: '商品不存在'
        });
      }

      // 检查是否已在购物车
      const existingItem = await prisma.cartItem.findFirst({
        where: {
          userId,
          productId: parseInt(productId)
        }
      });

      let cartItem;
      if (existingItem) {
        // 更新数量
        cartItem = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + parseInt(quantity) },
          include: { product: true }
        });
      } else {
        // 新增商品
        cartItem = await prisma.cartItem.create({
          data: {
            userId,
            productId: parseInt(productId),
            quantity: parseInt(quantity)
          },
          include: { product: true }
        });
      }

      res.json({
        success: true,
        message: '已添加到购物车',
        data: cartItem
      });

    } catch (error) {
      console.error('添加到购物车失败:', error);
      res.status(500).json({
        success: false,
        message: '添加到购物车失败'
      });
    }
}

const updateCaritemQuantity=async (req,res)=>{
    try {
      const userId = req.user.id;
      const itemId = parseInt(req.params.itemid);
      const { quantity } = req.body;

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: '数量不能小于1'
        });
      }

      // 验证购物车项属于当前用户
      const cartItem = await prisma.cartItem.findFirst({
        where: { 
          id: itemId,
          userId 
        }
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: '购物车商品不存在'
        });
      }

      // 更新数量
      const updatedItem = await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: parseInt(quantity) },
        include: { product: true }
      });

      res.json({
        success: true,
        message: '更新成功',
        data: updatedItem
      });

    } catch (error) {
      console.error('更新购物车错误:', error);
      res.status(500).json({
        success: false,
        message: '更新失败'
      });
    }
}

const deleteCarItem=async(req,res)=>{
    try {
      const userId = req.user.id;
      const itemId = parseInt(req.params.itemid);

      // 验证购物车项属于当前用户
      const cartItem = await prisma.cartItem.findFirst({
        where: { 
          id: itemId,
          userId 
        }
      });

      if (!cartItem) {
        return res.status(404).json({
          success: false,
          message: '购物车商品不存在'
        });
      }

      await prisma.cartItem.delete({
        where: { id: itemId }
      });

      res.json({
        success: true,
        message: '删除成功'
      });

    } catch (error) {
      console.error('删除购物车错误:', error);
      res.status(500).json({
        success: false,
        message: '删除失败'
      });
    }
}

const deleteCar=async(req,res)=>{
    try {
      const userId = req.user.id;

      await prisma.cartItem.deleteMany({
        where: { userId }
      });

      res.json({
        success: true,
        message: '购物车已清空'
      });

    } catch (error) {
      console.error('清空购物车错误:', error);
      res.status(500).json({
        success: false,
        message: '清空购物车失败'
      });
    }
}

module.exports={
    getCarts,
    addItemToCart,
    updateCaritemQuantity,
    deleteCarItem,
    deleteCar
}


