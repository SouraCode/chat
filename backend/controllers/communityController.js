const Conversation = require('../models/Conversation');

// @desc    Create a new community
// @route   POST /api/communities
// @access  Private
exports.createCommunity = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }

    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    const community = await Conversation.create({
      name,
      type: 'community',
      avatar: avatar || defaultAvatar,
      participants: [req.user._id],
      creator: req.user._id
    });

    const populatedCommunity = await Conversation.findById(community._id)
      .populate('participants', '-password')
      .populate('creator', 'username avatar');

    res.status(201).json({ success: true, community: populatedCommunity });
  } catch (error) {
    next(error);
  }
};

// @desc    Join an existing community
// @route   POST /api/communities/:id/join
// @access  Private
exports.joinCommunity = async (req, res, next) => {
  try {
    const community = await Conversation.findById(req.params.id);

    if (!community || community.type !== 'community') {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if already in community
    if (community.participants.some((id) => id.equals(req.user._id))) {
      return res.status(400).json({ success: false, message: 'Already a member of this community' });
    }

    community.participants.push(req.user._id);
    await community.save();

    const updatedCommunity = await Conversation.findById(req.params.id)
      .populate('participants', '-password')
      .populate('creator', 'username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' }
      });

    res.status(200).json({ success: true, community: updatedCommunity });
  } catch (error) {
    next(error);
  }
};

// @desc    Leave a community
// @route   POST /api/communities/:id/leave
// @access  Private
exports.leaveCommunity = async (req, res, next) => {
  try {
    const community = await Conversation.findById(req.params.id);

    if (!community || community.type !== 'community') {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is participant
    if (!community.participants.some((id) => id.equals(req.user._id))) {
      return res.status(400).json({ success: false, message: 'You are not a member of this community' });
    }

    // Remove user
    community.participants = community.participants.filter(
      id => id.toString() !== req.user._id.toString()
    );

    // If no participants left, we could optionally delete the community. Let's keep it.
    await community.save();

    res.status(200).json({ success: true, message: 'Left community successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all communities the logged-in user can join (user is NOT a participant)
// @route   GET /api/communities
// @access  Private
exports.getCommunities = async (req, res, next) => {
  try {
    const communities = await Conversation.find({
      type: 'community',
      participants: { $ne: req.user._id }
    })
      .populate('creator', 'username avatar')
      .populate('participants', '-password');

    res.status(200).json({ success: true, communities });
  } catch (error) {
    next(error);
  }
};
