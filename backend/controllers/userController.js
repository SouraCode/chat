const User = require('../models/User');

// @desc    Search users by username or email
// @route   GET /api/users
// @access  Private
exports.searchUsers = async (req, res, next) => {
  try {
    const search = req.query.search
      ? {
          $and: [
            {
              $or: [
                { username: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
              ]
            },
            { _id: { $ne: req.user._id } } // Exclude the logged-in user
          ]
        }
      : { _id: { $ne: req.user._id } };

    const users = await User.find(search).select('-password');
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

    const user = await User.findById(req.user._id);
    if (!user.blockedUsers.includes(userId)) {
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
