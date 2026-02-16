import React, { useState } from 'react';
import { Save, FolderOpen, Server, Palette } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Settings() {
  const [settings, setSettings] = useState({
    pythonPath: 'C:\\Python311\\python.exe',
    apiUrl: 'http://localhost:8000',
    dbPath: './data/database.sqlite',
    theme: 'system',
    autoConnect: true,
  });

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Paramètres</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Configurez votre environnement de travail
          </p>
        </div>
        <Button variant="primary" icon={Save} size="sm">
          Sauvegarder
        </Button>
      </div>

      {/* ─── Python Configuration ──────────────────────────── */}
      <Card title="Configuration Python" description="Chemin et runtime Python" icon={Server}>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              Chemin de l'exécutable Python
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.pythonPath}
                onChange={(e) => handleChange('pythonPath', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
              <Button variant="secondary" icon={FolderOpen} size="sm">
                Parcourir
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              URL du serveur FastAPI
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => handleChange('apiUrl', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Connexion automatique</p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500">Se connecter au backend Python au démarrage</p>
            </div>
            <button
              onClick={() => handleChange('autoConnect', !settings.autoConnect)}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                settings.autoConnect ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  settings.autoConnect ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* ─── Database Configuration ────────────────────────── */}
      <Card title="Base de données" description="Configuration SQLite" icon={FolderOpen}>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">
              Chemin du fichier SQLite
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.dbPath}
                onChange={(e) => handleChange('dbPath', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
              />
              <Button variant="secondary" icon={FolderOpen} size="sm">
                Parcourir
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── Appearance ────────────────────────────────────── */}
      <Card title="Apparence" description="Personnalisez l'interface" icon={Palette}>
        <div className="mt-2">
          <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
            Thème
          </label>
          <div className="flex gap-2">
            {['system', 'light', 'dark'].map((theme) => (
              <button
                key={theme}
                onClick={() => handleChange('theme', theme)}
                className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                  settings.theme === theme
                    ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500'
                    : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-400 dark:hover:bg-neutral-700'
                }`}
              >
                {theme === 'system' ? 'Système' : theme === 'light' ? 'Clair' : 'Sombre'}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
