// ─────────────────────────────────────────────────────────────────
// BBA-Data – Formulaire Bilan Simple (dépistage rapide)
// Champs: âge, sexe, amétropie, anomalies, acuité visuelle
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { Save, CheckCircle, AlertTriangle, Loader2, Eye } from 'lucide-react';

const AMETROPIE_OPTIONS = [
  'Myopie',
  'Hypermétropie',
  'Astigmatisme',
];

const ANOMALIES_GROUPS = [
  {
    title: "Problèmes d'accommodation",
    options: [
      "Insuffisance d'accommodation",
      "Excès d'accommodation",
      'Fatigue accommodative',
      'Spasme accommodatif',
      'Inertie accommodative',
      'Paralysie accommodative',
    ],
  },
  {
    title: 'Problèmes de convergence',
    options: [
      'Insuffisance de convergence',
      'Pseudo-insuffisance de convergence',
      'Excès de convergence',
      'Insuffisance de convergence pure',
    ],
  },
  {
    title: 'Ésophorie',
    options: [
      'Ésophorie basique',
      'Insuffisance de divergence',
      'Excès de convergence',
    ],
  },
  {
    title: 'Exophorie',
    options: [
      'Exophorie basique',
      'Excès de divergence',
      'Insuffisance de convergence',
    ],
  },
  {
    title: 'Autres',
    options: [
      'Phorie verticale hyper D/G',
      'Phorie verticale hyper G/D',
      'Paralysie oculomotrice',
      'Dysfonctionnement vergentiel',
      'Réserves fusionnelles réduites',
      "Pas d'anomalie",
    ],
  },
];

const ANOMALIES_OPTIONS = [...new Set(ANOMALIES_GROUPS.flatMap((group) => group.options))];

const normalizeLabel = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const AMETROPIE_ALIASES = {
  myopie: 'Myopie',
  hypermetropie: 'Hypermétropie',
  astigmatisme: 'Astigmatisme',
};

const ANOMALIE_ALIASES = {
  "insuffisance d'accommodation": "Insuffisance d'accommodation",
  "exces d'accommodation": "Excès d'accommodation",
  'fatigue accommodative': 'Fatigue accommodative',
  'spasme accommodatif': 'Spasme accommodatif',
  'inertie accommodative': 'Inertie accommodative',
  'paralysie accommodative': 'Paralysie accommodative',
  'insuffisance de convergence': 'Insuffisance de convergence',
  'pseudo-insuffisance de convergence': 'Pseudo-insuffisance de convergence',
  'exces de convergence': 'Excès de convergence',
  'insuffisance de convergence pure': 'Insuffisance de convergence pure',
  'esophorie basique': 'Ésophorie basique',
  'insuffisance de divergence': 'Insuffisance de divergence',
  'exophorie basique': 'Exophorie basique',
  'exces de divergence': 'Excès de divergence',
  'phorie verticale': 'Phorie verticale hyper D/G',
  'phorie verticale hyper d/g': 'Phorie verticale hyper D/G',
  'phorie verticale hyper g/d': 'Phorie verticale hyper G/D',
  'paralysie oculomotrice': 'Paralysie oculomotrice',
  'dysfonctionnement vergentiel': 'Dysfonctionnement vergentiel',
  'reserves fusionnelles reduites': 'Réserves fusionnelles réduites',
  "pas d'anomalie": "Pas d'anomalie",
  aucune: "Pas d'anomalie",
};

function parseCanonicalList(rawValue, aliases, allowed) {
  if (!rawValue) return [];
  const list = rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => aliases[normalizeLabel(item)] || item)
    .filter((item) => allowed.includes(item));
  return [...new Set(list)];
}

const ACUITE_VISUELLE_OPTIONS = [
  '<1/10',
  '1/10', '2/10', '3/10', '4/10', '5/10',
  '6/10', '7/10', '8/10', '9/10', '10/10',
];

export default function BilanSimpleForm({ onSaved, existingData = null }) {
  const isEditMode = !!existingData;

  const [formData, setFormData] = useState(() => {
    if (existingData) {
      return {
        age: existingData.age ?? '',
        sexe: existingData.sexe ?? '',
        ametropie: parseCanonicalList(existingData.ametropie, AMETROPIE_ALIASES, AMETROPIE_OPTIONS),
        anomalies: parseCanonicalList(existingData.anomalies, ANOMALIE_ALIASES, ANOMALIES_OPTIONS),
        acuite_visuelle: existingData.acuite_visuelle ?? '',
      };
    }
    return {
      age: '',
      sexe: '',
      ametropie: [],
      anomalies: [],
      acuite_visuelle: '',
    };
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleAmetropieToggle = (item) => {
    setFormData((prev) => {
      const updated = prev.ametropie.includes(item)
        ? prev.ametropie.filter((a) => a !== item)
        : [...prev.ametropie, item];
      return { ...prev, ametropie: updated };
    });
    if (errors.ametropie) setErrors((prev) => ({ ...prev, ametropie: null }));
  };

  const handleAnomalieToggle = (anomalie) => {
    setFormData((prev) => {
      let updated;
      if (anomalie === "Pas d'anomalie") {
        updated = prev.anomalies.includes("Pas d'anomalie") ? [] : ["Pas d'anomalie"];
      } else {
        const without = prev.anomalies.filter((a) => a !== "Pas d'anomalie");
        updated = without.includes(anomalie)
          ? without.filter((a) => a !== anomalie)
          : [...without, anomalie];
      }
      return { ...prev, anomalies: updated };
    });
    if (errors.anomalies) setErrors((prev) => ({ ...prev, anomalies: null }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.age || isNaN(formData.age) || Number(formData.age) < 0 || Number(formData.age) > 150)
      errs.age = 'Âge requis (0-150)';
    if (!formData.sexe) errs.sexe = 'Sexe requis';
    if (formData.ametropie.length === 0) errs.ametropie = 'Sélectionnez au moins une amétropie';
    if (formData.anomalies.length === 0) errs.anomalies = 'Sélectionnez au moins une option';
    if (!formData.acuite_visuelle) errs.acuite_visuelle = 'Acuité visuelle requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitResult(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        age: Number(formData.age),
        sexe: formData.sexe,
        ametropie: formData.ametropie.join(', '),
        anomalies: formData.anomalies.join(', '),
        acuite_visuelle: formData.acuite_visuelle,
        statut_refractif: existingData?.statut_refractif || (formData.ametropie.length > 0 ? 'Non emmetrope' : 'Emmetrope'),
      };

      const url = isEditMode
        ? `http://localhost:8000/api/bilans-simples/${existingData.bilan_simple_id}`
        : 'http://localhost:8000/api/bilans-simples';
      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erreur lors de la sauvegarde');
      }

      const result = await res.json();
      setSubmitResult({ success: true, data: result });
      if (!isEditMode) {
        setFormData({
          age: '',
          sexe: '',
          ametropie: [],
          anomalies: [],
          acuite_visuelle: '',
        });
      }
      if (onSaved) onSaved(result);
    } catch (err) {
      setSubmitResult({ success: false, error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700">
          <Eye size={18} className="text-blue-500" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {isEditMode ? 'Modifier le Bilan Simplifié' : 'Bilan Simplifié – Dépistage Rapide'}
          </span>
        </div>

        <div className="p-5 space-y-5">
          {/* Âge + Sexe */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Âge *
              </label>
              <input
                type="number"
                name="age"
                min={0}
                max={150}
                value={formData.age}
                onChange={handleChange}
                placeholder="ex: 25"
                className={fieldClass}
              />
              {errors.age && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={11} /> {errors.age}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Sexe *
              </label>
              <select name="sexe" value={formData.sexe} onChange={handleChange} className={fieldClass}>
                <option value="">— Sélectionner —</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
              {errors.sexe && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={11} /> {errors.sexe}
                </p>
              )}
            </div>
          </div>

          {/* Amétropie (multi-select) */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Amétropie *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AMETROPIE_OPTIONS.map((item) => {
                const isSelected = formData.ametropie.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleAmetropieToggle(item)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                        : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-500'
                    }`}
                  >
                    <span className="mr-1.5">{isSelected ? '✓' : '○'}</span>
                    {item}
                  </button>
                );
              })}
            </div>
            {errors.ametropie && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} /> {errors.ametropie}
              </p>
            )}
          </div>

          {/* Anomalies (multi-select groupées par sous-catégories) */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Anomalies *
            </label>
            <div className="space-y-3">
              {ANOMALIES_GROUPS.map((group) => (
                <div
                  key={group.title}
                  className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/30 p-3"
                >
                  <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {group.options.map((anomalie) => {
                      const isSelected = formData.anomalies.includes(anomalie);
                      return (
                        <button
                          key={`${group.title}-${anomalie}`}
                          type="button"
                          onClick={() => handleAnomalieToggle(anomalie)}
                          className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300 font-medium'
                              : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-500'
                          }`}
                        >
                          <span className="mr-1.5">{isSelected ? '✓' : '○'}</span>
                          {anomalie}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {errors.anomalies && (
              <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                <AlertTriangle size={11} /> {errors.anomalies}
              </p>
            )}
          </div>

          {/* Acuité Visuelle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Acuité Visuelle *
              </label>
              <select
                name="acuite_visuelle"
                value={formData.acuite_visuelle}
                onChange={handleChange}
                className={fieldClass}
              >
                <option value="">— Sélectionner —</option>
                {ACUITE_VISUELLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {errors.acuite_visuelle && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                  <AlertTriangle size={11} /> {errors.acuite_visuelle}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSubmitting ? 'Enregistrement...' : isEditMode ? 'Mettre à jour' : 'Enregistrer le Bilan'}
        </button>

        {submitResult && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
              submitResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}
          >
            {submitResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {submitResult.success ? (isEditMode ? 'Bilan mis à jour avec succès' : 'Bilan enregistré avec succès') : submitResult.error}
          </div>
        )}
      </div>
    </form>
  );
}
