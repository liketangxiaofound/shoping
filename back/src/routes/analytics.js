const express = require('express')
const router = express.Router()
const analyticsController = require('../controllers/analyticsController')
const { authenticateJWT } = require('../middleware/auth')

router.use(authenticateJWT)
router.post('/browse', analyticsController.trackBrowse)
router.get('/profile', analyticsController.getMyProfile)

module.exports = router
