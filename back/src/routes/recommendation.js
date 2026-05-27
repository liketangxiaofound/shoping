const express = require('express')
const router = express.Router()
const recommendationController = require('../controllers/recommendationController')
const { authenticateJWT, optionalAuthenticateJWT } = require('../middleware/auth')

router.get('/also-bought/:productId', recommendationController.getAlsoBought)
router.get('/for-you', authenticateJWT, recommendationController.getForYou)
router.get('/home', optionalAuthenticateJWT, recommendationController.getHomeRecommendations)

module.exports = router
