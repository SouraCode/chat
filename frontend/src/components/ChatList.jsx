import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  Search,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  LogOut,
  Plus
} from 'lucide-react';

const ChatList = ({
  searchQuery,
  setSearchQuery,
  selectChat,
  availableCommunities,
  joinCommunity,
  mobileView,
  showProfileMenu,
  setShowProfileMenu,
  setShowSearchModal,
  changeAvatar,
  logout
}) => {
  const { user } = useAuth();
  const {
    conversations,
    selectedConversation,
    onlineUsers,
    activeTab,
    startDirectChat,
    callHistory,
    startCall
  } = useChat();

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

  const directConversations = conversations.filter(c => c.type === 'direct');

  // Filter friends for the horizontal carousel
  const uniqueFriends = directConversations
    .map(c => c.participants.find(p => p._id !== user?.id))
    .filter(Boolean)
    .filter((p, index, self) => self.findIndex(t => t._id === p._id) === index);

  return (
    <div className={`w-full md:w-[360px] flex-shrink-0 border-r border-white/5 flex flex-col bg-black/10 ${
      mobileView === 'channels' ? 'flex' : 'hidden md:flex'
    }`}>
      {/* Search bar */}
      <div className="p-6 pb-4 flex items-center gap-3">
        {/* Mobile Profile Settings Trigger */}
        <div className="relative md:hidden flex-shrink-0">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`}
            alt="Profile Settings"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 object-cover cursor-pointer"
          />
          
          {/* Settings Dropdown Menu on Mobile */}
          {showProfileMenu && (
            <div className="absolute top-12 left-0 z-30 w-56 rounded-2xl border border-white/10 bg-[#16161c]/95 backdrop-blur-xl p-2 shadow-xl">
              <div className="px-4 py-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider text-left">
                {user?.username}
              </div>
              <div className="h-[1px] bg-white/5 my-1"></div>
              <button
                onClick={() => { changeAvatar(); setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
              >
                <Settings size={14} /> Change Avatar Image
              </button>
              <div className="h-[1px] bg-white/5 my-1"></div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2.5 rounded-xl text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2"
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>

        {/* Search Input Container */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs"
          />
        </div>

        {/* Mobile Search/Add Users Trigger */}
        <button
          onClick={() => setShowSearchModal(true)}
          className="md:hidden p-2.5 rounded-xl glass-btn text-gray-400 hover:text-white"
          title="Search users to chat"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Online Users Horizontal Row */}
      {activeTab !== 'communities' && (
        <div className="px-6 pb-6 border-b border-white/5">
          <div className="text-left text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
            Active Friends
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-1 scroll-smooth">
            {uniqueFriends.map((friend) => (
              <div
                key={friend._id}
                onClick={() => startDirectChat(friend._id).then(chat => selectChat(chat))}
                className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0"
              >
                <div className="relative">
                  <img
                    src={friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.username}`}
                    alt={friend.username}
                    className="h-12 w-12 rounded-full border border-white/5 object-cover"
                  />
                  {onlineUsers.has(friend._id) && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-[#0c0c0f]"></span>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 truncate w-14 text-center font-medium">
                  {friend.username.split(' ')[0]}
                </span>
              </div>
            ))}
            {uniqueFriends.length === 0 && (
              <div className="text-xs text-gray-600 py-2 w-full text-center">
                No active friends yet
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Chats Listing */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4 space-y-2 text-left">
        <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          {activeTab === 'communities' ? 'Browse Communities' : activeTab === 'calls' ? 'Call History logs' : 'Recent Message Logs'}
        </div>

        {activeTab === 'communities' ? (
          <div className="space-y-2">
            {availableCommunities.map((comm) => (
              <div
                key={comm._id}
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={comm.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comm.name}`}
                    alt={comm.name}
                    className="h-10 w-10 rounded-xl"
                  />
                  <div className="text-left">
                    <h4 className="font-semibold text-sm text-gray-200">{comm.name}</h4>
                    <p className="text-[11px] text-gray-500">{comm.participants.length} active</p>
                  </div>
                </div>
                <button
                  onClick={() => joinCommunity(comm._id)}
                  className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
                >
                  Join
                </button>
              </div>
            ))}
            {availableCommunities.length === 0 && (
              <div className="text-center text-xs text-gray-600 py-6">
                No joinable communities found
              </div>
            )}
          </div>
        ) : activeTab === 'calls' ? (
          <div className="space-y-5">
            {/* History Logs */}
            <div className="space-y-2">
              {callHistory.map((log) => (
                <div
                  key={log._id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={log.peerAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${log.peerName}`}
                      alt=""
                      className="h-10 w-10 rounded-xl object-cover bg-white/5"
                    />
                    <div className="text-left">
                      <h4 className="font-semibold text-sm text-gray-200">{log.peerName}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
                        {log.direction === 'incoming' ? (
                          <PhoneIncoming size={10} className="text-green-400" />
                        ) : (
                          <PhoneOutgoing size={10} className="text-blue-400" />
                        )}
                        <span className="capitalize">{log.status}</span>
                        {log.duration > 0 && <span>• {formatTimer(log.duration)}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startCall(log.peerId, log.peerName, log.peerAvatar, log.type)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title={`Redial ${log.type}`}
                  >
                    {log.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
                  </button>
                </div>
              ))}
              {callHistory.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-600">
                  No calls simulated yet
                </div>
              )}
            </div>

            {/* Quick Dials */}
            <div className="pt-4 border-t border-white/5">
              <div className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Dial Contacts
              </div>
              <div className="space-y-2">
                {uniqueFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={friend.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${friend.username}`}
                          alt=""
                          className="h-9 w-9 rounded-xl object-cover bg-white/5"
                        />
                        {onlineUsers.has(friend._id) && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border border-[#0c0c0f]"></span>
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-sm text-gray-200">{friend.username}</h4>
                        <span className="text-[10px] text-gray-500">
                          {onlineUsers.has(friend._id) ? 'Available' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => startCall(friend._id, friend.username, friend.avatar, 'audio')}
                        className="p-2 rounded-xl bg-white/5 hover:bg-green-600/10 text-gray-400 hover:text-green-400 transition-colors"
                        title="Voice Call"
                      >
                        <Phone size={13} />
                      </button>
                      <button
                        onClick={() => startCall(friend._id, friend.username, friend.avatar, 'video')}
                        className="p-2 rounded-xl bg-white/5 hover:bg-blue-600/10 text-gray-400 hover:text-blue-400 transition-colors"
                        title="Video Call"
                      >
                        <Video size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {uniqueFriends.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-600">
                    Search friends using "+" to create dial options
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          conversations
            .filter(c => {
              if (activeTab === 'chats' && c.type !== 'direct') return false;
              if (searchQuery) {
                if (c.type === 'community') {
                  return c.name.toLowerCase().includes(searchQuery.toLowerCase());
                } else {
                  const peer = c.participants.find(p => p._id !== user?.id);
                  return peer?.username?.toLowerCase().includes(searchQuery.toLowerCase());
                }
              }
              return true;
            })
            .map((chat) => {
              const isCommunity = chat.type === 'community';
              const peer = isCommunity ? null : chat.participants.find(p => p._id !== user?.id);
              const isOnline = peer ? onlineUsers.has(peer._id) : false;

              return (
                <div
                  key={chat._id}
                  onClick={() => selectChat(chat)}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all ${
                    selectedConversation?._id === chat._id
                      ? 'bg-white/5 border border-white/5 shadow-md shadow-black/10'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={
                        isCommunity
                          ? chat.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`
                          : peer?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${peer?.username}`
                      }
                      alt={isCommunity ? chat.name : peer?.username}
                      className="h-11 w-11 rounded-2xl border border-white/5 object-cover bg-white/5"
                    />
                    {!isCommunity && isOnline && (
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-[#0c0c0f]"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-semibold text-sm text-gray-200 truncate">
                        {isCommunity ? chat.name : peer?.username}
                      </h4>
                      <span className="text-[10px] text-gray-500">
                        {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : formatTime(chat.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {chat.lastMessage ? (
                        <>
                          <span className="font-medium text-gray-500 mr-1">
                            {chat.lastMessage.sender?._id === user?.id ? 'You:' : `${chat.lastMessage.sender?.username}:`}
                          </span>
                          {chat.lastMessage.content}
                        </>
                      ) : (
                        'No messages yet'
                      )}
                    </p>
                  </div>
                </div>
              );
            })
        )}

        {conversations.length === 0 && activeTab !== 'communities' && (
          <div className="text-center py-12 text-xs text-gray-600">
            No active conversations.<br />Click the "+" icon above to find users.
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
