import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, API_URL } from './AuthContext';
import { useSocket } from './SocketContext';

const ChatContext = createContext();

const formatTimer = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

export const ChatProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socket = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({}); // { [conversationId]: { [userId]: username } }
  
  // Navigation active tab
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'marketplace' | 'requests' | 'archive'

  // Call simulation states
  const [callState, setCallState] = useState('idle'); // 'idle' | 'dialing' | 'ringing' | 'connected'
  const [currentCall, setCurrentCall] = useState(null); // { peerId, peerName, peerAvatar, isCaller, type }
  const [callDuration, setCallDuration] = useState(0);
  const [callSettings, setCallSettings] = useState({ isMuted: false, isCameraOff: false, isVolumeOn: true });
  const selectedConversationRef = useRef(selectedConversation);
  const callStateRef = useRef(callState);
  const currentCallRef = useRef(currentCall);
  const callDurationRef = useRef(callDuration);

  selectedConversationRef.current = selectedConversation;
  callStateRef.current = callState;
  currentCallRef.current = currentCall;
  callDurationRef.current = callDuration;

  // Call history & minimization states
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callHistory, setCallHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('callHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history
  useEffect(() => {
    localStorage.setItem('callHistory', JSON.stringify(callHistory));
  }, [callHistory]);

  const addCallHistory = useCallback((peerId, peerName, peerAvatar, type, status, direction, duration) => {
    const newLog = {
      _id: Math.random().toString(36).substring(7),
      peerId,
      peerName,
      peerAvatar,
      type,
      status,
      direction,
      duration,
      timestamp: new Date().toISOString()
    };
    setCallHistory(prev => [newLog, ...prev]);
  }, []);

  const logCallToChat = useCallback(async (peerId, text) => {
    const convo = conversations.find(c =>
      c.type === 'direct' && c.participants.some(p => p._id === peerId)
    );
    if (!convo || !socket) return;
    socket.emit('sendMessage', {
      conversationId: convo._id,
      content: text,
      type: 'text'
    });
  }, [conversations, socket]);

  // Reset states on logout
  useEffect(() => {
    if (!token || !user) {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
      setOnlineUsers(new Set());
      setTypingUsers({});
      setCallState('idle');
      setCurrentCall(null);
    }
  }, [token, user]);

  // Load conversations list
  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(data.chats);
        
        // Sync online statuses based on fetched users
        const onlineSet = new Set();
        data.chats.forEach(chat => {
          chat.participants.forEach(p => {
            if (p._id !== user?.id && p.status === 'online') {
              onlineSet.add(p._id);
            }
          });
        });
        setOnlineUsers(prev => {
          const next = new Set(prev);
          onlineSet.forEach(id => next.add(id));
          return next;
        });
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [token, user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when selectedConversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!token || !selectedConversation) {
        setMessages([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/messages/${selectedConversation._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
        }

        // Join conversation socket room
        if (socket) {
          socket.emit('joinChat', selectedConversation._id);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();

    return () => {
      if (socket && selectedConversation) {
        socket.emit('leaveChat', selectedConversation._id);
      }
    };
  }, [selectedConversation, token, socket]);

  // Handle Call Duration Counter
  useEffect(() => {
    let interval = null;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Send message helper
  const sendMessage = async (content, type = 'text') => {
    if (!selectedConversation || !content.trim()) return;

    // Use socket if connected, fallback to REST
    if (socket) {
      socket.emit('sendMessage', {
        conversationId: selectedConversation._id,
        content: content.trim(),
        type
      });
    } else {
      try {
        const res = await fetch(`${API_URL}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            conversationId: selectedConversation._id,
            content: content.trim(),
            type
          })
        });
        const data = await res.json();
        if (data.success) {
          setMessages(prev => [...prev, data.message]);
          fetchConversations();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Create new conversation/chat with a user
  const startDirectChat = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        // Add to conversations if not already there
        setConversations(prev => {
          const exists = prev.find(c => c._id === data.chat._id);
          if (exists) return prev;
          return [data.chat, ...prev];
        });
        setSelectedConversation(data.chat);
        return data.chat;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create group community
  const startCommunity = async (name) => {
    try {
      const res = await fetch(`${API_URL}/api/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => [data.community, ...prev]);
        setSelectedConversation(data.community);
        return data.community;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Join group community
  const joinCommunity = async (communityId) => {
    try {
      const res = await fetch(`${API_URL}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => [data.community, ...prev]);
        setSelectedConversation(data.community);
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Leave community
  const leaveCommunity = async (communityId) => {
    try {
      const res = await fetch(`${API_URL}/api/communities/${communityId}/leave`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConversations(prev => prev.filter(c => c._id !== communityId));
        if (selectedConversation?._id === communityId) {
          setSelectedConversation(null);
        }
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  };

  // Call simulation triggers
  const startCall = (peerId, peerName, peerAvatar, type = 'audio') => {
    if (!socket) return;
    setCallState('dialing');
    setIsCallMinimized(false);
    setCurrentCall({ peerId, peerName, peerAvatar, isCaller: true, type });
    socket.emit('callUser', {
      userToCall: peerId,
      signalData: null,
      from: user.id,
      name: user.username
    });
  };

  const acceptCall = () => {
    if (!socket || !currentCall) return;
    setCallState('connected');
    socket.emit('answerCall', { to: currentCall.peerId, signal: null });
  };

  const declineCall = () => {
    if (!socket || !currentCall) return;
    socket.emit('declineCall', { to: currentCall.peerId });
    addCallHistory(currentCall.peerId, currentCall.peerName, currentCall.peerAvatar, currentCall.type, 'declined', 'incoming', 0);
    logCallToChat(currentCall.peerId, `❌ Missed ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call`);
    setCallState('idle');
    setCurrentCall(null);
    setIsCallMinimized(false);
  };

  const endCall = () => {
    if (!socket || !currentCall) return;
    socket.emit('endCall', { to: currentCall.peerId });
    
    // Log call outcome
    if (callState === 'connected') {
      addCallHistory(currentCall.peerId, currentCall.peerName, currentCall.peerAvatar, currentCall.type, 'completed', currentCall.isCaller ? 'outgoing' : 'incoming', callDuration);
      logCallToChat(currentCall.peerId, `📞 ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call ended • ${formatTimer(callDuration)}`);
    } else {
      addCallHistory(currentCall.peerId, currentCall.peerName, currentCall.peerAvatar, currentCall.type, 'cancelled', 'outgoing', 0);
      logCallToChat(currentCall.peerId, `📞 Cancelled ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call`);
    }

    setCallState('idle');
    setCurrentCall(null);
    setIsCallMinimized(false);
  };

  // Register socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle message received
    socket.on('messageReceived', (message) => {
      // If message is in the selected conversation
      if (selectedConversationRef.current && message.conversation === selectedConversationRef.current._id) {
        setMessages(prev => {
          // Check if message is already added
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
      }

      // Update last message in conversation list
      setConversations(prev => {
        return prev.map(c => {
          if (c._id === message.conversation) {
            return { ...c, lastMessage: message, updatedAt: message.createdAt };
          }
          return c;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    });

    // Handle online/offline presence syncing
    socket.on('userStatusChange', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });

      // Update conversations status list
      setConversations(prev =>
        prev.map(c => {
          const participants = c.participants.map(p => {
            if (p._id === userId) {
              return { ...p, status };
            }
            return p;
          });
          return { ...c, participants };
        })
      );
    });

    // Handle typing states
    socket.on('typing', ({ conversationId, userId, username }) => {
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: {
          ...(prev[conversationId] || {}),
          [userId]: username
        }
      }));
    });

    socket.on('stopTyping', ({ conversationId, userId }) => {
      setTypingUsers(prev => {
        const next = { ...prev };
        if (next[conversationId]) {
          delete next[conversationId][userId];
          if (Object.keys(next[conversationId]).length === 0) {
            delete next[conversationId];
          }
        }
        return next;
      });
    });

    // Handle Call Signalling Listeners
    socket.on('incomingCall', ({ from, name, avatar }) => {
      // If already in a call, ignore/auto-decline
      if (callStateRef.current !== 'idle') {
        socket.emit('declineCall', { to: from });
        return;
      }
      setCallState('ringing');
      setIsCallMinimized(false);
      setCurrentCall({ peerId: from, peerName: name, peerAvatar: avatar, isCaller: false, type: 'video' });
    });

    socket.on('callAccepted', () => {
      setCallState('connected');
    });

    socket.on('callDeclined', () => {
      if (currentCallRef.current) {
        const call = currentCallRef.current;
        addCallHistory(call.peerId, call.peerName, call.peerAvatar, call.type, 'declined', 'outgoing', 0);
      }
      setCallState('idle');
      setCurrentCall(null);
      setIsCallMinimized(false);
      alert('Call declined');
    });

    socket.on('callEnded', () => {
      if (currentCallRef.current) {
        const call = currentCallRef.current;
        if (callStateRef.current === 'connected') {
          addCallHistory(call.peerId, call.peerName, call.peerAvatar, call.type, 'completed', call.isCaller ? 'outgoing' : 'incoming', callDurationRef.current);
        } else {
          addCallHistory(call.peerId, call.peerName, call.peerAvatar, call.type, 'missed', 'incoming', 0);
        }
      }
      setCallState('idle');
      setCurrentCall(null);
      setIsCallMinimized(false);
    });

    return () => {
      socket.off('messageReceived');
      socket.off('userStatusChange');
      socket.off('typing');
      socket.off('stopTyping');
      socket.off('incomingCall');
      socket.off('callAccepted');
      socket.off('callDeclined');
      socket.off('callEnded');
    };
  }, [socket, addCallHistory]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        selectedConversation,
        setSelectedConversation,
        messages,
        onlineUsers,
        typingUsers,
        activeTab,
        setActiveTab,
        sendMessage,
        startDirectChat,
        startCommunity,
        joinCommunity,
        leaveCommunity,
        fetchConversations,
        
        // Call system
        callState,
        currentCall,
        callDuration,
        callSettings,
        setCallSettings,
        startCall,
        acceptCall,
        declineCall,
        endCall,
        
        // Minimized / history states
        callHistory,
        setCallHistory,
        isCallMinimized,
        setIsCallMinimized
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
export default ChatContext;
