import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import {
  ArrowLeft,
  UserCheck,
  Settings,
  VideoOff,
  Camera,
  MicOff,
  Mic,
  Volume2,
  VolumeX,
  Phone,
  X,
  Maximize2
} from 'lucide-react';

const CallPanel = ({ mobileView, setMobileView }) => {
  const {
    callState,
    currentCall,
    callDuration,
    callSettings,
    setCallSettings,
    acceptCall,
    declineCall,
    endCall,
    setIsCallMinimized,
    localStream,
    remoteStream
  } = useChat();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const isVideoCall = currentCall?.type === 'video';

  const openVideoFullscreen = async () => {
    try {
      await videoContainerRef.current?.requestFullscreen?.();
    } catch (error) {
      console.warn('Fullscreen video is not available:', error);
    }
  };

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream]);

  useEffect(() => {
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !callSettings.isMuted; });
    localStream?.getVideoTracks().forEach((track) => { track.enabled = !callSettings.isCameraOff; });
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !callSettings.isVolumeOn;
  }, [localStream, remoteStream, callSettings]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleEndCall = () => {
    endCall();
    setMobileView('channels');
  };

  const handleBack = () => {
    setIsCallMinimized(true);
    setMobileView('chat_window');
  };

  return (
    <div className={`flex-1 flex flex-col bg-[#14141a]/95 backdrop-blur-2xl relative ${
      mobileView === 'call_screen' ? 'flex' : 'hidden md:flex'
    } ${isVideoCall ? 'absolute inset-0 z-40 bg-black md:relative md:inset-auto md:z-auto' : ''}`}>
      {/* Call Header controls */}
      <div className={`p-4 sm:p-6 flex items-center justify-between text-gray-400 ${
        isVideoCall ? 'absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/70 to-transparent md:relative md:bg-none' : ''
      }`}>
        <button onClick={handleBack} className="p-2.5 rounded-xl glass-btn hover:text-white transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          {currentCall?.type === 'video' && (
            <button onClick={openVideoFullscreen} className="p-2.5 rounded-xl glass-btn hover:text-white transition-all" title="Fullscreen video">
              <Maximize2 size={20} />
            </button>
          )}
          <button className="p-2.5 rounded-xl glass-btn hover:text-white transition-all">
            <UserCheck size={20} />
          </button>
          <button className="p-2.5 rounded-xl glass-btn hover:text-white transition-all">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Calling profile area */}
      <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 ${
        isVideoCall ? 'relative overflow-hidden p-0 md:p-4' : ''
      }`}>
        {isVideoCall && (
          <div ref={videoContainerRef} className="absolute inset-0 h-full w-full max-w-none min-h-0 aspect-auto rounded-none overflow-hidden bg-black border-0 shadow-none mb-0 md:relative md:w-full md:max-w-6xl md:aspect-video md:min-h-[60vh] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl md:mb-6">
            {remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">Waiting for the other person to join…</div>
            )}
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 h-28 w-36 sm:h-36 sm:w-52 rounded-2xl object-cover bg-[#1b1b22] border border-white/10 shadow-lg" />
          </div>
        )}
        {currentCall?.type === 'audio' && remoteStream && <audio ref={remoteVideoRef} autoPlay />}
        <div className={`relative mb-6 ${isVideoCall ? 'hidden md:block' : ''}`}>
          <div className="absolute -inset-4 rounded-[42px] bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-xl animate-pulse"></div>
          <img
            src={currentCall?.peerAvatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Angelina'}
            alt="Calling Partner"
            className="h-32 w-32 rounded-[36px] border border-white/10 bg-white/5 object-cover relative z-10"
          />
        </div>

        <h2 className={`text-2xl font-bold text-gray-100 mb-2 ${isVideoCall ? 'hidden md:block' : ''}`}>
          {currentCall?.peerName || 'Angelina Jole'}
        </h2>

        <span className={`px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-gray-400 tracking-wider ${isVideoCall ? 'hidden md:inline-flex' : ''}`}>
          {callState === 'dialing' && 'Dialing call...'}
          {callState === 'ringing' && 'Incoming Call...'}
          {callState === 'connected' && `Connected • ${formatTimer(callDuration)}`}
        </span>
      </div>

      {/* Bottom Call Control Buttons */}
      <div className={`p-4 sm:p-8 flex justify-center ${
        isVideoCall ? 'absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent pt-12 md:relative md:bg-none md:pt-8' : ''
      }`}>
        <div className="glass-panel px-4 py-4 sm:px-8 sm:py-5 rounded-3xl flex items-center justify-center flex-wrap gap-3 sm:gap-6 border border-white/5">
          {/* Camera Control */}
          <button
            onClick={() => setCallSettings(prev => ({ ...prev, isCameraOff: !prev.isCameraOff }))}
            className={`p-3.5 rounded-full transition-all duration-300 ${
              callSettings.isCameraOff ? 'bg-red-500/20 text-red-400' : 'glass-btn text-gray-300 hover:text-white'
            }`}
          >
            {callSettings.isCameraOff ? <VideoOff size={20} /> : <Camera size={20} />}
          </button>

          {/* Microphone Control */}
          <button
            onClick={() => setCallSettings(prev => ({ ...prev, isMuted: !prev.isMuted }))}
            className={`p-3.5 rounded-full transition-all duration-300 ${
              callSettings.isMuted ? 'bg-red-500/20 text-red-400' : 'glass-btn text-gray-300 hover:text-white'
            }`}
          >
            {callSettings.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Speaker Control */}
          <button
            onClick={() => setCallSettings(prev => ({ ...prev, isVolumeOn: !prev.isVolumeOn }))}
            className="p-3.5 rounded-full glass-btn text-gray-300 hover:text-white transition-all"
          >
            {callSettings.isVolumeOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          {/* Call Connection triggers */}
          {callState === 'ringing' ? (
            <>
              <button
                onClick={acceptCall}
                className="p-4 rounded-full bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center"
              >
                <Phone size={22} className="rotate-12" />
              </button>
              <button
                onClick={declineCall}
                className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center"
              >
                <X size={22} />
              </button>
            </>
          ) : (
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center justify-center"
            >
              <X size={22} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallPanel;
