// ─────────────────────────────────────────────────────────────────
// BBA-Data – Liste des Bilans Simplifiés (avec gestion)
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Trash2, RefreshCw, FileText, Loader2,
  ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Filter, X, Eye, Pencil, User, Calendar, AlertTriangle, Save,
} from 'lucide-react';

const PAGE_SIZE = 15;

const AMETROPIE_OPTIONS = [
  'Myopie', 'Hypermetropie', 'Astigmatisme', 'Presbytie', 'Anisometropie',
];
const ANOMALIES_OPTIONS = [
  'Strabisme', 'Amblyopie', 'Nystagmus', 'Daltonisme', 'Ptosis',
  'Cataracte', 'Glaucome', 'Keratocone', 'Aucune',
];
const ACUITE_VISUELLE_OPTIONS = [
  'PL- (Pas de perception)', 'PL+ (Perception lumineuse)',
  'VBLM (Voit bouger la main)', 'CLD (Compte les doigts)',
  '<1/10', '1/10', '2/10', '3/10', '4/10', '5/10',
  '6/10', '7/10', '8/10', '9/10', '10/10',
];

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

export default function BilanSimpleList({ onEditBilan }) {
  const [bilans, setBilans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSexe, setFilterSexe] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('date_creation');
  const [sortDir, setSortDir] = useState('desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(0);
  const [selectedBilan, setSelectedBilan] = useState(null);
  const [editBilan, setEditBilan] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const loadBilans = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans-simples');
      if (res.ok) setBilans(await res.json());
    } catch { /* Backend offline */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadBilans(); }, [loadBilans]);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bilans-simples/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBilans((prev) => prev.filter((b) => b.bilan_simple_id !== id));
        setDeleteConfirm(null);
        if (selectedBilan?.bilan_simple_id === id) setSelectedBilan(null);
      }
    } catch { /* error */ }
  };

  // ─── Edit modal ──────────────────────────────────────────
  const openEdit = (bilan) => {
    setEditForm({
      age: bilan.age ?? '',
      sexe: bilan.sexe ?? '',
      ametropie: bilan.ametropie ? bilan.ametropie.split(',').map((s) => s.trim()).filter(Boolean) : [],
      anomalies: bilan.anomalies ? bilan.anomalies.split(',').map((s) => s.trim()).filter(Boolean) : [],
      acuite_visuelle: bilan.acuite_visuelle ?? '',
      statut_refractif: bilan.statut_refractif ?? '',
    });
    setEditError('');
    setEditBilan(bilan);
  };

  const handleEditChange = (field, value) => {
    setEditForm((f) => ({ ...f, [field]: value }));
  };

  const toggleEditAmetropie = (item) => {
    setEditForm((f) => ({
      ...f,
      ametropie: f.ametropie.includes(item) ? f.ametropie.filter((a) => a !== item) : [...f.ametropie, item],
    }));
  };

  const toggleEditAnomalie = (item) => {
    setEditForm((f) => {
      let updated;
      if (item === 'Aucune') {
        updated = f.anomalies.includes('Aucune') ? [] : ['Aucune'];
      } else {
        const without = f.anomalies.filter((a) => a !== 'Aucune');
        updated = without.includes(item) ? without.filter((a) => a !== item) : [...without, item];
      }
      return { ...f, anomalies: updated };
    });
  };

  const handleEditSave = async () => {
    if (!editForm.age || !editForm.sexe || editForm.ametropie.length === 0 || !editForm.statut_refractif) {
      setEditError('Âge, sexe, amétropie et statut réfractif sont requis.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const payload = {
        age: Number(editForm.age),
        sexe: editForm.sexe,
        ametropie: editForm.ametropie.join(', '),
        anomalies: editForm.anomalies.join(', '),
        acuite_visuelle: editForm.acuite_visuelle,
        statut_refractif: editForm.statut_refractif,
      };
      const res = await fetch(`http://localhost:8000/api/bilans-simples/${editBilan.bilan_simple_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditBilan(null);
        setSelectedBilan(null);
        loadBilans();
      } else {
        const err = await res.json().catch(() => ({}));
        setEditError(err.detail || 'Erreur lors de la mise à jour.');
      }
    } catch {
      setEditError('Impossible de contacter le serveur.');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Filtering ───────────────────────────────────────────
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
    if (filterSexe !== 'all') result = result.filter((b) => b.sexe === filterSexe);
    if (filterStatut !== 'all') result = result.filter((b) => b.statut_refractif === filterStatut);
    if (filterAge !== 'all') {
      const [min, max] = filterAge.split('-').map(Number);
      result = result.filter((b) => b.age >= min && b.age <= max);
    }
    result.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (va == null) va = '';
      if (vb == null) vb = '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [bilans, searchTerm, filterSexe, filterStatut, filterAge, sortField, sortDir]);

  useEffect(() => { setPage(0); }, [searchTerm, filterSexe, filterStatut, filterAge, sortField, sortDir]);

  const hasActiveFilters = filterSexe !== 'all' || filterStatut !== 'all' || filterAge !== 'all';
  const activeFilterCount = [filterSexe !== 'all', filterStatut !== 'all', filterAge !== 'all'].filter(Boolean).length;
  const resetFilters = () => { setFilterSexe('all'); setFilterStatut('all'); setFilterAge('all'); setSearchTerm(''); };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, filtered.length);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-neutral-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />;
  };

  const columns = [
    { key: 'date_creation', label: 'Date' },
    { key: 'age', label: 'Âge' },
    { key: 'sexe', label: 'Sexe' },
    { key: 'ametropie', label: 'Amétropie' },
    { key: 'acuite_visuelle', label: 'Acuité' },
    { key: 'statut_refractif', label: 'Statut' },
  ];

  // ─── Detail row helper ─────────────────────────────────
  const DetailRow = ({ label, children }) => (
    <div className="py-2">
      <p className="text-[11px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
      <div className="text-sm text-neutral-800 dark:text-neutral-100 mt-0.5">{children}</div>
    </div>
  );

  const BadgeList = ({ text, color = 'blue' }) => {
    if (!text) return <span className="text-neutral-400">—</span>;
    const colors = {
      blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    };
    return (
      <div className="flex flex-wrap gap-1">
        {text.split(',').map((item, i) => (
          <span key={i} className={`inline-block px-1.5 py-0.5 text-[11px] font-medium rounded ${colors[color]}`}>
            {item.trim()}
          </span>
        ))}
      </div>
    );
  };

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            <Filter size={13} /> Filtres{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
          <button
            onClick={loadBilans}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={13} /> Actualiser
          </button>
        </div>
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

      {/* Filtres avancés */}
      {showFilters && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sexe</label>
              <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} className={inputCls}>
                <option value="all">Tous</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Statut réfractif</label>
              <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className={inputCls}>
                <option value="all">Tous</option>
                <option value="Emmetrope">Emmétrope</option>
                <option value="Non emmetrope">Non emmétrope</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Tranche d'âge</label>
              <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)} className={inputCls}>
                <option value="all">Toutes</option>
                <option value="0-6">0 - 6 ans</option>
                <option value="7-12">7 - 12 ans</option>
                <option value="13-18">13 - 18 ans</option>
                <option value="19-30">19 - 30 ans</option>
                <option value="31-45">31 - 45 ans</option>
                <option value="46-60">46 - 60 ans</option>
                <option value="61-120">61+ ans</option>
              </select>
            </div>
          </div>
          <button onClick={resetFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            Réinitialiser les filtres
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* ─── Main table area ──────────────────────────────── */}
        <div className={`space-y-4 transition-all ${selectedBilan ? 'flex-1 min-w-0' : 'w-full'}`}>
          {/* Table */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-neutral-400">
                <Loader2 size={24} className="animate-spin mr-2" /> Chargement...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <FileText size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-sm text-neutral-400">
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
                      <tr
                        key={b.bilan_simple_id}
                        onClick={() => setSelectedBilan(b)}
                        className={`cursor-pointer transition-colors ${
                          selectedBilan?.bilan_simple_id === b.bilan_simple_id
                            ? 'bg-blue-50/70 dark:bg-blue-900/20'
                            : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {formatDate(b.date_creation)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-neutral-800 dark:text-neutral-100">
                          {b.age} ans
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                          {b.sexe}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(b.ametropie || '').split(',').map((a, i) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 text-[11px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
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
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedBilan(b); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                              title="Modifier"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(b.bilan_simple_id); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={13} />
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

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <span className="text-xs text-neutral-400">{from} - {to} sur {filtered.length}</span>
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
        </div>

        {/* ─── Detail panel (right side) ──────────────────────── */}
        {selectedBilan && (
          <div className="w-80 shrink-0 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden self-start sticky top-4">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Eye size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <button onClick={() => setSelectedBilan(null)} className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-neutral-700 transition-colors">
                  <X size={16} className="text-neutral-400" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                Bilan #{selectedBilan.bilan_simple_id}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Créé le {formatDate(selectedBilan.date_creation)}
              </p>
            </div>

            {/* Panel body */}
            <div className="px-5 py-4 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
              <DetailRow label="Âge">{selectedBilan.age} ans</DetailRow>
              <DetailRow label="Sexe">{selectedBilan.sexe}</DetailRow>
              <DetailRow label="Amétropie"><BadgeList text={selectedBilan.ametropie} color="blue" /></DetailRow>
              <DetailRow label="Anomalies"><BadgeList text={selectedBilan.anomalies} color="amber" /></DetailRow>
              <DetailRow label="Acuité Visuelle">
                <span className="font-medium">{selectedBilan.acuite_visuelle || '—'}</span>
              </DetailRow>
              <DetailRow label="Statut Réfractif">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  selectedBilan.statut_refractif === 'Emmetrope'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                }`}>
                  {selectedBilan.statut_refractif}
                </span>
              </DetailRow>
            </div>

            {/* Panel actions */}
            <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
              <button
                onClick={() => openEdit(selectedBilan)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors"
              >
                <Pencil size={13} /> Modifier
              </button>
              <button
                onClick={() => setDeleteConfirm(selectedBilan.bilan_simple_id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 size={13} /> Supprimer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Edit modal ─────────────────────────────────────── */}
      {editBilan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Modifier le bilan simplifié</h3>
                  <p className="text-xs text-neutral-400">Bilan #{editBilan.bilan_simple_id}</p>
                </div>
              </div>
              <button onClick={() => setEditBilan(null)} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                <X size={18} className="text-neutral-400" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} /> {editError}
              </div>
            )}

            <div className="space-y-4">
              {/* Âge + Sexe */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Âge <span className="text-red-400">*</span></label>
                  <input type="number" min={0} max={150} className={inputCls} value={editForm.age} onChange={(e) => handleEditChange('age', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sexe <span className="text-red-400">*</span></label>
                  <select className={inputCls} value={editForm.sexe} onChange={(e) => handleEditChange('sexe', e.target.value)}>
                    <option value="">—</option>
                    <option value="Homme">Homme</option>
                    <option value="Femme">Femme</option>
                  </select>
                </div>
              </div>

              {/* Amétropie */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Amétropie <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {AMETROPIE_OPTIONS.map((item) => {
                    const sel = editForm.ametropie?.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => toggleEditAmetropie(item)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          sel
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {sel ? '✓ ' : ''}{item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Anomalies */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Anomalies</label>
                <div className="flex flex-wrap gap-1.5">
                  {ANOMALIES_OPTIONS.map((item) => {
                    const sel = editForm.anomalies?.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => toggleEditAnomalie(item)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                          sel
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                            : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {sel ? '✓ ' : ''}{item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Acuité + Statut */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Acuité Visuelle</label>
                  <select className={inputCls} value={editForm.acuite_visuelle} onChange={(e) => handleEditChange('acuite_visuelle', e.target.value)}>
                    <option value="">—</option>
                    {ACUITE_VISUELLE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Statut Réfractif <span className="text-red-400">*</span></label>
                  <select className={inputCls} value={editForm.statut_refractif} onChange={(e) => handleEditChange('statut_refractif', e.target.value)}>
                    <option value="">—</option>
                    <option value="Emmetrope">Emmétrope</option>
                    <option value="Non emmetrope">Non emmétrope</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setEditBilan(null)} className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors">
                Annuler
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete confirmation modal ──────────────────────── */}
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
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
