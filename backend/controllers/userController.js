const User = require('../models/User');

// @desc    Search users by username or email
// @route   GET /api/users
// @access  Private
exports.searchUsers = async (req, res, next) => {
  try {
    const query = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (query.length < 2) {
      return res.status(200).json({ success: true, users: [] });
    }

    const search = {
          $and: [
            {
              $or: [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
              ]
            },
            { _id: { $ne: req.user._id } } // Exclude the logged-in user
          ]
        };

    const users = await User.find(search).select('-password').sort({ username: 1 }).limit(20);
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (username) {
      // Check if username is already taken
      const usernameExists = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
      user.username = username;
    }

    if (avatar) {
      user.avatar = avatar;
    }

    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        blockedUsers: user.blockedUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block another user
// @route   POST /api/users/block
// @access  Private
exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Please provide a userId to block' });
    }
    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself' });
    }

    const targetUser = await User.exists({ _id: userId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user.blockedUsers.some((id) => id.toString() === userId.toString())) {
      user.blockedUsers.push(userId);
      await user.save();
    }

    res.status(200).json({ success: true, message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock a blocked user
// @route   POST /api/users/unblock
// @access  Private
exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Please provide a userId to unblock' });
    }

    const user = await User.findById(req.user._id);
    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userId.toString());
    await user.save();

    res.status(200).json({ success: true, message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    next(error);
  }
};
