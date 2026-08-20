import React, { useState, useEffect } from 'react';

const CallDurationTimer = ({ callStartTime }) => {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!callStartTime) {
      setDuration(0);
      return;
    }

    // Compute initial duration immediately
    setDuration(Math.floor((Date.now() - callStartTime) / 1000));

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return <span>{formatTimer(duration)}</span>;
};

export default CallDurationTimer;
