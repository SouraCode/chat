import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  MessageSquare,
  Video,
  Plus,
  ChevronDown,
  LogOut,
  Settings
} from 'lucide-react';

const Sidebar = ({
  showProfileMenu,
  setShowProfileMenu,
  setShowSearchModal,
  setShowNewCommunityModal,
  changeAvatar,
  selectChat
}) => {
  const { user, logout } = useAuth();
  const {
    conversations,
    selectedConversation,
    activeTab,
    setActiveTab
  } = useChat();



  return (
    <div className="hidden md:flex w-[270px] lg:w-[290px] flex-shrink-0 border-r border-white/5 flex-col bg-black/10">
      {/* Profile Header */}
      <div className="relative p-5 flex items-center justify-between border-b border-white/5">
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.username}`}
            alt="My Profile"
            className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 object-cover"
          />
          <div className="flex flex-col text-left">
            <span className="font-semibold text-sm text-gray-100 flex items-center gap-1">
              {user?.username} <ChevronDown size={14} className="text-gray-400" />
            </span>
            <span className="text-[11px] text-green-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block"></span> Online
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSearchModal(true)}
          className="p-2 rounded-xl glass-btn text-gray-400 hover:text-white"
          title="Search users to chat"
        >
          <Plus size={18} />
        </button>

        {/* Profile Dropdown Settings */}
        {showProfileMenu && (
          <div className="absolute top-16 left-6 z-30 w-56 rounded-2xl border border-white/10 bg-[#16161c]/95 backdrop-blur-xl p-2 shadow-xl">
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

      {/* Sidebar Navigation */}
      <div className="p-3 flex flex-col gap-1">
        <button
          onClick={() => { setActiveTab('chats'); }}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-sm ${
            activeTab === 'chats' ? 'bg-white/5 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={16} />
            <span>Chats</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-md shadow-blue-600/20">
            {conversations.filter(c => c.type === 'direct' && c.lastMessage && !c.isArchived).length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('calls'); }}
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm ${
            activeTab === 'calls' ? 'bg-white/5 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Video size={16} />
          <span>Calls</span>
        </button>
      </div>


    </div>
  );
};

export default Sidebar;
