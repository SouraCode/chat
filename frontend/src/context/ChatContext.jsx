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
  const [callStartTime, setCallStartTime] = useState(null);
  const [callSettings, setCallSettings] = useState({ isMuted: false, isCameraOff: false, isVolumeOn: true });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const selectedConversationRef = useRef(selectedConversation);
  const callStateRef = useRef(callState);
  const currentCallRef = useRef(currentCall);
  const callStartTimeRef = useRef(null);
  const callTimeoutRef = useRef(null);
  const soundContextRef = useRef(null);
  const callHistoryPushedRef = useRef(false);
  const messagesCacheRef = useRef({});

  selectedConversationRef.current = selectedConversation;
  callStateRef.current = callState;
  currentCallRef.current = currentCall;
  callStartTimeRef.current = callStartTime;

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
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
    // Stop remote tracks via receivers first
    peerConnectionRef.current?.getReceivers().forEach((receiver) => {
      receiver.track?.stop();
    });
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    pendingCandidatesRef.current = [];
    setLocalStream(null);
    setRemoteStream(null);
    setCallStartTime(null);
    callStartTimeRef.current = null;
  }, []);

  const playNotificationSound = useCallback((kind = 'message') => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = soundContextRef.current || new AudioContextClass();
      soundContextRef.current = context;
      if (context.state === 'suspended') context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'call' ? 880 : 660, context.currentTime);
      if (kind === 'call') oscillator.frequency.setValueAtTime(1046, context.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (kind === 'call' ? 0.42 : 0.18));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + (kind === 'call' ? 0.44 : 0.2));
    } catch (error) {
      console.warn('Unable to play notification sound:', error);
    }
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
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });
    stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    connection.onicecandidate = ({ candidate }) => {
      if (candidate) socket?.emit('iceCandidate', { to: peerId, candidate });
    };
    connection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prev) => {
          if (prev) {
            const next = new MediaStream(prev.getTracks());
            next.addTrack(event.track);
            return next;
          }
          return new MediaStream([event.track]);
        });
      }
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed') {
        socket?.emit('endCall', { to: peerId });
        stopMedia();
        setCallState('idle');
        setCurrentCall(null);
        setIsCallMinimized(false);
        alert('The call connection failed. Please try again.');
      }
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
      messagesCacheRef.current = {};
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
      
      // Load cached messages immediately for instant swap
      const cached = messagesCacheRef.current[selectedConversation._id];
      if (cached) {
        setMessages(cached);
      } else {
        setMessages([]);
      }

      try {
        const res = await fetch(`${API_URL}/api/messages/${selectedConversation._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          messagesCacheRef.current[selectedConversation._id] = data.messages;
          if (selectedConversationRef.current?._id === selectedConversation._id) {
            setMessages(data.messages);
          }
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

  // Keep the app open when the Android/browser back gesture is used during a
  // call. The gesture minimizes the call instead of navigating away or closing
  // the installed PWA.
  useEffect(() => {
    if (callState === 'idle') {
      if (callHistoryPushedRef.current || window.history.state?.activeChatCall) {
        callHistoryPushedRef.current = false;
        window.history.back();
      }
      return undefined;
    }

    if (!callHistoryPushedRef.current) {
      window.history.pushState({ activeChatCall: true }, '');
      callHistoryPushedRef.current = true;
    }

    const keepCallOpen = () => {
      if (callStateRef.current !== 'idle') {
        window.history.pushState({ activeChatCall: true }, '');
        setIsCallMinimized(true);
      }
    };
    window.addEventListener('popstate', keepCallOpen);
    return () => window.removeEventListener('popstate', keepCallOpen);
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
    setMessages((prev) => {
      const next = [...prev, optimisticMessage];
      messagesCacheRef.current[selectedConversation._id] = next;
      return next;
    });

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
      callTimeoutRef.current = setTimeout(() => {
        if (callStateRef.current === 'dialing') {
          socket.emit('endCall', { to: peerId });
          stopMedia();
          setCallState('idle');
          setCurrentCall(null);
          setIsCallMinimized(false);
          alert('Call timed out. The user did not answer.');
        }
      }, 30000);
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
      const startTime = Date.now();
      setCallStartTime(startTime);
      callStartTimeRef.current = startTime;
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
      const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
      addCallHistory(currentCall.peerId, currentCall.peerName, currentCall.peerAvatar, currentCall.type, 'completed', currentCall.isCaller ? 'outgoing' : 'incoming', duration);
      logCallToChat(currentCall.peerId, `📞 ${currentCall.type === 'video' ? 'Video' : 'Voice'} Call ended • ${formatTimer(duration)}`);
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
      if (String(message.sender?._id) !== String(user?.id)) playNotificationSound('message');
      
      const convoId = message.conversation;
      if (!messagesCacheRef.current[convoId]) {
        messagesCacheRef.current[convoId] = [];
      }
      
      // Update cache
      const isDuplicate = messagesCacheRef.current[convoId].some(m => m._id === message._id);
      if (!isDuplicate) {
        const optimisticIndex = messagesCacheRef.current[convoId].findIndex(
          m => m.clientMessageId && m.clientMessageId === message.clientMessageId
        );
        if (optimisticIndex !== -1) {
          messagesCacheRef.current[convoId][optimisticIndex] = message;
        } else {
          messagesCacheRef.current[convoId] = [...messagesCacheRef.current[convoId], message];
        }
      }
      
      // If message is in the selected conversation, update messages state
      if (selectedConversationRef.current && String(convoId) === String(selectedConversationRef.current._id)) {
        setMessages(messagesCacheRef.current[convoId]);
      }

      // Update last message in conversation list
      setConversations(prev => {
        return prev.map(c => {
          if (String(c._id) === String(message.conversation)) {
            return { ...c, lastMessage: message, updatedAt: message.createdAt };
          }
          return c;
        });
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
        socket.emit('declineCall', { to: from, reason: 'busy' });
        return;
      }
      playNotificationSound('call');
      setCallState('ringing');
      setIsCallMinimized(false);
      setCurrentCall({ peerId: from, peerName: name, peerAvatar: avatar, isCaller: false, type, signal });
    });

    socket.on('callAccepted', async ({ signal }) => {
      if (!peerConnectionRef.current || !signal) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(signal);
        for (const candidate of pendingCandidatesRef.current) await peerConnectionRef.current.addIceCandidate(candidate);
        pendingCandidatesRef.current = [];
        if (callTimeoutRef.current) {
          clearTimeout(callTimeoutRef.current);
          callTimeoutRef.current = null;
        }
        const startTime = Date.now();
        setCallStartTime(startTime);
        callStartTimeRef.current = startTime;
        setCallState('connected');
      } catch (error) {
        console.error('Unable to establish call:', error);
        stopMedia();
        setCallState('idle');
        setCurrentCall(null);
        setIsCallMinimized(false);
        alert('Unable to establish the call connection.');
      }
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

    socket.on('callBusy', () => {
      stopMedia();
      setCallState('idle');
      setCurrentCall(null);
      setIsCallMinimized(false);
      alert('This person is busy on another call.');
    });

    socket.on('callUnavailable', () => {
      stopMedia();
      setCallState('idle');
      setCurrentCall(null);
      setIsCallMinimized(false);
      alert('This person is currently unavailable.');
    });

    socket.on('callEnded', () => {
      if (currentCallRef.current) {
        const call = currentCallRef.current;
        if (callStateRef.current === 'connected') {
          const duration = callStartTimeRef.current ? Math.floor((Date.now() - callStartTimeRef.current) / 1000) : 0;
          addCallHistory(call.peerId, call.peerName, call.peerAvatar, call.type, 'completed', call.isCaller ? 'outgoing' : 'incoming', duration);
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
      socket.off('callBusy');
      socket.off('callUnavailable');
      socket.off('callEnded');
      socket.off('iceCandidate');
    };
  }, [socket, addCallHistory, stopMedia, playNotificationSound, user?.id]);

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
        fetchConversations,
        
        // Call system
        callState,
        currentCall,
        callStartTime,
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
