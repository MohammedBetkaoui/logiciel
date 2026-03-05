import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [shake, setShake] = useState(false);

  // Countdown timer for lockout
  useEffect(() => {
    if (countdown <= 0) { setLocked(false); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 600);

      if (result.locked) {
        setLocked(true);
        setCountdown(60);
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen w-screen select-none overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-neutral-950">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-125 h-125 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-100 h-100 rounded-full bg-blue-500/8 blur-[100px]" />
      </div>

      {/* Login container */}
      <div className={`relative z-10 w-full max-w-100 mx-4 ${shake ? 'animate-shake' : ''}`}>
        {/* Logo & branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 mb-5">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">BBA-Data</h1>
          <p className="text-sm text-neutral-500 mt-1.5">
            Système d'Analyse des Bilans Optométriques
          </p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl border border-neutral-800 shadow-2xl shadow-black/40">
          <div className="p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Connexion</h2>
              <p className="text-xs text-neutral-500 mt-1">Entrez vos identifiants pour continuer</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-400">
                  Nom d'utilisateur
                </label>
                <div className="relative group">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Entrez votre identifiant"
                    autoFocus
                    disabled={locked}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all duration-200 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-neutral-400">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe"
                    disabled={locked}
                    className="w-full pl-10 pr-11 py-3 text-sm rounded-xl bg-neutral-800/80 border border-neutral-700/80 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 transition-all duration-200 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !username || !password || locked}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connexion en cours…
                  </>
                ) : locked ? (
                  <>
                    <Lock size={14} />
                    Verrouillé ({countdown}s)
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
          </div>

          {/* Footer bar */}
          <div className="border-t border-neutral-800 px-7 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-neutral-600">Système sécurisé</span>
              </div>
              <span className="text-[11px] text-neutral-700">v1.0.0</span>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center text-[11px] text-neutral-700 mt-5">
          Institut BBA – Analyse Statistique des Bilans Optométriques
        </p>
      </div>
    </div>
  );
}
