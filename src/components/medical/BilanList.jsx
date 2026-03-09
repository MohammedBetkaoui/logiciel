// ─────────────────────────────────────────────────────────────────
// BBA-Data – Liste des Bilans Optométriques
// Recherche, filtres, tri – Conforme RGPD
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, ChevronDown, ChevronUp, Eye, Pencil, Trash2,
  Calendar, AlertTriangle, ArrowUpDown, RefreshCw,
  FileText, User, Clock, Loader2,
} from 'lucide-react';

// ─── Badge de niveau d'urgence ───────────────────────────────
function UrgenceBadge({ niveau }) {
  const config = {
    0: { label: 'Routine', cls: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400' },
    1: { label: 'Surveillance', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    2: { label: 'Référé', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    3: { label: 'Urgence', cls: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  };
  const c = config[niveau] || config[0];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${c.cls}`}>
      {niveau >= 2 && <AlertTriangle size={10} />}
      {c.label}
    </span>
  );
}

// ─── Formatage sphère ────────────────────────────────────────
function formatSphere(val) {
  if (val === null || val === undefined) return '—';
  return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function BilanList({ onSelectBilan, onEditBilan }) {
  const [bilans, setBilans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('all');
  const [sortField, setSortField] = useState('date_examen');
  const [sortDir, setSortDir] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ─── Chargement des bilans ─────────────────────────────────
  const loadBilans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans');
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

  // ─── Suppression d'un bilan ────────────────────────────────
  const handleDeleteBilan = async (examenId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bilans/${examenId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBilans((prev) => prev.filter((b) => b.examen_id !== examenId));
        setDeleteConfirm(null);
      }
    } catch {
      // error
    }
  };

  // ─── Filtrage & Tri ────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...bilans];

    // Recherche texte
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (b) =>
          (b.nom || '').toLowerCase().includes(s) ||
          (b.prenom || '').toLowerCase().includes(s) ||
          (b.diagnostic || '').toLowerCase().includes(s) ||
          (b.praticien || '').toLowerCase().includes(s)
      );
    }

    // Filtre urgence
    if (filterUrgence !== 'all') {
      result = result.filter((b) => b.niveau_urgence === Number(filterUrgence));
    }

    // Filtre date
    if (dateFrom) {
      result = result.filter((b) => b.date_examen >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((b) => b.date_examen <= dateTo + 'T23:59:59');
    }

    // Tri
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
  }, [bilans, searchTerm, filterUrgence, sortField, sortDir, dateFrom, dateTo]);

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

  // ─── Rendu ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Bilans Optométriques
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {filtered.length} bilan{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            <Filter size={13} /> Filtres
          </button>
          <button
            onClick={loadBilans}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>
      </div>

      {/* ─── Barre de recherche ─────────────────────────────── */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, diagnostic, praticien..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-500"
        />
      </div>

      {/* ─── Filtres avancés ────────────────────────────────── */}
      {showFilters && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Niveau d'urgence</label>
              <select
                value={filterUrgence}
                onChange={(e) => setFilterUrgence(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
              >
                <option value="all">Tous</option>
                <option value="0">Routine</option>
                <option value="1">Surveillance</option>
                <option value="2">Référé</option>
                <option value="3">Urgence</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Date début</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Date fin</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>
          <button
            onClick={() => { setFilterUrgence('all'); setDateFrom(''); setDateTo(''); setSearchTerm(''); }}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* ─── Table ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400">
            <Loader2 size={24} className="animate-spin mr-2" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              {bilans.length === 0 ? 'Aucun bilan enregistré' : 'Aucun résultat pour cette recherche'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  {[
                    { key: 'date_examen', label: 'Date', icon: Calendar },
                    { key: 'nom', label: 'Patient', icon: User },
                    { key: 'praticien', label: 'Praticien' },
                    { key: 'rx_od_sphere', label: 'SPH OD' },
                    { key: 'rx_og_sphere', label: 'SPH OG' },
                    { key: 'pio_od', label: 'PIO OD' },
                    { key: 'pio_og', label: 'PIO OG' },
                    { key: 'niveau_urgence', label: 'Urgence' },
                    { key: 'diagnostic', label: 'Diagnostic' },
                  ].map((col) => (
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
                {filtered.map((b) => (
                  <tr
                    key={b.examen_id}
                    onClick={() => onSelectBilan?.(b.examen_id)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                      <span className="flex items-center gap-1.5">
                        <Clock size={13} className="text-neutral-400" />
                        {formatDate(b.date_examen)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-100">
                      {b.nom} {b.prenom}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                      {b.praticien}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {formatSphere(b.rx_od_sphere)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {formatSphere(b.rx_og_sphere)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${b.pio_od > 21 ? 'text-red-600 font-bold' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      {b.pio_od ?? '—'}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${b.pio_og > 21 ? 'text-red-600 font-bold' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      {b.pio_og ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <UrgenceBadge niveau={b.niveau_urgence ?? 0} />
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate text-neutral-500 dark:text-neutral-400 text-xs">
                      {b.diagnostic || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectBilan?.(b.examen_id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir le détail"
                        >
                          <Eye size={13} /> Voir
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditBilan?.(b.examen_id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                          title="Modifier le bilan"
                        >
                          <Pencil size={13} /> Modifier
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(b.examen_id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer le bilan"
                        >
                          <Trash2 size={13} /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Modal de confirmation de suppression ─────────── */}
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
              Êtes-vous sûr de vouloir supprimer ce bilan optométrique ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteBilan(deleteConfirm)}
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
