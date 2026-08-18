import React, { useState, useEffect } from 'react';
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
    startCommunity,
    joinCommunity,
    callState,
    isCallMinimized
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNewCommunityModal, setShowNewCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [availableCommunities, setAvailableCommunities] = useState([]);

  // Mobile layout state: 'channels' | 'messages' | 'chat_window' | 'call_screen'
  const [mobileView, setMobileView] = useState('channels');

  // Fetch users for searching
  useEffect(() => {
    if (showSearchModal) {
      const searchUsers = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_URL}/api/users?search=${searchQuery}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            setUsersList(data.users);
          }
        } catch (err) {
          console.error(err);
        }
      };

      const delayDebounce = setTimeout(() => {
        searchUsers();
      }, 300);

      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery, showSearchModal]);

  // Fetch joinable communities
  const loadJoinableCommunities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/communities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAvailableCommunities(data.communities);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'communities') {
      loadJoinableCommunities();
    }
  }, [activeTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessage(messageText.trim());
    setMessageText('');
  };

  const handleCreateCommunitySubmit = async (e) => {
    e.preventDefault();
    if (!newCommunityName.trim()) return;
    await startCommunity(newCommunityName.trim());
    setNewCommunityName('');
    setShowNewCommunityModal(false);
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
  }, [callState]);

  return (
    <div className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#0c0c0f] font-sans p-0 sm:p-4 md:p-8">
      {/* Ambient background glow layers */}
      <div className="ambient-glow ambient-glow-1"></div>
      <div className="ambient-glow ambient-glow-2"></div>
      <div className="ambient-glow ambient-glow-3"></div>

      {/* Main glass workspace container */}
      <div className="z-10 h-full w-full max-w-7xl glass-container rounded-none sm:rounded-[36px] flex overflow-hidden relative shadow-2xl">
        
        {/* COLUMN 0: Floating Left Navigation Dock */}
        <Dock activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* COLUMN 1: Sidebar User Settings, Navigation Links, Communities */}
        <Sidebar
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowSearchModal={setShowSearchModal}
          setShowNewCommunityModal={setShowNewCommunityModal}
          changeAvatar={changeAvatar}
          selectChat={selectChat}
          mobileView={mobileView}
        />

        {/* COLUMN 2: Message History Channels & Dynamic List */}
        <ChatList
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectChat={selectChat}
          availableCommunities={availableCommunities}
          joinCommunity={joinCommunity}
          mobileView={mobileView}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          setShowSearchModal={setShowSearchModal}
          changeAvatar={changeAvatar}
          logout={logout}
        />

        {/* COLUMN 3: Messaging Conversation Window OR Active Call Panel */}
        {(mobileView === 'call_screen' || callState !== 'idle') && !isCallMinimized ? (
          <CallPanel mobileView={mobileView} setMobileView={setMobileView} />
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
            <button
              onClick={() => { setActiveTab('communities'); }}
              className={`flex flex-col items-center gap-0.5 transition-all ${
                activeTab === 'communities' ? 'text-blue-500 font-semibold scale-105' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={18} />
              <span className="text-[10px]">Groups</span>
            </button>
          </div>
        )}

      </div>

      {/* MODAL 1: Search Users & Start Chats */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-md glass-container rounded-3xl p-6 relative border border-white/10 shadow-2xl">
            <button
              onClick={() => { setShowSearchModal(false); setSearchQuery(''); }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-gray-100 mb-4 text-left">Search Users</h3>
            <div className="relative mb-4">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Type name or email..."
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
              {usersList.length === 0 && searchQuery && (
                <div className="text-center py-6 text-xs text-gray-600">
                  No users found matching query
                </div>
              )}
              {usersList.length === 0 && !searchQuery && (
                <div className="text-center py-6 text-xs text-gray-600">
                  Search other users to start direct messaging.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Group Community */}
      {showNewCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
          <div className="w-full max-w-sm glass-container rounded-3xl p-6 relative border border-white/10 shadow-2xl">
            <button
              onClick={() => setShowNewCommunityModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-gray-100 mb-4 text-left">Create Community Group</h3>
            <form onSubmit={handleCreateCommunitySubmit} className="space-y-4">
              <div className="text-left">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Community Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Enthusiasts"
                  required
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-[0.98]"
              >
                Create Community Group
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
