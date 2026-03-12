import React from 'react';
import {
  Stethoscope,
  Users,
  ClipboardList,
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
    title: 'Données',
    items: [
      { id: 'medical-dashboard', label: 'Tableau de bord', icon: Stethoscope },
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'bilans', label: 'Bilans', icon: ClipboardList },
      { id: 'import-csv', label: 'Importer', icon: FileUp },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { id: 'statistical-analysis', label: 'Statistiques', icon: BarChart3 },
      { id: 'guide-statistiques', label: 'Guide', icon: HelpCircle },
      { id: 'normes', label: 'Normes', icon: BookOpen },
    ],
  },
  {
    title: 'Système',
    items: [
      { id: 'settings', label: 'Paramètres', icon: Settings },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="w-60 shrink-0 bg-gradient-to-b from-slate-50 to-white dark:from-neutral-950 dark:to-neutral-900 border-r border-slate-200/80 dark:border-neutral-800 flex flex-col">
      {/* ─── Navigation ──────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-neutral-500 px-3 mb-2 font-semibold">
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
                    group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 ease-out
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/[0.12] to-indigo-500/[0.06] dark:from-blue-500/20 dark:to-indigo-500/10 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/[0.08] dark:shadow-blue-500/10'
                        : 'text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-100/80 dark:hover:bg-neutral-800/60'
                    }
                  `}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-blue-500 to-indigo-500" />
                  )}
                  <Icon size={18} className={`transition-colors duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-neutral-500 group-hover:text-slate-600 dark:group-hover:text-neutral-300'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && (
                    <ChevronRight size={14} className="text-blue-500/50 dark:text-blue-400/50" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <div className="px-4 py-3.5 border-t border-slate-200/80 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/20">
            <Heart size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-neutral-300 truncate">BBA-Data</p>
            <p className="text-[10px] text-slate-400 dark:text-neutral-500 truncate">v1.0.0 – Institut BBA</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
