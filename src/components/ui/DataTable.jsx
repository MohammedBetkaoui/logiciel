import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;

export default function DataTable({ columns, data, isLoading }) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  if (safePage !== page) setPage(safePage);
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
            {data.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map((row, rowIdx) => (
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
          {safePage * PAGE_SIZE + 1} - {Math.min((safePage + 1) * PAGE_SIZE, data.length)} sur {data.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
          >
            <ChevronLeft size={14} /> Précédent
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-7 h-7 text-xs rounded-md font-medium transition-colors ${
                i === safePage
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600'
              }`}
            >
              {i + 1}
            </button>
          )).slice(Math.max(0, safePage - 2), safePage + 3)}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
          >
            Suivant <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
