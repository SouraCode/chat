const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { content, conversationId, type, clientMessageId } = req.body;

    if (!content || !conversationId) {
      return res.status(400).json({ success: false, message: 'Please provide conversationId and content' });
    }

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!conversation.participants.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a member of this conversation' });
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      content,
      type: type || 'text',
      clientMessageId: clientMessageId || '',
      readBy: [req.user._id]
    });

    // Update conversation lastMessage
    conversation.lastMessage = message._id;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate('conversation');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    if (!conversation.participants.some((id) => id.equals(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a member of this conversation' });
    }

    // Fetch messages
    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username avatar status')
      .sort({ createdAt: 1 });

    // Mark messages as read by current user (if not already)
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );

    res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};
