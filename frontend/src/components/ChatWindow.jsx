import React, { useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  ArrowLeft,
  Phone,
  Video,
  Send,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Ban
} from 'lucide-react';

const ChatWindow = ({
  messageText,
  handleInputChange,
  handleSend,
  mobileView,
  setMobileView
}) => {
  const { user, blockUser, unblockUser } = useAuth();
  const {
    selectedConversation,
    setSelectedConversation,
    messages,
    onlineUsers,
    startCall,
    leaveCommunity,
    callState,
    currentCall,
    callDuration,
    isCallMinimized,
    setIsCallMinimized,
    endCall,
    callSettings,
    setCallSettings
  } = useChat();

  const formatTimeLabel = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const scrollRef = useRef(null);

  // Scroll messages to bottom of container directly
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setMobileView('channels');
  };

  if (!selectedConversation) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/[0.04] ${
        mobileView === 'chat_window' ? 'flex' : 'hidden md:flex'
      }`}>
        <div className="h-16 w-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-gray-500 mb-4">
          <MessageSquare size={24} />
        </div>
        <h3 className="font-semibold text-gray-300 mb-1">No Active Chat Selected</h3>
        <p className="text-xs text-gray-500 max-w-xs">
          Pick an existing chat from the left sidebar list or find active friends to initiate messaging.
        </p>
      </div>
    );
  }

  const isCommunity = selectedConversation.type === 'community';
  const peer = isCommunity ? null : selectedConversation.participants.find(p => p._id !== user?.id);
  const isOnline = peer ? onlineUsers.has(peer._id) : false;

  const isBlockedByMe = user?.blockedUsers?.some(id => id.toString() === peer?._id?.toString());

  const handleBlockToggle = async () => {
    if (!peer) return;
    if (isBlockedByMe) {
      await unblockUser(peer._id);
    } else {
      await blockUser(peer._id);
    }
  };

  return (
    <div className={`flex-1 flex flex-col bg-black/[0.04] relative ${
      mobileView === 'chat_window' && selectedConversation ? 'flex' : 'hidden md:flex'
    }`}>
      {/* Minimized Call Banner */}
      {callState !== 'idle' && isCallMinimized && currentCall && (
        <div className="bg-gradient-to-r from-blue-600/35 to-indigo-600/35 border-b border-blue-500/20 px-6 py-3 flex items-center justify-between backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-gray-100 flex items-center gap-1.5">
              Active Call with {currentCall.peerName} ({formatTimeLabel(callDuration)})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Mute */}
            <button
              onClick={() => setCallSettings(prev => ({ ...prev, isMuted: !prev.isMuted }))}
              className={`p-1.5 rounded-lg border transition-all text-xs ${
                callSettings.isMuted ? 'bg-red-500/25 border-red-500/30 text-red-400' : 'border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
              }`}
              title={callSettings.isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {callSettings.isMuted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            {/* Maximize */}
            <button
              onClick={() => setIsCallMinimized(false)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white transition-all shadow-md shadow-blue-600/20"
            >
              Maximize
            </button>
            {/* End Call */}
            <button
              onClick={endCall}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-600/20 flex items-center justify-center"
              title="End Call"
            >
              <PhoneOff size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Active Chat Header */}
      <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Back arrow on Mobile */}
          <button
            onClick={handleBack}
            className="md:hidden p-2 rounded-xl glass-btn text-gray-400 mr-2"
          >
            <ArrowLeft size={16} />
          </button>

          <img
            src={
              isCommunity
                ? selectedConversation.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedConversation.name}`
                : peer?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedConversation.name}`
            }
            alt="Chat avatar"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 border border-white/5 object-cover flex-shrink-0"
          />

          <div className="text-left">
            <h3 className="font-semibold text-sm text-gray-100">
              {isCommunity ? selectedConversation.name : peer?.username}
            </h3>
            <span className="text-[10px] text-gray-500">
              {isCommunity ? (
                `${selectedConversation.participants.length} participants`
              ) : isOnline ? (
                <span className="text-green-400 font-medium">Online</span>
              ) : (
                'Offline'
              )}
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {!isCommunity ? (
            <>
              {!isBlockedByMe && (
                <>
                  <button
                    onClick={() => startCall(peer._id, peer.username, peer.avatar, 'audio')}
                    className="p-2 sm:p-2.5 rounded-xl glass-btn text-gray-400 hover:text-white transition-all"
                    title="Start voice call"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    onClick={() => startCall(peer._id, peer.username, peer.avatar, 'video')}
                    className="p-2 sm:p-2.5 rounded-xl glass-btn text-gray-400 hover:text-white animate-pulse transition-all"
                    title="Start video call"
                  >
                    <Video size={18} />
                  </button>
                </>
              )}
              <button
                onClick={handleBlockToggle}
                className={`p-2 sm:p-2.5 rounded-xl border transition-all ${
                  isBlockedByMe
                    ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                    : 'glass-btn text-gray-400 hover:text-red-400 hover:border-red-500/20'
                }`}
                title={isBlockedByMe ? 'Unblock User' : 'Block User'}
              >
                <Ban size={18} />
              </button>
            </>
          ) : (
            <button
              onClick={() => leaveCommunity(selectedConversation._id)}
              className="px-3 py-1.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Message scrolling panel */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender._id === user?.id;

          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-2 sm:gap-3 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <img
                    src={msg.sender.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${msg.sender.username}`}
                    alt={msg.sender.username}
                    className="h-8 w-8 rounded-lg self-end object-cover bg-white/5"
                  />
                )}
                <div className="flex flex-col">
                  {!isMe && isCommunity && (
                    <span className="text-[10px] text-gray-500 mb-1 ml-1 text-left">
                      {msg.sender.username}
                    </span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm text-left ${
                    isMe
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-blue-600/15'
                      : 'bg-[#1b1b22]/70 text-gray-100 border border-white/5 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  <span className={`text-[9px] text-gray-500 mt-1 ${isMe ? 'text-right mr-1' : 'text-left ml-1'}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message input footer form */}
      <form onSubmit={handleSend} className="p-3 sm:p-6 border-t border-white/5 flex gap-2 sm:gap-3">
        <input
          type="text"
          value={messageText}
          onChange={handleInputChange}
          disabled={isBlockedByMe}
          placeholder={isBlockedByMe ? "You have blocked this user. Unblock to send messages." : "Type your message here..."}
          className="flex-1 px-4 py-3 rounded-xl glass-input text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isBlockedByMe}
          className="p-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
