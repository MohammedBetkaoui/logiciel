// ─────────────────────────────────────────────────────────────────
// BBA-Data – Page Bilans (Router interne: liste / formulaire / détails)
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { FilePlus, List, BarChart3, Pencil, Eye } from 'lucide-react';
import Button from '../components/ui/Button';
import BilanForm from '../components/medical/BilanForm';
import BilanSimpleForm from '../components/medical/BilanSimpleForm';
import BilanList from '../components/medical/BilanList';
import BilanSimpleList from '../components/medical/BilanSimpleList';
import BilanDetails from '../components/medical/BilanDetails';

export default function Bilans() {
  // view: 'list' | 'new' | 'new-simple' | 'details' | 'edit'
  const [view, setView] = useState('list');
  const [listTab, setListTab] = useState('complet'); // 'complet' | 'simple'
  const [selectedBilanId, setSelectedBilanId] = useState(null);
  const [editData, setEditData] = useState(null);

  const handleSelectBilan = (examenId) => {
    setSelectedBilanId(examenId);
    setView('details');
  };

  const handleEditBilan = async (examenId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/bilans/${examenId}`);
      if (res.ok) {
        const data = await res.json();
        setEditData({ ...data.bilan, _examen_id: examenId });
        setSelectedBilanId(examenId);
        setView('edit');
      }
    } catch {
      // error
    }
  };

  const handleSaved = () => {
    setEditData(null);
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
              : view === 'new-simple'
              ? 'Nouveau Bilan Simplifié'
              : view === 'edit'
              ? 'Modifier le Bilan'
              : view === 'details'
              ? 'Détails du Bilan'
              : 'Bilans Optométriques'}
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            {view === 'new'
              ? 'Formulaire conforme ISO 13666 / ISO 8596 – 45 champs cliniques'
              : view === 'new-simple'
              ? 'Formulaire de dépistage rapide – Âge, amétropie, anomalies, acuité visuelle'
              : view === 'edit'
              ? 'Modifier les données du bilan existant'
              : view === 'details'
              ? 'Vue détaillée en lecture seule – Export PDF disponible'
              : 'Liste des bilans avec recherche et filtres avancés'}
          </p>
        </div>
        {view !== 'details' && view !== 'edit' && (
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
            <Button
              variant={view === 'new-simple' ? 'primary' : 'secondary'}
              icon={Eye}
              size="sm"
              onClick={() => setView('new-simple')}
            >
              Bilan Simplifié
            </Button>
          </div>
        )}
      </div>

      {/* ─── Contenu ──────────────────────────────────────── */}
      {view === 'new' && (
        <BilanForm onSaved={handleSaved} />
      )}

      {view === 'new-simple' && (
        <BilanSimpleForm onSaved={handleSaved} />
      )}

      {view === 'edit' && editData && (
        <BilanForm
          key={selectedBilanId}
          existingData={editData}
          patientId={editData.patient_id}
          examenId={selectedBilanId}
          onSaved={handleSaved}
        />
      )}

      {view === 'list' && (
        <>
          {/* Tabs for list view */}
          <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setListTab('complet')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                listTab === 'complet'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Bilans Optométriques
            </button>
            <button
              type="button"
              onClick={() => setListTab('simple')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                listTab === 'simple'
                  ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              Bilans Simplifiés
            </button>
          </div>

          {listTab === 'complet' ? (
            <BilanList onSelectBilan={handleSelectBilan} onEditBilan={handleEditBilan} />
          ) : (
            <BilanSimpleList />
          )}
        </>
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
