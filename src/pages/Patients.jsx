// ─────────────────────────────────────────────────────────────────
// BBA-Data – Page Patients (Liste + Formulaire + Gestion)
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus, List, Search, RefreshCw, Trash2, Filter, X,
  Eye, Pencil, Save, User, Phone, Mail, MapPin, Calendar,
  Shield, ChevronLeft, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react';
import Button from '../components/ui/Button';
import PatientForm from '../components/medical/PatientForm';
import PasswordConfirmModal from '../components/ui/PasswordConfirmModal';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 15;

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function formatSexe(s) {
  if (s === 'M') return 'Masculin';
  if (s === 'F') return 'Féminin';
  return s || '—';
}

export default function Patients() {
  const { verifyPassword } = useAuth();
  const [view, setView] = useState('list');
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSexe, setFilterSexe] = useState('all');
  const [filterVille, setFilterVille] = useState('all');
  const [filterRgpd, setFilterRgpd] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editPatient, setEditPatient] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [page, setPage] = useState(0);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/patients');
      if (res.ok) setData(await res.json());
    } catch { /* backend offline */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const handleDeletePatient = async (patientId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/patients/${patientId}`, { method: 'DELETE' });
      if (res.ok) {
        setData((prev) => prev.filter((p) => p.patient_id !== patientId));
        setDeleteConfirm(null);
        if (selectedPatient?.patient_id === patientId) setSelectedPatient(null);
      }
    } catch { /* error */ }
  };

  const handleDeleteAllPatients = async (password) => {
    if (!password?.trim()) {
      return { success: false, error: 'Veuillez saisir votre mot de passe.' };
    }

    const isPasswordValid = await verifyPassword(password);
    if (!isPasswordValid) {
      return { success: false, error: 'Mot de passe incorrect.' };
    }

    setBulkDeleting(true);
    try {
      const res = await fetch('http://localhost:8000/api/patients', { method: 'DELETE' });
      if (!res.ok) {
        if (res.status === 404 || res.status === 405) {
          const ids = data
            .map((p) => p.patient_id)
            .filter((id) => id !== null && id !== undefined);

          let failed = 0;
          for (const patientId of ids) {
            try {
              const delRes = await fetch(`http://localhost:8000/api/patients/${patientId}`, {
                method: 'DELETE',
              });
              if (!delRes.ok) failed += 1;
            } catch {
              failed += 1;
            }
          }

          if (failed > 0) {
            return {
              success: false,
              error: `Suppression partielle: ${failed} patient(s) n'ont pas pu etre supprime(s).`,
            };
          }
        } else {
          const err = await res.json().catch(() => ({}));
          return { success: false, error: err.detail || 'Erreur lors de la suppression globale.' };
        }
      }

      setDeleteConfirm(null);
      setSelectedPatient(null);
      setPage(0);
      await loadPatients();
      setDeleteAllOpen(false);
      return { success: true };
    } catch {
      return { success: false, error: 'Impossible de contacter le serveur.' };
    } finally {
      setBulkDeleting(false);
    }
  };

  const openEdit = (patient) => {
    setEditForm({
      nom: patient.nom || '',
      prenom: patient.prenom || '',
      date_naissance: patient.date_naissance || '',
      sexe: patient.sexe || '',
      adresse: patient.adresse || '',
      code_postal: patient.code_postal || '',
      ville: patient.ville || '',
      telephone: patient.telephone || '',
      email: patient.email || '',
      numero_securite_sociale: patient.numero_securite_sociale || '',
      mutuelle: patient.mutuelle || '',
      numero_adherent: patient.numero_adherent || '',
      consentement_rgpd: patient.consentement_rgpd ? 1 : 0,
    });
    setEditError('');
    setEditPatient(patient);
  };

  const handleEditChange = (field, value) => {
    setEditForm((f) => ({ ...f, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!editForm.nom.trim() || !editForm.prenom.trim() || !editForm.date_naissance || !editForm.sexe) {
      setEditError('Nom, prénom, date de naissance et sexe sont requis.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`http://localhost:8000/api/patients/${editPatient.patient_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditPatient(null);
        loadPatients();
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
  const villes = useMemo(() => [...new Set(data.map((p) => p.ville).filter(Boolean))].sort(), [data]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (searchTerm && !Object.values(row).join(' ').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterSexe !== 'all' && row.sexe !== filterSexe) return false;
      if (filterVille !== 'all' && row.ville !== filterVille) return false;
      if (filterRgpd !== 'all') {
        if (filterRgpd === 'oui' && !row.consentement_rgpd) return false;
        if (filterRgpd === 'non' && row.consentement_rgpd) return false;
      }
      return true;
    });
  }, [data, searchTerm, filterSexe, filterVille, filterRgpd]);

  useEffect(() => { setPage(0); }, [searchTerm, filterSexe, filterVille, filterRgpd]);

  const activeFilterCount = [filterSexe !== 'all', filterVille !== 'all', filterRgpd !== 'all'].filter(Boolean).length;
  const resetFilters = () => { setFilterSexe('all'); setFilterVille('all'); setFilterRgpd('all'); setSearchTerm(''); };

  // ─── Pagination ──────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filteredData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const from = filteredData.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, filteredData.length);

  // ─── Detail field helper ─────────────────────────────────
  const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon size={14} className="text-neutral-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-neutral-800 dark:text-neutral-100 wrap-break-word">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            {view === 'form' ? 'Nouvel examen' : 'Patients'}
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            {view === 'form'
              ? 'Enregistrement patient et examen optométrique (ISO 13666)'
              : `${data.length} patient${data.length !== 1 ? 's' : ''} enregistré${data.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'primary' : 'secondary'} icon={List} size="sm" onClick={() => { setView('list'); setSelectedPatient(null); }}>
            Liste
          </Button>
          <Button variant={view === 'form' ? 'primary' : 'secondary'} icon={UserPlus} size="sm" onClick={() => setView('form')}>
            Nouveau
          </Button>
        </div>
      </div>

      <PasswordConfirmModal
        isOpen={deleteAllOpen}
        title="Supprimer tous les patients"
        description={`Cette action supprimera définitivement ${data.length} patient(s) et leurs bilans associés.`}
        confirmLabel="Supprimer tout"
        isLoading={bulkDeleting}
        onClose={() => setDeleteAllOpen(false)}
        onConfirm={handleDeleteAllPatients}
      />

      {/* ─── Content ──────────────────────────────────────── */}
      {view === 'form' ? (
        <PatientForm onSaved={() => { setView('list'); loadPatients(); }} />
      ) : (
        <div className="flex gap-6">
          {/* ─── Main table area ──────────────────────────── */}
          <div className={`space-y-4 transition-all ${selectedPatient ? 'flex-1 min-w-0' : 'w-full'}`}>
            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher un patient..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                    : 'bg-white border-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
              >
                <Filter size={13} /> Filtres{activeFilterCount > 0 && ` (${activeFilterCount})`}
              </button>
              <button
                onClick={() => setDeleteAllOpen(true)}
                disabled={data.length === 0 || bulkDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={13} /> Supprimer tout
              </button>
              <Button variant="ghost" icon={RefreshCw} onClick={loadPatients} isLoading={isLoading} size="sm">
                Rafraîchir
              </Button>
            </div>

            {/* Filter panel */}
            {showFilters && (
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sexe</label>
                    <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} className={inputCls}>
                      <option value="all">Tous</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Ville</label>
                    <select value={filterVille} onChange={(e) => setFilterVille(e.target.value)} className={inputCls}>
                      <option value="all">Toutes</option>
                      {villes.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Consentement RGPD</label>
                    <select value={filterRgpd} onChange={(e) => setFilterRgpd(e.target.value)} className={inputCls}>
                      <option value="all">Tous</option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                  </div>
                </div>
                <button onClick={resetFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* ─── Table ────────────────────────────────────── */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-neutral-400">
                  <Loader2 size={24} className="animate-spin mr-2" /> Chargement...
                </div>
              ) : filteredData.length === 0 ? (
                <div className="py-16 text-center">
                  <User size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-400">
                    {data.length === 0 ? 'Aucun patient enregistré' : 'Aucun résultat pour cette recherche'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Ville</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Examens</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">RGPD</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/50">
                      {paged.map((p) => (
                        <tr
                          key={p.patient_id}
                          onClick={() => setSelectedPatient(p)}
                          className={`cursor-pointer transition-colors ${
                            selectedPatient?.patient_id === p.patient_id
                              ? 'bg-blue-50/70 dark:bg-blue-900/20'
                              : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>
                              <p className="font-medium text-neutral-800 dark:text-neutral-100">{p.nom} {p.prenom}</p>
                              <p className="text-[11px] text-neutral-400">{formatSexe(p.sexe)} · Né{p.sexe === 'F' ? 'e' : ''} le {formatDate(p.date_naissance)}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                            {p.telephone && <span className="flex items-center gap-1"><Phone size={11} /> {p.telephone}</span>}
                            {p.email && <span className="flex items-center gap-1 mt-0.5"><Mail size={11} /> {p.email}</span>}
                            {!p.telephone && !p.email && '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                            {p.ville || '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {p.nb_examens ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              p.consentement_rgpd
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
                            }`}>
                              {p.consentement_rgpd ? 'Oui' : 'Non'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Voir le détail"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.patient_id); }}
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

            {/* ─── Pagination ─────────────────────────────── */}
            {filteredData.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <span className="text-xs text-neutral-400">{from} - {to} sur {filteredData.length}</span>
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

          {/* ─── Detail panel (right side) ────────────────── */}
          {selectedPatient && (
            <div className="w-80 shrink-0 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden self-start sticky top-4">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700 bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <User size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="p-1 rounded-md hover:bg-white/60 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <X size={16} className="text-neutral-400" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                  {selectedPatient.nom} {selectedPatient.prenom}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  ID #{selectedPatient.patient_id} · Créé le {formatDate(selectedPatient.date_creation)}
                </p>
              </div>

              {/* Panel body */}
              <div className="px-5 py-4 space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto">
                <DetailRow icon={User} label="Sexe" value={formatSexe(selectedPatient.sexe)} />
                <DetailRow icon={Calendar} label="Date de naissance" value={formatDate(selectedPatient.date_naissance)} />
                <DetailRow icon={Phone} label="Téléphone" value={selectedPatient.telephone} />
                <DetailRow icon={Mail} label="Email" value={selectedPatient.email} />
                <DetailRow icon={MapPin} label="Adresse" value={[selectedPatient.adresse, selectedPatient.code_postal, selectedPatient.ville].filter(Boolean).join(', ') || '—'} />
                <DetailRow icon={Shield} label="N° Sécu" value={selectedPatient.numero_securite_sociale} />
                <DetailRow label="Mutuelle" value={selectedPatient.mutuelle} />
                <DetailRow label="N° Adhérent" value={selectedPatient.numero_adherent} />

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700 mt-2">
                  <DetailRow icon={Eye} label="Nombre d'examens" value={selectedPatient.nb_examens ?? 0} />
                  <DetailRow icon={Calendar} label="Dernier examen" value={formatDate(selectedPatient.dernier_examen)} />
                </div>
                <DetailRow icon={Shield} label="Consentement RGPD" value={selectedPatient.consentement_rgpd ? 'Oui' : 'Non'} />
              </div>

              {/* Panel actions */}
              <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-700 flex gap-2">
                <button
                  onClick={() => openEdit(selectedPatient)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30 transition-colors"
                >
                  <Pencil size={13} /> Modifier
                </button>
                <button
                  onClick={() => setDeleteConfirm(selectedPatient.patient_id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal de modification ─────────────────────────── */}
      {editPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Pencil size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Modifier le patient</h3>
                  <p className="text-xs text-neutral-400">{editPatient.nom} {editPatient.prenom} · ID #{editPatient.patient_id}</p>
                </div>
              </div>
              <button onClick={() => setEditPatient(null)} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                <X size={18} className="text-neutral-400" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={14} /> {editError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Nom <span className="text-red-400">*</span></label>
                <input className={inputCls} value={editForm.nom} onChange={(e) => handleEditChange('nom', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Prénom <span className="text-red-400">*</span></label>
                <input className={inputCls} value={editForm.prenom} onChange={(e) => handleEditChange('prenom', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Date de naissance <span className="text-red-400">*</span></label>
                <input type="date" className={inputCls} value={editForm.date_naissance} onChange={(e) => handleEditChange('date_naissance', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Sexe <span className="text-red-400">*</span></label>
                <select className={inputCls} value={editForm.sexe} onChange={(e) => handleEditChange('sexe', e.target.value)}>
                  <option value="">—</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Adresse</label>
                <input className={inputCls} value={editForm.adresse} onChange={(e) => handleEditChange('adresse', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Code postal</label>
                <input className={inputCls} value={editForm.code_postal} onChange={(e) => handleEditChange('code_postal', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Ville</label>
                <input className={inputCls} value={editForm.ville} onChange={(e) => handleEditChange('ville', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Téléphone</label>
                <input className={inputCls} value={editForm.telephone} onChange={(e) => handleEditChange('telephone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Email</label>
                <input type="email" className={inputCls} value={editForm.email} onChange={(e) => handleEditChange('email', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">N° Sécurité sociale</label>
                <input className={inputCls} value={editForm.numero_securite_sociale} onChange={(e) => handleEditChange('numero_securite_sociale', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Mutuelle</label>
                <input className={inputCls} value={editForm.mutuelle} onChange={(e) => handleEditChange('mutuelle', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">N° Adhérent</label>
                <input className={inputCls} value={editForm.numero_adherent} onChange={(e) => handleEditChange('numero_adherent', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Consentement RGPD</label>
                <select className={inputCls} value={editForm.consentement_rgpd} onChange={(e) => handleEditChange('consentement_rgpd', Number(e.target.value))}>
                  <option value={0}>Non</option>
                  <option value={1}>Oui</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditPatient(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors"
              >
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

      {/* ─── Modal de confirmation de suppression ─────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Supprimer le patient</h3>
                <p className="text-xs text-neutral-400">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">
              Êtes-vous sûr de vouloir supprimer ce patient et tous ses bilans associés ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeletePatient(deleteConfirm)}
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
