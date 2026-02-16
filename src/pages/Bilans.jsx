// ─────────────────────────────────────────────────────────────────
// BBA-Data – Page Bilans (Router interne: liste / formulaire / détails)
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { FilePlus, List, BarChart3 } from 'lucide-react';
import Button from '../components/ui/Button';
import BilanForm from '../components/medical/BilanForm';
import BilanList from '../components/medical/BilanList';
import BilanDetails from '../components/medical/BilanDetails';

export default function Bilans() {
  // view: 'list' | 'new' | 'details'
  const [view, setView] = useState('list');
  const [selectedBilanId, setSelectedBilanId] = useState(null);

  const handleSelectBilan = (examenId) => {
    setSelectedBilanId(examenId);
    setView('details');
  };

  const handleSaved = () => {
    setView('list');
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            {view === 'new'
              ? 'Nouveau Bilan Optométrique'
              : view === 'details'
              ? 'Détails du Bilan'
              : 'Bilans Optométriques'}
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            {view === 'new'
              ? 'Formulaire conforme ISO 13666 / ISO 8596 – 45 champs cliniques'
              : view === 'details'
              ? 'Vue détaillée en lecture seule – Export PDF disponible'
              : 'Liste des bilans avec recherche et filtres avancés'}
          </p>
        </div>
        {view !== 'details' && (
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
              variant={view === 'new' ? 'primary' : 'secondary'}
              icon={FilePlus}
              size="sm"
              onClick={() => setView('new')}
            >
              Nouveau
            </Button>
          </div>
        )}
      </div>

      {/* ─── Contenu ──────────────────────────────────────── */}
      {view === 'new' && (
        <BilanForm onSaved={handleSaved} />
      )}

      {view === 'list' && (
        <BilanList onSelectBilan={handleSelectBilan} />
      )}

      {view === 'details' && (
        <BilanDetails
          examenId={selectedBilanId}
          onBack={() => setView('list')}
        />
      )}
    </div>
  );
}
