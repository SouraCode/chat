const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Map to track active user socket mappings: userId -> socketId
const userSocketMap = new Map();
// A user can only be in one ringing or connected call at a time.
const activeCalls = new Map();

const clearCallFor = (userId, peerId) => {
  activeCalls.delete(userId);
  if (peerId) activeCalls.delete(peerId.toString());
};

const initSocket = (server) => {
  const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
      origin: '*', // In production, replace with specific frontend URL
      methods: ['GET', 'POST']
    }
  });

  // Authentication Middleware for Sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key_12345!');
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket Auth Error:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User connected: ${socket.user.username} (${userId})`);

    // Map user ID to socket connection
    userSocketMap.set(userId, socket.id);

    // Update user status to online and notify everyone
    try {
      await User.findByIdAndUpdate(userId, { status: 'online' });
      io.emit('userStatusChange', { userId, status: 'online' });
    } catch (err) {
      console.error(err);
    }

    // Join user to their own personal room for direct signaling (notifications, calls)
    socket.join(userId);

    // Event: User joins a specific chat/conversation room
    socket.on('joinChat', async (conversationId) => {
      if (!mongoose.isValidObjectId(conversationId)) {
        return socket.emit('errorMsg', { message: 'Invalid conversation' });
      }
      const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).select('_id');
      if (!conversation) return socket.emit('errorMsg', { message: 'You are not a member of this conversation' });
      socket.join(conversationId);
    });

    // Event: User leaves a specific chat/conversation room
    socket.on('leaveChat', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.user.username} left room: ${conversationId}`);
    });

    // Event: Typing indicators
    socket.on('typing', async ({ conversationId }) => {
      if (!mongoose.isValidObjectId(conversationId)) return;
      const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).select('_id');
      if (!conversation) return;
      socket.to(conversationId).emit('typing', {
        conversationId,
        userId,
        username: socket.user.username
      });
    });

    socket.on('stopTyping', async ({ conversationId }) => {
      if (!mongoose.isValidObjectId(conversationId)) return;
      const conversation = await Conversation.findOne({ _id: conversationId, participants: userId }).select('_id');
      if (!conversation) return;
      socket.to(conversationId).emit('stopTyping', {
        conversationId,
        userId
      });
    });

    // Event: Real-time Message Sending
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, type, clientMessageId } = data;

        if (!mongoose.isValidObjectId(conversationId) || typeof content !== 'string' || !content.trim()) {
          return socket.emit('errorMsg', { message: 'Conversation ID and content required' });
        }

        // Check for blocked users in direct chats
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('errorMsg', { message: 'Conversation not found' });
        }
        if (!conversation.participants.some((id) => id.toString() === userId)) {
          return socket.emit('errorMsg', { message: 'You are not a member of this conversation' });
        }

        if (conversation.type === 'direct') {
          const recipientId = conversation.participants.find(p => p.toString() !== userId);
          if (recipientId) {
            const senderUser = await User.findById(userId);
            const recipientUser = await User.findById(recipientId);
            
            const isSenderBlocking = senderUser && senderUser.blockedUsers.some(id => id.toString() === recipientId.toString());
            const isRecipientBlocking = recipientUser && recipientUser.blockedUsers.some(id => id.toString() === userId.toString());
            
            if (isSenderBlocking || isRecipientBlocking) {
              return socket.emit('errorMsg', { message: 'Interaction blocked: User is blocked' });
            }
          }
        }

        // Create message in database
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          content: content.trim(),
          type: type || 'text',
          clientMessageId: clientMessageId || '',
          readBy: [userId]
        });

        // Update conversation lastMessage reference
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar status')
          .lean();

        // Deliver through each participant's personal room. Users stay in this
        // room even when they have another conversation open, so notifications
        // and unread chat updates do not depend on the active chat room.
        conversation.participants.forEach((participantId) => {
          io.to(participantId.toString()).emit('messageReceived', populatedMessage);
        });
      } catch (err) {
        console.error('Socket sendMessage error:', err.message);
        socket.emit('errorMsg', { message: 'Failed to send message via socket' });
      }
    });

    // Event: Call Simulation (Signaling)
    // 1. Dial Call
    socket.on('callUser', async (data) => {
      const { userToCall, signalData, type } = data;
      const from = userId;
      const name = socket.user.username;

      if (!userToCall || userToCall.toString() === userId) {
        return socket.emit('errorMsg', { message: 'A valid call recipient is required' });
      }
      if (!mongoose.isValidObjectId(userToCall)) {
        return socket.emit('errorMsg', { message: 'A valid call recipient is required' });
      }

      const senderUser = await User.findById(from);
      const targetUser = await User.findById(userToCall);
      if (!targetUser) {
        return socket.emit('errorMsg', { message: 'Call recipient not found' });
      }
      
      const isSenderBlocking = senderUser && senderUser.blockedUsers.some(id => id.toString() === userToCall.toString());
      const isRecipientBlocking = targetUser && targetUser.blockedUsers.some(id => id.toString() === from.toString());
      
      if (isSenderBlocking || isRecipientBlocking) {
        return socket.emit('errorMsg', { message: 'Call blocked: User interaction is blocked' });
      }

      const targetSocketId = userSocketMap.get(userToCall);
      if (!targetSocketId) return socket.emit('callUnavailable');
      if (activeCalls.has(userId) || activeCalls.has(userToCall.toString())) {
        return socket.emit('callBusy');
      }

      activeCalls.set(userId, userToCall.toString());
      activeCalls.set(userToCall.toString(), userId);
      io.to(targetSocketId).emit('incomingCall', {
        signal: signalData,
        from,
        name,
        avatar: socket.user.avatar,
        type: type === 'audio' ? 'audio' : 'video'
      });
    });

    // 2. Answer Call
    socket.on('answerCall', (data) => {
      const { to, signal } = data;
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted', { signal });
      }
    });

    socket.on('iceCandidate', (data) => {
      const targetSocketId = userSocketMap.get(data.to);
      if (targetSocketId && data.candidate) {
        io.to(targetSocketId).emit('iceCandidate', { candidate: data.candidate });
      }
    });

    // 3. Decline Call
    socket.on('declineCall', (data) => {
      const { to, reason } = data;
      const callerSocketId = userSocketMap.get(to);
      clearCallFor(userId, to);
      if (callerSocketId) {
        io.to(callerSocketId).emit(reason === 'busy' ? 'callBusy' : 'callDeclined', {
          message: reason === 'busy' ? 'User is busy' : 'Call declined by user'
        });
      }
    });

    // 4. End Call
    socket.on('endCall', (data) => {
      const { to } = data;
      const targetSocketId = userSocketMap.get(to);
      clearCallFor(userId, to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('callEnded');
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${userId})`);
      
      // Only clean up and set offline if this is the active socket for the user
      if (userSocketMap.get(userId) === socket.id) {
        userSocketMap.delete(userId);
        const peerId = activeCalls.get(userId);
        clearCallFor(userId, peerId);
        const peerSocketId = peerId && userSocketMap.get(peerId);
        if (peerSocketId) io.to(peerSocketId).emit('callEnded');

        try {
          // Update user status in database
          await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: new Date()
          });

          // Notify everyone
          io.emit('userStatusChange', {
            userId,
            status: 'offline',
            lastSeen: new Date()
          });
        } catch (err) {
          console.error(err);
        }
      } else {
        console.log(`Stale socket disconnected for user ${socket.user.username}, keeping online status.`);
      }
    });
  });

  return io;
};

module.exports = { initSocket, userSocketMap };
