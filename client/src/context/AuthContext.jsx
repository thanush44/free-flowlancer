import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and check current token
  useEffect(() => {
    async function initAuth() {
      const storedToken = getAuthToken();
      if (storedToken) {
        try {
          const res = await api.getMe();
          setUser(res.user);
        } catch {
          console.warn('Session expired or invalid, auto-logging in demo user');
          setAuthToken(null);
          setToken(null);
          await handleDemoLogin();
        }
      } else {
        // Auto-provision or login demo account for instant evaluation
        await handleDemoLogin();
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  async function handleDemoLogin() {
    try {
      const demoEmail = 'alex.freelancer@persevex.io';
      const demoPass = 'DemoPass2026!';
      try {
        const res = await api.login({ email: demoEmail, password: demoPass });
        setAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } catch {
        // User might not exist yet, register demo user
        const regRes = await api.register({
          name: 'Alex Rivera (Freelancer)',
          email: demoEmail,
          password: demoPass,
          plan: 'pro',
          hourly_rate: 2500,
        });
        setAuthToken(regRes.token);
        setToken(regRes.token);
        setUser(regRes.user);
        // Seed initial sample data for new demo account
        await api.seedSampleData().catch(() => {});
      }
    } catch (e) {
      console.error('Demo auto-login error:', e);
    }
  }

  async function login(email, password) {
    setAuthError(null);
    try {
      const res = await api.login({ email, password });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }

  async function register(name, email, password, plan = 'pro', hourly_rate = 1500) {
    setAuthError(null);
    try {
      const res = await api.register({ name, email, password, plan, hourly_rate });
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  }

  function logout() {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  async function togglePlan(targetPlan) {
    try {
      const res = await api.togglePlan(targetPlan);
      setUser((prev) => (prev ? { ...prev, plan: res.plan } : null));
      return res.plan;
    } catch (err) {
      console.error('Failed to toggle plan:', err);
      throw err;
    }
  }

  async function updateProfile(payload) {
    const res = await api.updateProfile(payload);
    setUser(res.user);
    return res.user;
  }

  async function refreshUser() {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        togglePlan,
        updateProfile,
        refreshUser,
        loadDemoUser: handleDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
