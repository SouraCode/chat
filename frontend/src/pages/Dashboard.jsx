import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { X, MessageSquare, Video, Users } from 'lucide-react';

// Import modular sub-components
import Dock from '../components/Dock';
import Sidebar from '../components/Sidebar';
import ChatList from '../components/ChatList';
import CallPanel from '../components/CallPanel';
import ChatWindow from '../components/ChatWindow';

const Dashboard = () => {
  const { user, updateProfile, logout } = useAuth();
  const {
    conversations,
    selectedConversation,
    setSelectedConversation,
    activeTab,
    setActiveTab,
    sendMessage,
    startDirectChat,
    callState,
    isCallMinimized
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Mobile layout state: 'channels' | 'messages' | 'chat_window' | 'call_screen'
  const [mobileView, setMobileView] = useState('channels');
  const applyingBrowserNavigationRef = useRef(false);

  // Initialize base history state on mount
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ activeTab: 'chats', chatConversationId: null }, '');
    }
  }, []);

  // Store active tab and selected conversation in history
  useEffect(() => {
    if (applyingBrowserNavigationRef.current) {
      applyingBrowserNavigationRef.current = false;
      return;
    }
    const currentState = window.history.state;
    const nextConvoId = selectedConversation?._id || null;
    if (currentState?.activeTab !== activeTab || currentState?.chatConversationId !== nextConvoId) {
      window.history.pushState({ activeTab, chatConversationId: nextConvoId }, '');
    }
  }, [activeTab, selectedConversation]);

  useEffect(() => {
    const handleBrowserBack = (event) => {
      // ChatContext owns Back during a call and minimizes it safely.
      if (callState !== 'idle') return;

      const state = event.state || {};
      const previousConversationId = state.chatConversationId || null;
      const previousTab = state.activeTab || 'chats';

      applyingBrowserNavigationRef.current = true;
      setActiveTab(previousTab);

      const previousConversation = conversations.find((chat) => chat._id === previousConversationId) || null;
      setSelectedConversation(previousConversation);
      setMobileView(previousConversation ? 'chat_window' : 'channels');
    };
    window.addEventListener('popstate', handleBrowserBack);
    return () => window.removeEventListener('popstate', handleBrowserBack);
  }, [callState, conversations, setActiveTab, setSelectedConversation]);

  // Fetch users for searching
  useEffect(() => {
    if (showSearchModal) {
      const query = searchQuery.trim();
      if (query.length < 2) {
        setUsersList([]);
        setIsSearchingUsers(false);
        return undefined;
      }

      let cancelled = false;
      const searchUsers = async () => {
        try {
          setIsSearchingUsers(true);
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/api/users?search=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (!cancelled && data.success) {
            setUsersList(data.users);
          }
        } catch (err) {
          console.error(err);
          if (!cancelled) setUsersList([]);
        } finally {
          if (!cancelled) setIsSearchingUsers(false);
        }
      };

      const delayDebounce = setTimeout(() => {
        searchUsers();
      }, 250);

      return () => {
        cancelled = true;
        clearTimeout(delayDebounce);
      };
    }
  }, [searchQuery, showSearchModal]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage(messageText.trim());
    setMessageText('');
  };

  // Change avatar image randomly
  const changeAvatar = async () => {
    const seed = Math.random().toString(36).substring(7);
    const url = `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}`;
    await updateProfile(user.username, url);
  };

  // Select chat coordinator
  const selectChat = (chat) => {
    setSelectedConversation(chat);
    setMobileView('chat_window');
  };

  // Adjust layout based on active call state
  useEffect(() => {
    if (callState !== 'idle') {
      setMobileView('call_screen');
    } else if (selectedConversation) {
      setMobileView('chat_window');
    } else {
      setMobileView('channels');
    }
  }, [callState, selectedConversation]);

  return (
    <div className="relative h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-[#0c0c0f] font-sans p-0 sm:p-3 md:p-6">
      {/* Ambient background glow layers */}
      <div className="ambient-glow ambient-glow-1"></div>
      <div className="ambient-glow ambient-glow-2"></div>
      <div className="ambient-glow ambient-glow-3"></div>

      {/* Main glass workspace container */}
      <div className="z-10 h-full w-full max-w-[1440px] glass-container rounded-none sm:rounded-[28px] flex overflow-hidden relative shadow-2xl">
        
        {/* COLUMN 0: Floating Left Navigation Dock */}
        <Dock activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* COLUMN 1: Sidebar User Settings, Navigation Links, Communities */}
        <Sidebar
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowSearchModal={setShowSearchModal}
          changeAvatar={changeAvatar}
          selectChat={selectChat}
          mobileView={mobileView}
        />

        {/* COLUMN 2: Message History Channels & Dynamic List */}
        <ChatList
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectChat={selectChat}
          mobileView={mobileView}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowSearchModal={setShowSearchModal}
          changeAvatar={changeAvatar}
          logout={logout}
        />

        {/* COLUMN 3: Messaging Conversation Window OR Active Call Panel */}
        {(mobileView === 'call_screen' || callState !== 'idle') && !isCallMinimized ? (
          <CallPanel mobileView="call_screen" setMobileView={setMobileView} />
        ) : (
          <ChatWindow
            messageText={messageText}
            setMessageText={setMessageText}
            handleInputChange={(e) => setMessageText(e.target.value)}
            handleSend={handleSend}
            mobileView={mobileView}
            setMobileView={setMobileView}
          />
        )}

        {/* COLUMN 4: Mobile bottom navigation bar (hidden on desktop) */}
        {mobileView === 'channels' && (
          <div className="md:hidden h-16 border-t border-white/5 bg-[#0f0f12]/90 backdrop-blur-md flex items-center justify-around px-6 absolute bottom-0 left-0 right-0 z-20">
            <button
              onClick={() => { setActiveTab('chats'); }}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'chats' ? 'text-blue-500 font-semibold scale-105' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare size={18} />
              <span className="text-[10px]">Chats</span>
            </button>
            <button
              onClick={() => { setActiveTab('calls'); }}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'calls' ? 'text-blue-500 font-semibold scale-105' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Video size={18} />
              <span className="text-[10px]">Calls</span>
            </button>
          </div>
        )}

      </div>

      {/* MODAL 1: Search Users & Start Chats */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-md glass-container rounded-3xl p-5 sm:p-6 relative border border-white/10 shadow-2xl">
            <button
              onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-gray-100 text-left">Start a conversation</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4 text-left">Search by a name or email address.</p>
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Type at least 2 characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
                autoFocus
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 mt-4">
              {usersList.map((usr) => (
                <div
                  key={usr._id}
                  onClick={() => {
                    startDirectChat(usr._id).then(chat => selectChat(chat));
                    setShowSearchModal(false);
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5"
                >
                  <img
                    src={usr.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${usr.username}`}
                    alt={usr.username}
                    className="h-9 w-9 rounded-lg"
                  />
                  <div className="text-left flex-1">
                    <h5 className="text-sm font-semibold text-gray-200">{usr.username}</h5>
                    <p className="text-[10px] text-gray-500">{usr.email}</p>
                  </div>
                </div>
              ))}
              {isSearchingUsers && (
                <div className="flex items-center justify-center gap-2 py-7 text-xs text-gray-500">
                  <span className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" /> Searching users…
                </div>
              )}
              {!isSearchingUsers && usersList.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="text-center py-6 text-xs text-gray-600">
                  No users found matching query
                </div>
              )}
              {!isSearchingUsers && usersList.length === 0 && searchQuery.trim().length < 2 && (
                <div className="text-center py-6 text-xs text-gray-600">
                  Enter at least 2 characters to find someone.
                </div>
              )}
            </div>
          </div>
        </div>
      )}



    </div>
  );
};

export default Dashboard;
