import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, sendLoginCode, updateUserSettings, verifyLoginCode } from '../lib/api';
import { clearToken, getToken, setToken } from '../lib/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await fetchMe();
      setUser(data.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onUnauthorized = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener('rember:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rember:unauthorized', onUnauthorized);
  }, []);

  const requestCode = useCallback(async (email) => {
    await sendLoginCode(email);
  }, []);

  const login = useCallback(async (email, code) => {
    const data = await verifyLoginCode(email, code);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const saveSettings = useCallback(async (settings) => {
    const data = await updateUserSettings(settings);
    setUser(data.user);
    return data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      requestCode,
      login,
      logout,
      saveSettings,
    }),
    [user, loading, requestCode, login, logout, saveSettings],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
