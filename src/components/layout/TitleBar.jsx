import React, { useState, useEffect, useCallback } from 'react';
import { Minus, Square, X, Circle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function TitleBar() {
  const [backendOnline, setBackendOnline] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const api = window.electronAPI;

  const checkBackend = useCallback(async () => {
    if (!api?.checkHealth) {
      // In browser dev mode, simulate offline
      setBackendOnline(false);
      return;
    }
    try {
      const result = await api.checkHealth();
      setBackendOnline(result.online);
    } catch {
      setBackendOnline(false);
    }
  }, [api]);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 5000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  return (
    <header
      className="flex items-center justify-between h-10 bg-neutral-900 border-b border-neutral-800 px-4 shrink-0"
      style={{ WebkitAppRegion: 'drag' }}
    >
      {/* Left: App name + backend status */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white tracking-wide">
          BBA-Data
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-800/60">
          <Circle
            size={8}
            className={`fill-current ${
              backendOnline ? 'text-emerald-400' : 'text-red-400'
            }`}
          />
          <span className="text-[11px] text-neutral-400">
            Backend {backendOnline ? 'connecté' : 'hors ligne'}
          </span>
        </div>
      </div>

      {/* Right: Theme toggle + Window controls */}
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700/60 transition-colors"
          aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <div className="w-px h-4 bg-neutral-700 mx-1" />
        <button
          onClick={() => api?.minimize()}
          className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700/60 transition-colors"
          aria-label="Réduire"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => api?.maximize()}
          className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-700/60 transition-colors"
          aria-label="Agrandir"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => api?.close()}
          className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-red-500/80 transition-colors"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
