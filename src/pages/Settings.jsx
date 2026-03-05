import React, { useState, useMemo } from 'react';
import { Palette, Sun, Moon, Monitor, Type, Droplets, Lock, Eye, EyeOff, CheckCircle, LogOut, User, Shield, AlertTriangle } from 'lucide-react';
import Card from '../components/ui/Card';
import { useTheme, ACCENT_COLORS } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const THEME_MODES = [
  { id: 'system', label: 'Système', icon: Monitor, desc: 'Suit les préférences OS' },
  { id: 'light',  label: 'Clair',   icon: Sun,     desc: 'Interface lumineuse' },
  { id: 'dark',   label: 'Sombre',  icon: Moon,    desc: 'Réduit la fatigue visuelle' },
];

const ACCENT_OPTIONS = [
  { id: 'blue',    label: 'Bleu' },
  { id: 'violet',  label: 'Violet' },
  { id: 'emerald', label: 'Émeraude' },
  { id: 'rose',    label: 'Rose' },
  { id: 'amber',   label: 'Ambre' },
  { id: 'cyan',    label: 'Cyan' },
];

const FONT_SIZES = [
  { id: 'small',  label: 'Petit',  preview: 'Aa' },
  { id: 'normal', label: 'Normal', preview: 'Aa' },
  { id: 'large',  label: 'Grand',  preview: 'Aa' },
];

export default function Settings() {
  const { mode, setMode, accentColor, setAccentColor, fontSize, setFontSize } = useTheme();
  const { changePassword, changeUsername, logout, username } = useAuth();

  const [newUsername, setNewUsername] = useState(username);
  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const handleChangeUsername = (e) => {
    e.preventDefault();
    setUsernameError('');
    setUsernameSuccess('');
    const result = changeUsername(newUsername);
    if (result.success) {
      setUsernameSuccess("Nom d'utilisateur modifié avec succès");
      setTimeout(() => setUsernameSuccess(''), 3000);
    } else {
      setUsernameError(result.error);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPwd !== confirmPwd) {
      setPwdError('Les mots de passe ne correspondent pas');
      return;
    }

    setPwdLoading(true);
    const result = await changePassword(currentPwd, newPwd);
    setPwdLoading(false);

    if (result.success) {
      setPwdSuccess('Mot de passe modifié avec succès');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdSuccess(''), 3000);
    } else {
      setPwdError(result.error);
    }
  };

  // Password strength
  const pwdStrength = useMemo(() => {
    if (!newPwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPwd.length >= 4) score++;
    if (newPwd.length >= 8) score++;
    if (/[A-Z]/.test(newPwd) && /[a-z]/.test(newPwd)) score++;
    if (/\d/.test(newPwd)) score++;
    if (/[^A-Za-z0-9]/.test(newPwd)) score++;

    if (score <= 1) return { level: 1, label: 'Faible', color: 'bg-red-500' };
    if (score <= 2) return { level: 2, label: 'Moyen', color: 'bg-amber-500' };
    if (score <= 3) return { level: 3, label: 'Bon', color: 'bg-blue-500' };
    return { level: 4, label: 'Excellent', color: 'bg-emerald-500' };
  }, [newPwd]);

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Paramètres</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          Configurez votre environnement de travail
        </p>
      </div>

      {/* ─── Theme Mode ───────────────────────────────────── */}
      <Card title="Mode d'affichage" description="Choisissez entre clair, sombre ou automatique" icon={Palette}>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {THEME_MODES.map(({ id, label, icon: Icon, desc }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                  ${active
                    ? 'border-(--accent-primary) bg-(--accent-light) dark:bg-(--accent-primary)/10 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
              >
                {/* Preview miniature */}
                <div className={`w-full h-16 rounded-lg overflow-hidden border ${
                  active ? 'border-(--accent-primary)/30' : 'border-neutral-200 dark:border-neutral-700'
                }`}>
                  {id === 'light' && (
                    <div className="h-full bg-white flex items-center p-2 gap-1.5">
                      <div className="w-5 h-full rounded bg-neutral-100" />
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 w-3/4 rounded bg-neutral-200" />
                        <div className="h-1.5 w-1/2 rounded bg-neutral-200" />
                        <div className="h-3 w-full rounded bg-(--accent-primary)/20" />
                      </div>
                    </div>
                  )}
                  {id === 'dark' && (
                    <div className="h-full bg-neutral-900 flex items-center p-2 gap-1.5">
                      <div className="w-5 h-full rounded bg-neutral-800" />
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 w-3/4 rounded bg-neutral-700" />
                        <div className="h-1.5 w-1/2 rounded bg-neutral-700" />
                        <div className="h-3 w-full rounded bg-(--accent-primary)/20" />
                      </div>
                    </div>
                  )}
                  {id === 'system' && (
                    <div className="h-full flex">
                      <div className="w-1/2 bg-white flex items-center p-1.5 gap-1">
                        <div className="w-3 h-full rounded bg-neutral-100" />
                        <div className="flex-1 space-y-0.5">
                          <div className="h-1 w-3/4 rounded bg-neutral-200" />
                          <div className="h-1 w-1/2 rounded bg-neutral-200" />
                        </div>
                      </div>
                      <div className="w-1/2 bg-neutral-900 flex items-center p-1.5 gap-1">
                        <div className="w-3 h-full rounded bg-neutral-800" />
                        <div className="flex-1 space-y-0.5">
                          <div className="h-1 w-3/4 rounded bg-neutral-700" />
                          <div className="h-1 w-1/2 rounded bg-neutral-700" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Icon size={18} className={active
                  ? 'text-(--accent-primary)'
                  : 'text-neutral-400 dark:text-neutral-500'} />
                <span className={`text-sm font-medium ${active
                  ? 'text-(--accent-primary)'
                  : 'text-neutral-600 dark:text-neutral-300'}`}>
                  {label}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{desc}</span>

                {active && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-(--accent-primary)" />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ─── Accent Color ─────────────────────────────────── */}
      <Card title="Couleur d'accent" description="Personnalisez la couleur principale de l'interface" icon={Droplets}>
        <div className="grid grid-cols-6 gap-3 mt-3">
          {ACCENT_OPTIONS.map(({ id, label }) => {
            const active = accentColor === id;
            const color = ACCENT_COLORS[id];
            return (
              <button
                key={id}
                onClick={() => setAccentColor(id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
                  ${active
                    ? 'border-neutral-800 dark:border-neutral-200 shadow-sm'
                    : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700'
                  }`}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-inner transition-transform duration-200 hover:scale-110"
                  style={{
                    backgroundColor: color.primary,
                    boxShadow: active ? `0 0 0 3px ${color.primary}33` : 'none',
                  }}
                />
                <span className={`text-xs font-medium ${active
                  ? 'text-neutral-800 dark:text-neutral-100'
                  : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Live preview bar */}
        <div className="mt-4 p-3 rounded-lg flex items-center gap-3"
             style={{ backgroundColor: ACCENT_COLORS[accentColor].light }}>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ACCENT_COLORS[accentColor].primary }} />
          <span className="text-sm font-medium" style={{ color: ACCENT_COLORS[accentColor].primary }}>
            Aperçu de la couleur {ACCENT_OPTIONS.find(a => a.id === accentColor)?.label}
          </span>
          <div className="ml-auto px-3 py-1 rounded-md text-xs text-white font-medium"
               style={{ backgroundColor: ACCENT_COLORS[accentColor].primary }}>
            Bouton
          </div>
        </div>
      </Card>

      {/* ─── Font Size ────────────────────────────────────── */}
      <Card title="Taille du texte" description="Ajustez la taille de la police" icon={Type}>
        <div className="flex gap-3 mt-3">
          {FONT_SIZES.map(({ id, label, preview }) => {
            const active = fontSize === id;
            const previewSize = id === 'small' ? '14px' : id === 'normal' ? '18px' : '22px';
            return (
              <button
                key={id}
                onClick={() => setFontSize(id)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                  ${active
                    ? 'border-(--accent-primary) bg-(--accent-light) dark:bg-(--accent-primary)/10 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  }`}
              >
                <span style={{ fontSize: previewSize }} className={`font-bold ${active
                  ? 'text-(--accent-primary)'
                  : 'text-neutral-400 dark:text-neutral-500'}`}>
                  {preview}
                </span>
                <span className={`text-sm font-medium ${active
                  ? 'text-(--accent-primary)'
                  : 'text-neutral-600 dark:text-neutral-300'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ─── Account & Security ─────────────────────────── */}
      <Card title="Compte & Sécurité" description="Gérez votre identifiant et votre mot de passe" icon={Shield}>
        <div className="mt-3 space-y-6">
          {/* ── Profile header ── */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{username}</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Administrateur</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
            >
              <LogOut size={13} />
              Déconnexion
            </button>
          </div>

          {/* ── Username section ── */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <User size={13} /> Identifiant
            </h4>

            {usernameSuccess && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
                <CheckCircle size={15} />
                {usernameSuccess}
              </div>
            )}
            {usernameError && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                <AlertTriangle size={15} />
                {usernameError}
              </div>
            )}

            <form onSubmit={handleChangeUsername} className="flex gap-2">
              <div className="relative flex-1">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                />
              </div>
              <button
                type="submit"
                disabled={newUsername === username || !newUsername.trim()}
                className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
              >
                Modifier
              </button>
            </form>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          {/* ── Password section ── */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Lock size={13} /> Mot de passe
            </h4>

            {pwdSuccess && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
                <CheckCircle size={15} />
                {pwdSuccess}
              </div>
            )}
            {pwdError && (
              <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm animate-fade-in">
                <AlertTriangle size={15} />
                {pwdError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              {/* Current password */}
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Mot de passe actuel"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                >
                  {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* New password */}
              <div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full pl-9 pr-10 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  >
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {/* Strength bar */}
                {newPwd && (
                  <div className="mt-2 animate-fade-in">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i <= pwdStrength.level ? pwdStrength.color : 'bg-neutral-200 dark:bg-neutral-700'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-[11px] mt-1 font-medium ${
                      pwdStrength.level <= 1 ? 'text-red-500' :
                      pwdStrength.level <= 2 ? 'text-amber-500' :
                      pwdStrength.level <= 3 ? 'text-blue-500' : 'text-emerald-500'
                    }`}>
                      {pwdStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Confirmer le nouveau mot de passe"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                />
                {confirmPwd && newPwd && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {confirmPwd === newPwd
                      ? <CheckCircle size={15} className="text-emerald-500" />
                      : <AlertTriangle size={15} className="text-amber-500" />
                    }
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={pwdLoading || !currentPwd || !newPwd || !confirmPwd}
                className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
              >
                {pwdLoading ? 'Modification…' : 'Modifier le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
