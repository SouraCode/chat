import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ChatProvider } from './context/ChatContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import PwaInstallPrompt from './components/PwaInstallPrompt';

const MainContent = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0d] overflow-hidden">
        {/* Glow backgrounds */}
        <div className="ambient-glow ambient-glow-1"></div>
        <div className="ambient-glow ambient-glow-2"></div>
        
        {/* Glass loading widget */}
        <div className="z-10 px-8 py-6 glass-panel rounded-2xl flex flex-col items-center border border-white/5 shadow-xl">
          <div className="h-10 w-10 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin mb-3"></div>
          <span className="text-xs text-gray-400 font-semibold tracking-wider uppercase">
            Loading session...
          </span>
        </div>
      </div>
    );
  }

  return token ? <Dashboard /> : <Auth />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <MainContent />
          <PwaInstallPrompt />
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
