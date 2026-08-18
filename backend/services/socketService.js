const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// Map to track active user socket mappings: userId -> socketId
const userSocketMap = new Map();

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
    socket.on('joinChat', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.user.username} joined room: ${conversationId}`);
    });

    // Event: User leaves a specific chat/conversation room
    socket.on('leaveChat', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.user.username} left room: ${conversationId}`);
    });

    // Event: Typing indicators
    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('typing', {
        conversationId,
        userId,
        username: socket.user.username
      });
    });

    socket.on('stopTyping', ({ conversationId }) => {
      socket.to(conversationId).emit('stopTyping', {
        conversationId,
        userId
      });
    });

    // Event: Real-time Message Sending
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, type } = data;

        if (!conversationId || !content) {
          return socket.emit('errorMsg', { message: 'Conversation ID and content required' });
        }

        // Check for blocked users in direct chats
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
          return socket.emit('errorMsg', { message: 'Conversation not found' });
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
          content,
          type: type || 'text',
          readBy: [userId]
        });

        // Update conversation lastMessage reference
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar status')
          .lean();

        // Broadcast new message to all users in the chat room
        io.to(conversationId).emit('messageReceived', populatedMessage);
      } catch (err) {
        console.error('Socket sendMessage error:', err.message);
        socket.emit('errorMsg', { message: 'Failed to send message via socket' });
      }
    });

    // Event: Call Simulation (Signaling)
    // 1. Dial Call
    socket.on('callUser', async (data) => {
      const { userToCall, signalData, from, name } = data;

      const senderUser = await User.findById(from);
      const targetUser = await User.findById(userToCall);
      
      const isSenderBlocking = senderUser && senderUser.blockedUsers.some(id => id.toString() === userToCall.toString());
      const isRecipientBlocking = targetUser && targetUser.blockedUsers.some(id => id.toString() === from.toString());
      
      if (isSenderBlocking || isRecipientBlocking) {
        return socket.emit('errorMsg', { message: 'Call blocked: User interaction is blocked' });
      }

      const targetSocketId = userSocketMap.get(userToCall);
      if (targetSocketId) {
        io.to(targetSocketId).emit('incomingCall', {
          signal: signalData,
          from,
          name,
          avatar: socket.user.avatar
        });
      }
    });

    // 2. Answer Call
    socket.on('answerCall', (data) => {
      const { to, signal } = data;
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callAccepted', { signal });
      }
    });

    // 3. Decline Call
    socket.on('declineCall', (data) => {
      const { to } = data;
      const callerSocketId = userSocketMap.get(to);
      if (callerSocketId) {
        io.to(callerSocketId).emit('callDeclined', { message: 'Call declined by user' });
      }
    });

    // 4. End Call
    socket.on('endCall', (data) => {
      const { to } = data;
      const targetSocketId = userSocketMap.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('callEnded');
      }
    });

    // Handle Disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.username} (${userId})`);
      userSocketMap.delete(userId);

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
    });
  });

  return io;
};

module.exports = { initSocket, userSocketMap };
