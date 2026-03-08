import React from 'react';
import {
  Stethoscope,
  Users,
  ClipboardList,
  Database,
  Settings,
  ChevronRight,
  Heart,
  FileUp,
  BarChart3,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

const navSections = [
  {
    title: 'Collecte',
    items: [
      { id: 'medical-dashboard', label: 'Tableau de bord', icon: Stethoscope },
      { id: 'patients', label: 'Patients / Examens', icon: Users },
      { id: 'bilans', label: 'Bilans optométriques', icon: ClipboardList },
    ],
  },
  {
    title: 'Transfert',
    items: [
      { id: 'import-csv', label: 'Import CSV', icon: FileUp },
      { id: 'database', label: 'Base de données', icon: Database },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { id: 'statistical-analysis', label: 'Analyse statistique', icon: BarChart3 },
      { id: 'guide-statistiques', label: 'Guide des statistiques', icon: HelpCircle },
      { id: 'normes', label: 'Référentiel normatif', icon: BookOpen },
      { id: 'settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-60 shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
      {/* ─── Navigation ──────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 px-3 mb-2 font-medium">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = activePage === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    group flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 shadow-sm shadow-blue-500/10'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                    }
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-neutral-300'} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-blue-400/60" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Heart size={12} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-neutral-300 truncate">BBA-Data</p>
            <p className="text-[10px] text-neutral-500 truncate">v1.0.0 – Institut BBA</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
