// ─────────────────────────────────────────────────────────────────
// BBA-Data – PatientForm (Formulaire patient + examen)
// Validation clinique ISO 13666 / ISO 14971
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  User,
  Eye,
  Gauge,
  Save,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import Button from '../ui/Button';
import { createPatient, createExamen } from '../../services/api';

// ─── Validation helpers ──────────────────────────────────────
function validateSphere(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n) || n < -30 || n > 30) return 'Sphère: [-30, +30] D';
  return null;
}
function validateCylindre(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n) || n < -10 || n > 10) return 'Cylindre: [-10, +10] D';
  return null;
}
function validateAxe(val) {
  if (val === '' || val == null) return null;
  const n = parseInt(val);
  if (isNaN(n) || n < 0 || n > 180) return 'Axe: [0, 180]°';
  return null;
}
function validatePIO(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n) || n < 5 || n > 60) return 'PIO: [5, 60] mmHg';
  return null;
}
function validateAddition(val) {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n) || n < 0.5 || n > 4.0) return 'Addition: [0.50, 4.00] D';
  return null;
}

// ─── Field input component ──────────────────────────────────
function FormField({ label, unit, error, children, required }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label} {unit && <span className="text-neutral-400">({unit})</span>}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[10px] text-red-500 flex items-center gap-1" role="alert">
          <AlertTriangle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

const selectCls = inputCls;

const INITIAL_FORM = {
  // Patient
  nom: '',
  prenom: '',
  date_naissance: '',
  sexe: '',
  telephone: '',
  email: '',
  // Examen – Réfraction OD
  rx_od_sphere: '',
  rx_od_cylindre: '',
  rx_od_axe: '',
  rx_od_addition: '',
  // Réfraction OG
  rx_og_sphere: '',
  rx_og_cylindre: '',
  rx_og_axe: '',
  rx_og_addition: '',
  // PIO
  pio_od: '',
  pio_og: '',
  methode_pio: 'tonometre_air',
  // AV
  av_od_sc: '',
  av_og_sc: '',
  av_od_ac: '',
  av_og_ac: '',
  // Autres
  motilite_oculaire: '',
  champ_visuel: '',
  test_couleurs: '',
  diagnostic: '',
  observations: '',
  praticien: '',
  consentement_rgpd: false,
};


export default function PatientForm({ onSaved }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors((e) => ({ ...e, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};

    // Required fields
    if (!form.nom.trim()) errs.nom = 'Requis';
    if (!form.prenom.trim()) errs.prenom = 'Requis';
    if (!form.date_naissance) errs.date_naissance = 'Requis';
    if (!form.sexe) errs.sexe = 'Requis';
    if (!form.praticien.trim()) errs.praticien = 'Requis';
    if (!form.consentement_rgpd) errs.consentement_rgpd = 'Consentement RGPD obligatoire';

    // Clinical validation (ISO 14971)
    const sphOD = validateSphere(form.rx_od_sphere);
    if (sphOD) errs.rx_od_sphere = sphOD;
    const sphOG = validateSphere(form.rx_og_sphere);
    if (sphOG) errs.rx_og_sphere = sphOG;
    const cylOD = validateCylindre(form.rx_od_cylindre);
    if (cylOD) errs.rx_od_cylindre = cylOD;
    const cylOG = validateCylindre(form.rx_og_cylindre);
    if (cylOG) errs.rx_og_cylindre = cylOG;
    const axeOD = validateAxe(form.rx_od_axe);
    if (axeOD) errs.rx_od_axe = axeOD;
    const axeOG = validateAxe(form.rx_og_axe);
    if (axeOG) errs.rx_og_axe = axeOG;
    const addOD = validateAddition(form.rx_od_addition);
    if (addOD) errs.rx_od_addition = addOD;
    const addOG = validateAddition(form.rx_og_addition);
    if (addOG) errs.rx_og_addition = addOG;
    const pioOD = validatePIO(form.pio_od);
    if (pioOD) errs.pio_od = pioOD;
    const pioOG = validatePIO(form.pio_og);
    if (pioOG) errs.pio_og = pioOG;

    // Incohérence Cylindre/Axe
    if (form.rx_od_cylindre && !form.rx_od_axe) errs.rx_od_axe = 'Axe requis si cylindre présent';
    if (form.rx_og_cylindre && !form.rx_og_axe) errs.rx_og_axe = 'Axe requis si cylindre présent';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setResult(null);

    try {
      // 1. Créer le patient
      const patientRes = await createPatient({
        nom: form.nom,
        prenom: form.prenom,
        date_naissance: form.date_naissance,
        sexe: form.sexe,
        telephone: form.telephone || null,
        email: form.email || null,
        consentement_rgpd: form.consentement_rgpd ? 1 : 0,
      });

      // 2. Créer l'examen avec analyse clinique automatique
      const parseNum = (v) => (v === '' ? null : parseFloat(v));
      const parseInt2 = (v) => (v === '' ? null : parseInt(v));

      const examenRes = await createExamen({
        patient_id: patientRes.patient_id,
        praticien: form.praticien,
        av_od_sc: parseNum(form.av_od_sc),
        av_og_sc: parseNum(form.av_og_sc),
        av_od_ac: parseNum(form.av_od_ac),
        av_og_ac: parseNum(form.av_og_ac),
        rx_od_sphere: parseNum(form.rx_od_sphere),
        rx_od_cylindre: parseNum(form.rx_od_cylindre),
        rx_od_axe: parseInt2(form.rx_od_axe),
        rx_od_addition: parseNum(form.rx_od_addition),
        rx_og_sphere: parseNum(form.rx_og_sphere),
        rx_og_cylindre: parseNum(form.rx_og_cylindre),
        rx_og_axe: parseInt2(form.rx_og_axe),
        rx_og_addition: parseNum(form.rx_og_addition),
        pio_od: parseNum(form.pio_od),
        pio_og: parseNum(form.pio_og),
        methode_pio: form.methode_pio,
        motilite_oculaire: form.motilite_oculaire || null,
        champ_visuel: form.champ_visuel || null,
        test_couleurs: form.test_couleurs || null,
        diagnostic: form.diagnostic || null,
        observations: form.observations || null,
      });

      setResult(examenRes);
      onSaved?.();
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setResult(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {errors._global && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400" role="alert">
          {errors._global}
        </div>
      )}

      {/* ─── Résultat analyse clinique ────────────────────── */}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" role="status">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Patient et examen enregistrés avec succès
            </span>
          </div>
          <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
            <p>SE OD: {result.analyse?.sphere_equivalente_od ?? '—'} D · {result.analyse?.classification_od}</p>
            <p>SE OG: {result.analyse?.sphere_equivalente_og ?? '—'} D · {result.analyse?.classification_og}</p>
            {result.analyse?.alertes?.length > 0 && (
              <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} /> Alertes cliniques:
                </p>
                {result.analyse.alertes.map((a, i) => (
                  <p key={i} className="mt-1 text-amber-600 dark:text-amber-300">
                    [{a.code}] {a.message} – <em>{a.recommandation}</em>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Section Identité Patient ─────────────────────── */}
      <fieldset className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <legend className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 px-2">
          <User size={16} className="text-blue-500" /> Identité du patient
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          <FormField label="Nom" required error={errors.nom}>
            <input className={inputCls} value={form.nom} onChange={(e) => handleChange('nom', e.target.value)} aria-required="true" />
          </FormField>
          <FormField label="Prénom" required error={errors.prenom}>
            <input className={inputCls} value={form.prenom} onChange={(e) => handleChange('prenom', e.target.value)} aria-required="true" />
          </FormField>
          <FormField label="Date de naissance" required error={errors.date_naissance}>
            <input type="date" className={inputCls} value={form.date_naissance} onChange={(e) => handleChange('date_naissance', e.target.value)} aria-required="true" />
          </FormField>
          <FormField label="Sexe" required error={errors.sexe}>
            <select className={selectCls} value={form.sexe} onChange={(e) => handleChange('sexe', e.target.value)} aria-required="true">
              <option value="">—</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
              <option value="Autre">Autre</option>
            </select>
          </FormField>
          <FormField label="Téléphone">
            <input className={inputCls} value={form.telephone} onChange={(e) => handleChange('telephone', e.target.value)} />
          </FormField>
          <FormField label="Praticien" required error={errors.praticien}>
            <input className={inputCls} value={form.praticien} onChange={(e) => handleChange('praticien', e.target.value)} aria-required="true" />
          </FormField>
        </div>
      </fieldset>

      {/* ─── Section Réfraction (ISO 13666) ───────────────── */}
      <fieldset className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <legend className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 px-2">
          <Eye size={16} className="text-violet-500" /> Réfraction subjective (ISO 13666)
        </legend>

        {/* OD */}
        <p className="text-xs text-blue-500 font-semibold mt-3 mb-2 uppercase tracking-wide">Œil Droit (OD)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Sphère" unit="D" error={errors.rx_od_sphere}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_od_sphere} onChange={(e) => handleChange('rx_od_sphere', e.target.value)} />
          </FormField>
          <FormField label="Cylindre" unit="D" error={errors.rx_od_cylindre}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_od_cylindre} onChange={(e) => handleChange('rx_od_cylindre', e.target.value)} />
          </FormField>
          <FormField label="Axe" unit="°" error={errors.rx_od_axe}>
            <input type="number" min="0" max="180" className={inputCls} value={form.rx_od_axe} onChange={(e) => handleChange('rx_od_axe', e.target.value)} />
          </FormField>
          <FormField label="Addition" unit="D" error={errors.rx_od_addition}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_od_addition} onChange={(e) => handleChange('rx_od_addition', e.target.value)} />
          </FormField>
        </div>

        {/* OG */}
        <p className="text-xs text-emerald-500 font-semibold mt-4 mb-2 uppercase tracking-wide">Œil Gauche (OG)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FormField label="Sphère" unit="D" error={errors.rx_og_sphere}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_og_sphere} onChange={(e) => handleChange('rx_og_sphere', e.target.value)} />
          </FormField>
          <FormField label="Cylindre" unit="D" error={errors.rx_og_cylindre}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_og_cylindre} onChange={(e) => handleChange('rx_og_cylindre', e.target.value)} />
          </FormField>
          <FormField label="Axe" unit="°" error={errors.rx_og_axe}>
            <input type="number" min="0" max="180" className={inputCls} value={form.rx_og_axe} onChange={(e) => handleChange('rx_og_axe', e.target.value)} />
          </FormField>
          <FormField label="Addition" unit="D" error={errors.rx_og_addition}>
            <input type="number" step="0.25" className={inputCls} value={form.rx_og_addition} onChange={(e) => handleChange('rx_og_addition', e.target.value)} />
          </FormField>
        </div>
      </fieldset>

      {/* ─── Section PIO & Acuité ─────────────────────────── */}
      <fieldset className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <legend className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 px-2">
          <Gauge size={16} className="text-amber-500" /> PIO & Acuité visuelle
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <FormField label="PIO OD" unit="mmHg" error={errors.pio_od}>
            <input type="number" step="0.5" className={inputCls} value={form.pio_od} onChange={(e) => handleChange('pio_od', e.target.value)} />
          </FormField>
          <FormField label="PIO OG" unit="mmHg" error={errors.pio_og}>
            <input type="number" step="0.5" className={inputCls} value={form.pio_og} onChange={(e) => handleChange('pio_og', e.target.value)} />
          </FormField>
          <FormField label="AV OD SC" unit="décimal">
            <input type="number" step="0.1" min="0" max="2" className={inputCls} value={form.av_od_sc} onChange={(e) => handleChange('av_od_sc', e.target.value)} />
          </FormField>
          <FormField label="AV OG SC" unit="décimal">
            <input type="number" step="0.1" min="0" max="2" className={inputCls} value={form.av_og_sc} onChange={(e) => handleChange('av_og_sc', e.target.value)} />
          </FormField>
          <FormField label="AV OD AC" unit="décimal">
            <input type="number" step="0.1" min="0" max="2" className={inputCls} value={form.av_od_ac} onChange={(e) => handleChange('av_od_ac', e.target.value)} />
          </FormField>
          <FormField label="AV OG AC" unit="décimal">
            <input type="number" step="0.1" min="0" max="2" className={inputCls} value={form.av_og_ac} onChange={(e) => handleChange('av_og_ac', e.target.value)} />
          </FormField>
          <FormField label="Méthode PIO">
            <select className={selectCls} value={form.methode_pio} onChange={(e) => handleChange('methode_pio', e.target.value)}>
              <option value="tonometre_air">Tonomètre à air</option>
              <option value="applanation">Applanation</option>
              <option value="icare">iCare</option>
            </select>
          </FormField>
          <FormField label="Motilité oculaire">
            <select className={selectCls} value={form.motilite_oculaire} onChange={(e) => handleChange('motilite_oculaire', e.target.value)}>
              <option value="">—</option>
              <option value="Normale">Normale</option>
              <option value="Anormale">Anormale</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <FormField label="Champ visuel">
            <select className={selectCls} value={form.champ_visuel} onChange={(e) => handleChange('champ_visuel', e.target.value)}>
              <option value="">—</option>
              <option value="Normal">Normal</option>
              <option value="Réduit">Réduit</option>
              <option value="Scotome">Scotome</option>
            </select>
          </FormField>
          <FormField label="Vision des couleurs">
            <select className={selectCls} value={form.test_couleurs} onChange={(e) => handleChange('test_couleurs', e.target.value)}>
              <option value="">—</option>
              <option value="Normal">Normal</option>
              <option value="Déficient">Déficient</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <FormField label="Diagnostic">
            <textarea className={inputCls + ' min-h-[60px]'} value={form.diagnostic} onChange={(e) => handleChange('diagnostic', e.target.value)} />
          </FormField>
          <FormField label="Observations">
            <textarea className={inputCls + ' min-h-[60px]'} value={form.observations} onChange={(e) => handleChange('observations', e.target.value)} />
          </FormField>
        </div>
      </fieldset>

      {/* ─── RGPD Consent + Actions ───────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            checked={form.consentement_rgpd}
            onChange={(e) => handleChange('consentement_rgpd', e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
            aria-required="true"
          />
          <span>
            Consentement RGPD recueilli
            {errors.consentement_rgpd && (
              <span className="text-red-500 text-xs ml-2">{errors.consentement_rgpd}</span>
            )}
          </span>
        </label>

        <div className="flex gap-2">
          <Button type="button" variant="ghost" icon={RotateCcw} size="sm" onClick={handleReset}>
            Réinitialiser
          </Button>
          <Button type="submit" variant="primary" icon={Save} size="md" isLoading={saving}>
            Enregistrer l'examen
          </Button>
        </div>
      </div>
    </form>
  );
}
