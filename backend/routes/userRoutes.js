const express = require('express');
const { searchUsers, updateProfile, blockUser, unblockUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect); // All routes below are protected

router.get('/', apiLimiter, searchUsers);
router.put('/profile', apiLimiter, updateProfile);
router.post('/block', apiLimiter, blockUser);
router.post('/unblock', apiLimiter, unblockUser);

module.exports = router;
