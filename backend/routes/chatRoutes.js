const express = require('express');
const { createOrGetDirectChat, getChats } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/', apiLimiter, createOrGetDirectChat);
router.get('/', apiLimiter, getChats);

module.exports = router;
