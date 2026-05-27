const express = require('express')
const router = express.Router()
const antiCrawlerController = require('../controllers/antiCrawlerController')

router.get('/challenge', antiCrawlerController.getChallenge)
router.post('/verify', antiCrawlerController.verify)

module.exports = router
