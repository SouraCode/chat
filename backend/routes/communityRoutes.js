const express = require('express');
const {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getCommunities
} = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(protect);

router.post('/', apiLimiter, createCommunity);
router.get('/', apiLimiter, getCommunities);
router.post('/:id/join', apiLimiter, joinCommunity);
router.post('/:id/leave', apiLimiter, leaveCommunity);

module.exports = router;
