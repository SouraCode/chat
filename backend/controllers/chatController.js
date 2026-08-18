const Conversation = require('../models/Conversation');
const User = require('../models/User');

// @desc    Create or get a 1-to-1 direct chat
// @route   POST /api/chats
// @access  Private
exports.createOrGetDirectChat = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Please provide a userId to chat with' });
    }

    // Verify user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find if a 1-to-1 conversation already exists between the two users
    let chat = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, userId] }
    })
      .populate('participants', '-password')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' }
      });

    if (chat) {
      return res.status(200).json({ success: true, chat });
    }

    // Create a new direct conversation
    const newChatData = {
      name: 'direct',
      type: 'direct',
      participants: [req.user._id, userId]
    };

    const createdChat = await Conversation.create(newChatData);
    
    // Fetch and populate details
    const fullChat = await Conversation.findById(createdChat._id)
      .populate('participants', '-password');

    res.status(201).json({ success: true, chat: fullChat });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations (direct & communities) for the logged in user
// @route   GET /api/chats
// @access  Private
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Conversation.find({
      participants: { $elemMatch: { $eq: req.user._id } }
    })
      .populate('participants', '-password')
      .populate('creator', 'username avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username avatar' }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, chats });
  } catch (error) {
    next(error);
  }
};
