import React, { useState, useEffect } from 'react';
import {
  Database,
  FlaskConical,
  Activity,
  HardDrive,
  TrendingUp,
  Clock,
} from 'lucide-react';
import Card from '../components/ui/Card';

export default function Dashboard() {
  const [stats, setStats] = useState([
    { label: 'Total patients', value: '0', icon: Database, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Total examens', value: '0', icon: FlaskConical, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Alertes actives', value: '0', icon: Activity, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Examens ce mois', value: '0', icon: HardDrive, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  ]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('http://localhost:8000/api/dashboard/stats');
        if (res.ok) {
          const d = await res.json();
          setStats([
            { label: 'Total patients', value: String(d.total_patients ?? 0), icon: Database, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            { label: 'Total examens', value: String(d.total_examens ?? 0), icon: FlaskConical, color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
            { label: 'Alertes actives', value: String(d.alertes_actives ?? 0), icon: Activity, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: 'Examens ce mois', value: String(d.examens_ce_mois ?? 0), icon: HardDrive, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
          ]);
          setBackendOnline(true);
        }
      } catch {
        setBackendOnline(false);
      }

      // Load recent audit activity
      try {
        const res = await fetch('http://localhost:8000/api/dashboard/alerts');
        if (res.ok) {
          const alerts = await res.json();
          setRecentActivity(alerts.slice(0, 4).map(a => ({
            action: `${a.alerte_clinique} – ${a.nom} ${a.prenom}`,
            time: a.date_examen,
            status: a.niveau_urgence >= 2 ? 'error' : 'success',
          })));
        }
      } catch { /* ignore */ }
    }
    loadStats();
  }, []);
  return (
    <div className="space-y-6">
      {/* ─── Title ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Tableau de bord</h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          Vue d'ensemble de votre application
        </p>
      </div>

      {/* ─── Stats Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Quick Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Activité récente"
          description={recentActivity.length ? 'Dernières alertes cliniques' : 'Aucune activité'}
          icon={TrendingUp}
        >
          <div className="space-y-3 mt-2">
            {recentActivity.length === 0 && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">Aucune donnée disponible</p>
            )}
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      item.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">{item.action}</span>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{item.time}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Statut système"
          description="État des services backend"
          icon={Clock}
        >
          <div className="space-y-3 mt-2">
            {[
              { service: 'Serveur FastAPI', status: backendOnline ? 'En ligne' : 'Hors ligne', online: backendOnline },
              { service: 'Base SQLite', status: 'Prêt', online: true },
              { service: 'Python Runtime', status: 'Détecté', online: true },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
              >
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{item.service}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      item.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {item.status}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.online ? 'bg-emerald-400' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
