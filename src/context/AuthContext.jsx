import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const AuthContext = createContext();

// Hash SHA-256 pour ne pas stocker le mot de passe en clair
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_USERNAME = 'admin';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 60_000; // 1 minute

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('bbadata-authenticated') === 'true';
  });
  const [username, setUsernameState] = useState(() => {
    return sessionStorage.getItem('bbadata-session-user') || localStorage.getItem('bbadata-username') || DEFAULT_USERNAME;
  });
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const failedAttempts = useRef(0);

  const login = useCallback(async (inputUsername, password) => {
    // Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      return { success: false, error: `Trop de tentatives. Réessayez dans ${remaining}s`, locked: true };
    }

    const storedUsername = localStorage.getItem('bbadata-username') || DEFAULT_USERNAME;
    const storedHash = localStorage.getItem('bbadata-password-hash');
    const inputHash = await hashPassword(password);

    // Premier lancement : pas de hash stocké → accepter "admin"/"admin"
    if (!storedHash) {
      if (inputUsername === 'admin' && password === 'admin') {
        const defaultHash = await hashPassword('admin');
        localStorage.setItem('bbadata-username', 'admin');
        localStorage.setItem('bbadata-password-hash', defaultHash);
        failedAttempts.current = 0;
        setIsAuthenticated(true);
        setUsernameState(inputUsername);
        setLastActivity(Date.now());
        sessionStorage.setItem('bbadata-authenticated', 'true');
        sessionStorage.setItem('bbadata-session-user', inputUsername);
        return { success: true };
      }
    }

    if (inputUsername !== storedUsername || (storedHash && inputHash !== storedHash) || (!storedHash && !(inputUsername === 'admin' && password === 'admin'))) {
      failedAttempts.current += 1;
      const remaining = MAX_ATTEMPTS - failedAttempts.current;

      if (failedAttempts.current >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION;
        setLockoutUntil(until);
        failedAttempts.current = 0;
        return { success: false, error: 'Compte verrouillé pendant 1 minute suite à trop de tentatives', locked: true };
      }

      return {
        success: false,
        error: `Identifiants incorrects. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}`,
        attemptsRemaining: remaining,
      };
    }

    // Success
    failedAttempts.current = 0;
    setLockoutUntil(null);
    setIsAuthenticated(true);
    setUsernameState(inputUsername);
    setLastActivity(Date.now());
    sessionStorage.setItem('bbadata-authenticated', 'true');
    sessionStorage.setItem('bbadata-session-user', inputUsername);
    return { success: true };
  }, [lockoutUntil]);

  const changeUsername = useCallback((newUsername) => {
    if (!newUsername || newUsername.trim().length < 2) {
      return { success: false, error: "Le nom d'utilisateur doit contenir au moins 2 caractères" };
    }
    const trimmed = newUsername.trim();
    localStorage.setItem('bbadata-username', trimmed);
    setUsernameState(trimmed);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('bbadata-authenticated');
    sessionStorage.removeItem('bbadata-session-user');
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const storedHash = localStorage.getItem('bbadata-password-hash');
    const currentHash = await hashPassword(currentPassword);

    if (currentHash !== storedHash) {
      return { success: false, error: 'Mot de passe actuel incorrect' };
    }

    if (newPassword.length < 4) {
      return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 4 caractères' };
    }

    const newHash = await hashPassword(newPassword);
    localStorage.setItem('bbadata-password-hash', newHash);
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout, changePassword, changeUsername, lastActivity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
