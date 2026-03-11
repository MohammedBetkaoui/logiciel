// ─────────────────────────────────────────────────────────────────
// BBA-Data – Liste des Bilans Simplifiés
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Trash2, RefreshCw, FileText, Loader2,
  ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 15;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function BilanSimpleList() {
  const [bilans, setBilans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date_creation');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(0);

  const loadBilans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans-simples');
      if (res.ok) {
        const data = await res.json();
        setBilans(data);
      }
    } catch {
      // Backend offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadBilans(); }, [loadBilans]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bilans-simples/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBilans((prev) => prev.filter((b) => b.bilan_simple_id !== id));
        setDeleteConfirm(null);
      }
    } catch {
      // error
    }
  };

  const filtered = useMemo(() => {
    let result = [...bilans];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          (b.ametropie || '').toLowerCase().includes(s) ||
          (b.anomalies || '').toLowerCase().includes(s) ||
          (b.sexe || '').toLowerCase().includes(s) ||
          (b.acuite_visuelle || '').toLowerCase().includes(s) ||
          (b.statut_refractif || '').toLowerCase().includes(s) ||
          String(b.age).includes(s)
      );
    }
    result.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [bilans, searchTerm, sortField, sortDir]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [searchTerm, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, filtered.length);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-neutral-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-blue-500" />
    ) : (
      <ChevronDown size={12} className="text-blue-500" />
    );
  };

  const columns = [
    { key: 'date_creation', label: 'Date' },
    { key: 'age', label: 'Âge' },
    { key: 'sexe', label: 'Sexe' },
    { key: 'ametropie', label: 'Amétropie' },
    { key: 'anomalies', label: 'Anomalies' },
    { key: 'acuite_visuelle', label: 'Acuité Visuelle' },
    { key: 'statut_refractif', label: 'Statut Réfractif' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Bilans Simplifiés
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {filtered.length} bilan{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={loadBilans}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
        >
          <RefreshCw size={13} /> Actualiser
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par amétropie, anomalie, sexe, acuité..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              {bilans.length === 0 ? 'Aucun bilan simplifié enregistré' : 'Aucun résultat pour cette recherche'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label} <SortIcon field={col.key} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/50">
                {paged.map((b) => (
                  <tr key={b.bilan_simple_id} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      {formatDate(b.date_creation)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-100">
                      {b.age}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      {b.sexe}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      <div className="flex flex-wrap gap-1">
                        {(b.ametropie || '').split(',').map((a, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {a.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      <div className="flex flex-wrap gap-1">
                        {(b.anomalies || '—').split(',').map((a, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 text-[11px] font-medium rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            {a.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-100">
                      {b.acuite_visuelle || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        b.statut_refractif === 'Emmetrope'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {b.statut_refractif}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDeleteConfirm(b.bilan_simple_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* \u2500\u2500\u2500 Pagination \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {from} - {to} sur {filtered.length}
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
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Supprimer le bilan</h3>
                <p className="text-xs text-neutral-400">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">
              Êtes-vous sûr de vouloir supprimer ce bilan simplifié ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
