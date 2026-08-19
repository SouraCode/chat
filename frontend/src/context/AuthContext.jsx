import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext();

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  }, []);

  // Set auth state on load
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();

        if (data.success) {
          setUser(data.user);
        } else {
          // Token expired or invalid
          clearAuthState();
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token, clearAuthState]);

  // Login handler
  const login = async (emailOrUsername, password) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailOrUsername, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server connection error' };
    }
  };

  // Register handler
  const register = async (username, email, password, avatar) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password, avatar })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server connection error' };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Error logging out on backend:', err);
    } finally {
      clearAuthState();
    }
  };

  // Update profile handler
  const updateProfile = async (username, avatar) => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, avatar })
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Update failed' };
      }
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Server connection error' };
    }
  };

  const blockUser = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => ({ ...prev, blockedUsers: data.blockedUsers }));
        return { success: true };
      }
    } catch (err) {
      console.error(err);
    }
    return { success: false };
  };

  const unblockUser = async (targetUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json();
      if (data.success) {
        setUser(prev => ({ ...prev, blockedUsers: data.blockedUsers }));
        return { success: true };
      }
    } catch (err) {
      console.error(err);
    }
    return { success: false };
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, blockUser, unblockUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
