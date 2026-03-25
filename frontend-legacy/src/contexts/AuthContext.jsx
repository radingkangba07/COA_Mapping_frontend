/**
 * Authentication Context
 * Provides user authentication state and methods throughout the app.
 * 
 * This is a mock implementation that can be replaced with real auth later.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('coa_token');
    const savedUser = localStorage.getItem('coa_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/api/auth/login`, {
        user_id: userId
      });
      
      const { user: userData, token: authToken } = response.data;
      
      setUser(userData);
      setToken(authToken);
      
      // Persist to localStorage
      localStorage.setItem('coa_token', authToken);
      localStorage.setItem('coa_user', JSON.stringify(userData));
      
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await axios.post(`${API}/api/auth/logout`);
    } catch (err) {
      // Ignore logout errors
    }
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('coa_token');
    localStorage.removeItem('coa_user');
  }, []);

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(() => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`
    };
  }, [token]);

  // Check if user is authenticated
  const isAuthenticated = !!user && !!token;

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
