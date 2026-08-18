import React from 'react';
import { MessageSquare, Video, Users, Archive, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dock = ({ activeTab, setActiveTab }) => {
  const { logout } = useAuth();

  return (
    <div className="hidden md:flex flex-col items-center justify-between py-8 px-4 border-r border-white/5 bg-black/25">
      <div className="flex flex-col gap-6">
        <button
          onClick={() => setActiveTab('chats')}
          className={`p-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'chats'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Chats"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={() => setActiveTab('calls')}
          className={`p-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'calls'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Video Calls Simulation"
        >
          <Video size={20} />
        </button>
        <button
          onClick={() => setActiveTab('communities')}
          className={`p-3 rounded-2xl transition-all duration-300 ${
            activeTab === 'communities'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Communities"
        >
          <Users size={20} />
        </button>
      </div>
      <button
        onClick={logout}
        className="p-3 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
        title="Logout"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
};

export default Dock;
