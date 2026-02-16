// ─────────────────────────────────────────────────────────────────
// BBA-Data – Page Patients (Liste + Formulaire)
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { UserPlus, List } from 'lucide-react';
import Button from '../components/ui/Button';
import PatientForm from '../components/medical/PatientForm';

export default function Patients() {
  const [view, setView] = useState('form'); // 'form' | 'list'

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            {view === 'form' ? 'Nouvel examen' : 'Dossiers patients'}
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            {view === 'form'
              ? 'Enregistrement patient et examen optométrique (ISO 13666)'
              : 'Liste des patients et historique des examens'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'list' ? 'primary' : 'secondary'}
            icon={List}
            size="sm"
            onClick={() => setView('list')}
          >
            Liste
          </Button>
          <Button
            variant={view === 'form' ? 'primary' : 'secondary'}
            icon={UserPlus}
            size="sm"
            onClick={() => setView('form')}
          >
            Nouveau
          </Button>
        </div>
      </div>

      {/* ─── Content ──────────────────────────────────────── */}
      {view === 'form' ? (
        <PatientForm onSaved={() => setView('list')} />
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-8 text-center">
          <p className="text-neutral-400 dark:text-neutral-500 text-sm">
            Connectez le backend Python pour charger la liste des patients.
          </p>
          <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-2">
            <code>cd backend && pip install -r requirements.txt && python server.py</code>
          </p>
        </div>
      )}
    </div>
  );
}
