// ─────────────────────────────────────────────────────────────────
// BBA-Data – ClinicalAlerts (Alertes cliniques ISO 14971)
// ─────────────────────────────────────────────────────────────────

import React from 'react';
import { AlertTriangle, AlertOctagon, Info, ShieldCheck } from 'lucide-react';

const URGENCY_CONFIG = {
  0: {
    icon: ShieldCheck,
    label: 'Routine',
    badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    border: 'border-l-neutral-300',
  },
  1: {
    icon: Info,
    label: 'Surveillance',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    border: 'border-l-amber-400',
  },
  2: {
    icon: AlertTriangle,
    label: 'Référé',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    border: 'border-l-orange-500',
  },
  3: {
    icon: AlertOctagon,
    label: 'URGENCE',
    badge: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    border: 'border-l-red-600',
  },
};

export default function ClinicalAlerts({ alerts = [] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral-400 dark:text-neutral-500">
        <ShieldCheck size={20} className="mr-2" />
        <span className="text-sm">Aucune alerte active</span>
      </div>
    );
  }

  // Trier par urgence décroissante
  const sorted = [...alerts].sort((a, b) => b.niveau_urgence - a.niveau_urgence);

  return (
    <div
      className="mt-2 space-y-2 max-h-[280px] overflow-y-auto pr-1"
      role="list"
      aria-label="Liste des alertes cliniques actives"
    >
      {sorted.map((alert) => {
        const config = URGENCY_CONFIG[alert.niveau_urgence] || URGENCY_CONFIG[0];
        const Icon = config.icon;

        return (
          <div
            key={alert.examen_id}
            className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${config.border} bg-white dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-700/50 hover:shadow-sm transition-shadow`}
            role="listitem"
            aria-label={`Alerte ${config.label} pour ${alert.prenom} ${alert.nom}`}
          >
            <Icon
              size={16}
              className={`mt-0.5 shrink-0 ${
                alert.niveau_urgence >= 3
                  ? 'text-red-500'
                  : alert.niveau_urgence >= 2
                  ? 'text-orange-500'
                  : 'text-amber-500'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {alert.prenom} {alert.nom}
                </span>
                <span
                  className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-bold uppercase ${config.badge}`}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {alert.alerte_clinique}
              </p>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                {alert.diagnostic} · {alert.date_examen?.slice(0, 10)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
