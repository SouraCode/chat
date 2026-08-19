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
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
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

  const stopMedia = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const getMedia = useCallback(async (type) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const createPeerConnection = useCallback((peerId, stream) => {
    const connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit('iceCandidate', { to: peerId, candidate });
    };
    connection.ontrack = ({ streams }) => setRemoteStream(streams[0]);
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed') stopMedia();
    };
    peerConnectionRef.current = connection;
    return connection;
  }, [socket, stopMedia]);

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
      stopMedia();
    }
  }, [token, user, stopMedia]);

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
    const clientMessageId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMessage = {
      _id: clientMessageId,
      clientMessageId,
      conversation: selectedConversation._id,
      sender: { _id: user?.id, username: user?.username, avatar: user?.avatar },
      content: content.trim(),
      type,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    // Use socket if connected, fallback to REST
    if (socket) {
      socket.emit('sendMessage', {
        conversationId: selectedConversation._id,
        content: content.trim(),
        type,
        clientMessageId
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
            type,
            clientMessageId
          })
        });
        const data = await res.json();
        if (data.success) {
          setMessages(prev => prev.map((message) =>
            message.clientMessageId === data.message.clientMessageId ? data.message : message
          ));
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

  const startCall = async (peerId, peerName, peerAvatar, type = 'audio') => {
    if (!socket) return;
    try {
      const stream = await getMedia(type);
      const connection = createPeerConnection(peerId, stream);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      setCallState('dialing');
      setCallSettings({ isMuted: false, isCameraOff: false, isVolumeOn: true });
      setIsCallMinimized(false);
      setCurrentCall({ peerId, peerName, peerAvatar, isCaller: true, type });
      socket.emit('callUser', { userToCall: peerId, signalData: offer, type });
    } catch (error) {
      stopMedia();
      alert('Microphone or camera access is required to start a call.');
      console.error('Unable to start call:', error);
    }
  };

  const acceptCall = async () => {
    if (!socket || !currentCall?.signal) return;
    try {
      const stream = await getMedia(currentCall.type);
      const connection = createPeerConnection(currentCall.peerId, stream);
      await connection.setRemoteDescription(currentCall.signal);
      for (const candidate of pendingCandidatesRef.current) await connection.addIceCandidate(candidate);
      pendingCandidatesRef.current = [];
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      setCallState('connected');
      setCallSettings({ isMuted: false, isCameraOff: false, isVolumeOn: true });
      socket.emit('answerCall', { to: currentCall.peerId, signal: answer });
    } catch (error) {
      stopMedia();
      setCallState('idle');
      setCurrentCall(null);
      alert('Unable to access your microphone or camera.');
      console.error('Unable to accept call:', error);
    }
  };

  const declineCall = () => {
    if (!socket || !currentCall) return;
    socket.emit('declineCall', { to: currentCall.peerId });
    addCallHistory(currentCall.peerId, currentCall.peerName, currentCall.peerAvatar, currentCall.type, 'declined', 'incoming', 0);
    logCallToChat(currentCall.peerId, `❌ Missed ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call`);
    setCallState('idle');
    setCurrentCall(null);
    setIsCallMinimized(false);
    stopMedia();
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
    stopMedia();
  };

  // Register socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle message received
    socket.on('messageReceived', (message) => {
      // If message is in the selected conversation
      if (selectedConversationRef.current && String(message.conversation) === String(selectedConversationRef.current._id)) {
        setMessages(prev => {
          // Check if message is already added
          if (prev.some(m => m._id === message._id)) return prev;
          const optimisticIndex = prev.findIndex((m) => m.clientMessageId && m.clientMessageId === message.clientMessageId);
          if (optimisticIndex !== -1) {
            const next = [...prev];
            next[optimisticIndex] = message;
            return next;
          }
          return [...prev, message];
        });
      }

      // Update last message in conversation list
      setConversations(prev => {
        return prev.map(c => {
          if (String(c._id) === String(message.conversation)) {
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
    socket.on('incomingCall', ({ from, name, avatar, signal, type }) => {
      // If already in a call, ignore/auto-decline
      if (callStateRef.current !== 'idle') {
        socket.emit('declineCall', { to: from });
        return;
      }
      setCallState('ringing');
      setIsCallMinimized(false);
      setCurrentCall({ peerId: from, peerName: name, peerAvatar: avatar, isCaller: false, type, signal });
    });

    socket.on('callAccepted', async ({ signal }) => {
      if (!peerConnectionRef.current || !signal) return;
      await peerConnectionRef.current.setRemoteDescription(signal);
      for (const candidate of pendingCandidatesRef.current) await peerConnectionRef.current.addIceCandidate(candidate);
      pendingCandidatesRef.current = [];
      setCallState('connected');
    });

    socket.on('iceCandidate', async ({ candidate }) => {
      if (!candidate) return;
      if (peerConnectionRef.current?.remoteDescription) {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on('callDeclined', () => {
      if (currentCallRef.current) {
        const call = currentCallRef.current;
        addCallHistory(call.peerId, call.peerName, call.peerAvatar, call.type, 'declined', 'outgoing', 0);
      }
      setCallState('idle');
      setCurrentCall(null);
      setIsCallMinimized(false);
      stopMedia();
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
      stopMedia();
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
      socket.off('iceCandidate');
    };
  }, [socket, addCallHistory, stopMedia]);

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
        localStream,
        remoteStream,
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
