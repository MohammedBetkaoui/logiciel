import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({ columns, data, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm overflow-hidden">
        <div className="animate-pulse p-6 space-y-4">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {[...Array(columns.length)].map((_, j) => (
                <div key={j} className="h-4 bg-neutral-100 dark:bg-neutral-700/50 rounded flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm p-12 text-center">
        <p className="text-neutral-400 dark:text-neutral-500 text-sm">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/60 dark:bg-neutral-800/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
                    {col.label}
                    <div className="flex flex-col">
                      <ChevronUp size={10} className="text-neutral-300 dark:text-neutral-600" />
                      <ChevronDown size={10} className="-mt-0.5 text-neutral-300 dark:text-neutral-600" />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ─── Pagination footer ────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-800/50">
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {data.length} résultat{data.length > 1 ? 's' : ''}
        </span>
        <div className="flex gap-1">
          <button className="px-3 py-1 text-xs rounded-md bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600 transition-colors">
            Précédent
          </button>
          <button className="px-3 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
