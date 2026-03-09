import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, Plus, DatabaseIcon, Trash2 } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';

const Database = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadPatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/patients');
      if (res.ok) {
        const patients = await res.json();
        setData(patients);
      }
    } catch {
      // backend offline
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const handleDeletePatient = async (patientId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/patients/${patientId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setData((prev) => prev.filter((p) => p.patient_id !== patientId));
        setDeleteConfirm(null);
      }
    } catch {
      // error
    }
  };

  const filteredData = data.filter((row) =>
    Object.values(row)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const columns = [
    { key: 'patient_id', label: 'ID' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'ville', label: 'Ville' },
    {
      key: 'consentement_rgpd',
      label: 'RGPD',
      render: (value) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
            value
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400'
          }`}
        >
          {value ? 'Oui' : 'Non'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex items-center justify-end">
          {deleteConfirm === row.patient_id ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePatient(row.patient_id); }}
                className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
              >
                Confirmer
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                className="px-2 py-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 rounded-md transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row.patient_id); }}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Supprimer le patient"
            >
              <Trash2 size={13} /> Supprimer
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">Base de données</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Explorez et gérez vos tables SQLite
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} size="sm">
            Exporter CSV
          </Button>
          <Button variant="primary" icon={Plus} size="sm">
            Nouveau
          </Button>
        </div>
      </div>

      {/* ─── Search & Filter Bar ───────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          />
          <input
            type="text"
            placeholder="Rechercher dans la table..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
          />
        </div>
        <Button
          variant="ghost"
          icon={RefreshCw}
          onClick={loadPatients}
          isLoading={isLoading}
          size="sm"
        >
          Rafraîchir
        </Button>
      </div>

      {/* ─── Data Table ────────────────────────────────────── */}
      <DataTable columns={columns} data={filteredData} isLoading={isLoading} />

      {/* ─── Modal de confirmation ────────────────────────── */}
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

export default Database;
