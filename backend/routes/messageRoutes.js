const express = require('express');
const { sendMessage, getMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/', apiLimiter, sendMessage);
router.get('/:conversationId', apiLimiter, getMessages);

module.exports = router;
