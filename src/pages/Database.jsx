import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, Plus, DatabaseIcon } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';

const columns = [
  { key: 'id', label: 'ID' },
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
];

export default function Database() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredData = data.filter((row) =>
    Object.values(row)
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

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
    </div>
  );
}
