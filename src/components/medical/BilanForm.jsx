// ─────────────────────────────────────────────────────────────────
// BBA-Data – Formulaire Bilan Optométrique (45 champs)
// Conforme ISO 13666 / ISO 8596 / RGPD
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  User, History, Eye, Glasses, Move, FileText,
  Save, AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Shield, Loader2,
} from 'lucide-react';

// ─── Constantes de validation ISO 13666 ──────────────────────
const V = {
  SPHERE: { min: -25, max: 25, step: 0.25 },
  CYLINDRE: { min: -10, max: 10, step: 0.25 },
  AXE: { min: 0, max: 180, step: 1 },
  ADDITION: { min: 0.5, max: 4.0, step: 0.25 },
  PIO: { min: 5, max: 60, step: 0.5 },
  AV: { min: 0, max: 2.0, step: 0.05 },
  DP: { min: 20, max: 45, step: 0.5 },
  PRISME: { min: 0, max: 20, step: 0.25 },
};

const BASE_PRISME_OPTIONS = [
  { value: '', label: '—' },
  { value: 'BH', label: 'BH (Base Haute)' },
  { value: 'BB', label: 'BB (Base Basse)' },
  { value: 'BN', label: 'BN (Base Nasale)' },
  { value: 'BT', label: 'BT (Base Temporale)' },
];

const METHODE_PIO_OPTIONS = [
  { value: 'tonometre_air', label: 'Tonomètre à air' },
  { value: 'applanation', label: 'Applanation (Goldmann)' },
  { value: 'icare', label: 'iCare (rebond)' },
];

const MOTILITE_OPTIONS = ['Normale', 'Anormale'];
const COULEURS_OPTIONS = ['Normal', 'Déficient'];
const CHAMP_VISUEL_OPTIONS = ['Normal', 'Réduit', 'Scotome'];

// ─── Sous-composants de champs ───────────────────────────────
function FieldGroup({ label, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({ register, name, rules, placeholder, step = 0.25, ...rest }) {
  return (
    <input
      type="number"
      step={step}
      placeholder={placeholder}
      {...register(name, rules)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-500"
      {...rest}
    />
  );
}

function SelectInput({ register, name, options, rules, placeholder }) {
  return (
    <select
      {...register(name, rules)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
    >
      <option value="">{placeholder || '— Sélectionner —'}</option>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.value} value={o.value}>{o.label}</option>
        )
      )}
    </select>
  );
}

function TextInput({ register, name, rules, placeholder, ...rest }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      {...register(name, rules)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-500"
      {...rest}
    />
  );
}

function TextArea({ register, name, rules, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      {...register(name, rules)}
      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none placeholder:text-neutral-300 dark:placeholder:text-neutral-500"
    />
  );
}

function SectionHeader({ icon: Icon, title, isOpen, onToggle, badge }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-t-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <Icon size={18} className="text-blue-500" />
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
            {badge}
          </span>
        )}
      </div>
      {isOpen ? <ChevronUp size={16} className="text-neutral-400" /> : <ChevronDown size={16} className="text-neutral-400" />}
    </button>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 flex items-center gap-1">
      <AlertTriangle size={11} /> {message}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function BilanForm({ patientId, onSaved, existingData }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: existingData || {},
  });

  const [openSections, setOpenSections] = useState({
    patient: true,
    antecedents: false,
    acuite: true,
    refraction: true,
    binoculaire: false,
    conclusion: false,
  });

  const [submitResult, setSubmitResult] = useState(null);
  const [patients, setPatients] = useState([]);

  // Charger la liste des patients
  useEffect(() => {
    fetch('http://localhost:8000/api/patients')
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {});
  }, []);

  const toggleSection = (key) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Soumission ────────────────────────────────────────────
  const onSubmit = async (data) => {
    setSubmitResult(null);
    try {
      // Nettoyer les champs vides → null
      const cleaned = {};
      for (const [k, v] of Object.entries(data)) {
        cleaned[k] = v === '' || v === undefined ? null : v;
      }
      // Convertir les nombres
      const numericFields = [
        'av_od_sc', 'av_og_sc', 'av_od_ac', 'av_og_ac', 'av_binoculaire',
        'auto_od_sphere', 'auto_od_cylindre', 'auto_od_axe',
        'auto_og_sphere', 'auto_og_cylindre', 'auto_og_axe',
        'rx_od_sphere', 'rx_od_cylindre', 'rx_od_axe', 'rx_od_addition', 'rx_od_prisme',
        'rx_og_sphere', 'rx_og_cylindre', 'rx_og_axe', 'rx_og_addition', 'rx_og_prisme',
        'dp_od', 'dp_og', 'dp_binoculaire',
        'pio_od', 'pio_og',
        'patient_id',
      ];
      for (const f of numericFields) {
        if (cleaned[f] !== null && cleaned[f] !== undefined) {
          cleaned[f] = Number(cleaned[f]);
        }
      }

      const pid = patientId || cleaned.patient_id;
      if (!pid) throw new Error('Veuillez sélectionner un patient.');

      cleaned.patient_id = Number(pid);
      if (!cleaned.praticien) cleaned.praticien = 'Dr. Praticien';

      const res = await fetch('http://localhost:8000/api/examens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleaned),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erreur lors de la sauvegarde');
      }

      const result = await res.json();
      setSubmitResult({ success: true, data: result });
      if (onSaved) onSaved(result);
    } catch (e) {
      setSubmitResult({ success: false, error: e.message });
    }
  };

  // ─── Règles de validation communes ─────────────────────────
  const sphereRules = {
    min: { value: V.SPHERE.min, message: `Min ${V.SPHERE.min} D` },
    max: { value: V.SPHERE.max, message: `Max ${V.SPHERE.max} D` },
  };
  const cylindreRules = {
    min: { value: V.CYLINDRE.min, message: `Min ${V.CYLINDRE.min} D` },
    max: { value: V.CYLINDRE.max, message: `Max ${V.CYLINDRE.max} D` },
  };
  const axeRules = {
    min: { value: V.AXE.min, message: 'Min 0°' },
    max: { value: V.AXE.max, message: 'Max 180°' },
  };
  const addRules = {
    min: { value: V.ADDITION.min, message: `Min ${V.ADDITION.min} D` },
    max: { value: V.ADDITION.max, message: `Max ${V.ADDITION.max} D` },
  };
  const avRules = {
    min: { value: V.AV.min, message: 'Min 0' },
    max: { value: V.AV.max, message: 'Max 2.0' },
  };
  const pioRules = {
    min: { value: V.PIO.min, message: `Min ${V.PIO.min} mmHg` },
    max: { value: V.PIO.max, message: `Max ${V.PIO.max} mmHg` },
  };
  const dpRules = {
    min: { value: V.DP.min, message: `Min ${V.DP.min} mm` },
    max: { value: V.DP.max, message: `Max ${V.DP.max} mm` },
  };
  const prismeRules = {
    min: { value: 0, message: 'Min 0 Δ' },
    max: { value: V.PRISME.max, message: `Max ${V.PRISME.max} Δ` },
  };

  // ─── Rendu ─────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ═══ Section 1: Informations Patient ═══════════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={User}
          title="1. Informations Patient"
          badge="ISO 13666"
          isOpen={openSections.patient}
          onToggle={() => toggleSection('patient')}
        />
        {openSections.patient && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            {!patientId && (
              <FieldGroup label="Patient *">
                <select
                  {...register('patient_id', { required: 'Patient requis' })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                  <option value="">— Sélectionner un patient —</option>
                  {patients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.nom} {p.prenom} — {p.date_naissance}
                    </option>
                  ))}
                </select>
                <FieldError message={errors.patient_id?.message} />
              </FieldGroup>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Praticien *">
                <TextInput
                  register={register}
                  name="praticien"
                  rules={{ required: 'Praticien requis' }}
                  placeholder="Dr. Nom"
                />
                <FieldError message={errors.praticien?.message} />
              </FieldGroup>
              <FieldGroup label="Date examen">
                <input
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  {...register('date_examen')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </FieldGroup>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              <Shield size={14} />
              Données protégées (RGPD – Consentement requis avant saisie)
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 2: Antécédents ═══════════════════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={History}
          title="2. Antécédents & Observations"
          isOpen={openSections.antecedents}
          onToggle={() => toggleSection('antecedents')}
        />
        {openSections.antecedents && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <FieldGroup label="Motif de consultation">
              <TextArea register={register} name="motif_consultation" placeholder="Raison de la visite..." />
            </FieldGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Antécédents oculaires">
                <TextArea register={register} name="antecedents_oculaires" placeholder="Chirurgies, pathologies, traitements..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Antécédents généraux">
                <TextArea register={register} name="antecedents_generaux" placeholder="Diabète, HTA, médicaments..." rows={2} />
              </FieldGroup>
            </div>
            <FieldGroup label="Port actuel (équipement)">
              <TextInput register={register} name="port_actuel" placeholder="Lunettes progressives, lentilles..." />
            </FieldGroup>
          </div>
        )}
      </div>

      {/* ═══ Section 3: Acuité Visuelle (ISO 8596) ════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Eye}
          title="3. Acuité Visuelle"
          badge="ISO 8596"
          isOpen={openSections.acuite}
          onToggle={() => toggleSection('acuite')}
        />
        {openSections.acuite && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              Échelle décimale (0.0 – 2.0) · 1.0 = 10/10 · Conformité ISO 8596
            </p>
            {/* Sans correction */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Sans Correction (SC)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup label="AV OD (SC)">
                  <NumberInput register={register} name="av_od_sc" rules={avRules} step={V.AV.step} placeholder="ex: 0.5" />
                  <FieldError message={errors.av_od_sc?.message} />
                </FieldGroup>
                <FieldGroup label="AV OG (SC)">
                  <NumberInput register={register} name="av_og_sc" rules={avRules} step={V.AV.step} placeholder="ex: 0.6" />
                  <FieldError message={errors.av_og_sc?.message} />
                </FieldGroup>
              </div>
            </div>
            {/* Avec correction */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Avec Correction (AC)
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FieldGroup label="AV OD (AC)">
                  <NumberInput register={register} name="av_od_ac" rules={avRules} step={V.AV.step} placeholder="ex: 1.0" />
                  <FieldError message={errors.av_od_ac?.message} />
                </FieldGroup>
                <FieldGroup label="AV OG (AC)">
                  <NumberInput register={register} name="av_og_ac" rules={avRules} step={V.AV.step} placeholder="ex: 1.0" />
                  <FieldError message={errors.av_og_ac?.message} />
                </FieldGroup>
                <FieldGroup label="AV Binoculaire">
                  <NumberInput register={register} name="av_binoculaire" rules={avRules} step={V.AV.step} placeholder="ex: 1.2" />
                  <FieldError message={errors.av_binoculaire?.message} />
                </FieldGroup>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 4: Réfraction (ISO 13666) ════════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Glasses}
          title="4. Réfraction"
          badge="ISO 13666"
          isOpen={openSections.refraction}
          onToggle={() => toggleSection('refraction')}
        />
        {openSections.refraction && (
          <div className="p-5 space-y-6 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            {/* ── Autoréfractomètre ── */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Réfraction Objective (Autoréfractomètre)
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OD */}
                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput register={register} name="auto_od_sphere" rules={sphereRules} step={V.SPHERE.step} placeholder="-2.50" />
                      <FieldError message={errors.auto_od_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput register={register} name="auto_od_cylindre" rules={cylindreRules} step={V.CYLINDRE.step} placeholder="-0.75" />
                      <FieldError message={errors.auto_od_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput register={register} name="auto_od_axe" rules={axeRules} step={1} placeholder="170" />
                      <FieldError message={errors.auto_od_axe?.message} />
                    </FieldGroup>
                  </div>
                </div>
                {/* OG */}
                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput register={register} name="auto_og_sphere" rules={sphereRules} step={V.SPHERE.step} placeholder="-2.00" />
                      <FieldError message={errors.auto_og_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput register={register} name="auto_og_cylindre" rules={cylindreRules} step={V.CYLINDRE.step} placeholder="-1.00" />
                      <FieldError message={errors.auto_og_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput register={register} name="auto_og_axe" rules={axeRules} step={1} placeholder="5" />
                      <FieldError message={errors.auto_og_axe?.message} />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Réfraction subjective ── */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Réfraction Subjective (Prescription finale)
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OD */}
                <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput register={register} name="rx_od_sphere" rules={sphereRules} step={V.SPHERE.step} placeholder="-2.50" />
                      <FieldError message={errors.rx_od_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput register={register} name="rx_od_cylindre" rules={cylindreRules} step={V.CYLINDRE.step} placeholder="-0.75" />
                      <FieldError message={errors.rx_od_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput register={register} name="rx_od_axe" rules={axeRules} step={1} placeholder="170" />
                      <FieldError message={errors.rx_od_axe?.message} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="ADD (D)">
                      <NumberInput register={register} name="rx_od_addition" rules={addRules} step={V.ADDITION.step} placeholder="2.00" />
                      <FieldError message={errors.rx_od_addition?.message} />
                    </FieldGroup>
                    <FieldGroup label="Prisme (Δ)">
                      <NumberInput register={register} name="rx_od_prisme" rules={prismeRules} step={V.PRISME.step} placeholder="0" />
                      <FieldError message={errors.rx_od_prisme?.message} />
                    </FieldGroup>
                    <FieldGroup label="Base">
                      <SelectInput register={register} name="rx_od_base_prisme" options={BASE_PRISME_OPTIONS} placeholder="—" />
                    </FieldGroup>
                  </div>
                </div>
                {/* OG */}
                <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput register={register} name="rx_og_sphere" rules={sphereRules} step={V.SPHERE.step} placeholder="-2.00" />
                      <FieldError message={errors.rx_og_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput register={register} name="rx_og_cylindre" rules={cylindreRules} step={V.CYLINDRE.step} placeholder="-1.00" />
                      <FieldError message={errors.rx_og_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput register={register} name="rx_og_axe" rules={axeRules} step={1} placeholder="5" />
                      <FieldError message={errors.rx_og_axe?.message} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="ADD (D)">
                      <NumberInput register={register} name="rx_og_addition" rules={addRules} step={V.ADDITION.step} placeholder="2.00" />
                      <FieldError message={errors.rx_og_addition?.message} />
                    </FieldGroup>
                    <FieldGroup label="Prisme (Δ)">
                      <NumberInput register={register} name="rx_og_prisme" rules={prismeRules} step={V.PRISME.step} placeholder="0" />
                      <FieldError message={errors.rx_og_prisme?.message} />
                    </FieldGroup>
                    <FieldGroup label="Base">
                      <SelectInput register={register} name="rx_og_base_prisme" options={BASE_PRISME_OPTIONS} placeholder="—" />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Distance pupillaire ── */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Distance Pupillaire (DP)
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FieldGroup label="DP OD (mm)">
                  <NumberInput register={register} name="dp_od" rules={dpRules} step={V.DP.step} placeholder="32.0" />
                  <FieldError message={errors.dp_od?.message} />
                </FieldGroup>
                <FieldGroup label="DP OG (mm)">
                  <NumberInput register={register} name="dp_og" rules={dpRules} step={V.DP.step} placeholder="31.5" />
                  <FieldError message={errors.dp_og?.message} />
                </FieldGroup>
                <FieldGroup label="DP Binoculaire (mm)">
                  <NumberInput register={register} name="dp_binoculaire" rules={{ min: { value: 50, message: 'Min 50 mm' }, max: { value: 80, message: 'Max 80 mm' } }} step={0.5} placeholder="63.5" />
                  <FieldError message={errors.dp_binoculaire?.message} />
                </FieldGroup>
              </div>
            </div>

            {/* ── PIO ── */}
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Pression Intraoculaire (PIO) – ISO 14971
              </p>
              <div className="grid grid-cols-3 gap-4">
                <FieldGroup label="PIO OD (mmHg)">
                  <NumberInput register={register} name="pio_od" rules={pioRules} step={V.PIO.step} placeholder="15.0" />
                  <FieldError message={errors.pio_od?.message} />
                </FieldGroup>
                <FieldGroup label="PIO OG (mmHg)">
                  <NumberInput register={register} name="pio_og" rules={pioRules} step={V.PIO.step} placeholder="16.0" />
                  <FieldError message={errors.pio_og?.message} />
                </FieldGroup>
                <FieldGroup label="Méthode">
                  <SelectInput register={register} name="methode_pio" options={METHODE_PIO_OPTIONS} placeholder="Méthode" />
                </FieldGroup>
              </div>
              {(watch('pio_od') > 21 || watch('pio_og') > 21) && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={14} />
                  PIO &gt; 21 mmHg – Risque de glaucome (ISO 14971)
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 5: Vision Binoculaire ═════════════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Move}
          title="5. Vision Binoculaire & Examens Complémentaires"
          isOpen={openSections.binoculaire}
          onToggle={() => toggleSection('binoculaire')}
        />
        {openSections.binoculaire && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FieldGroup label="Motilité oculaire">
                <SelectInput register={register} name="motilite_oculaire" options={MOTILITE_OPTIONS} />
              </FieldGroup>
              <FieldGroup label="Cover Test">
                <TextInput register={register} name="cover_test" placeholder="Ortho, Eso, Exo..." />
              </FieldGroup>
              <FieldGroup label="Test couleurs">
                <SelectInput register={register} name="test_couleurs" options={COULEURS_OPTIONS} />
              </FieldGroup>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Fond d'œil">
                <TextArea register={register} name="fond_oeil" placeholder="Normal, rétinopathie..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Biomicroscopie (LAF)">
                <TextArea register={register} name="biomicroscopie" placeholder="Cornée, cristallin..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Champ visuel">
                <SelectInput register={register} name="champ_visuel" options={CHAMP_VISUEL_OPTIONS} />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Section 6: Conclusion ═════════════════════════════ */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={FileText}
          title="6. Diagnostic & Conclusion"
          isOpen={openSections.conclusion}
          onToggle={() => toggleSection('conclusion')}
        />
        {openSections.conclusion && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <FieldGroup label="Diagnostic">
              <TextArea register={register} name="diagnostic" placeholder="Myopie bilatérale, presbytie..." rows={2} />
            </FieldGroup>
            <FieldGroup label="Observations / Recommandations">
              <TextArea register={register} name="observations" placeholder="Conseils, suivi, référé ophtalmologue..." rows={3} />
            </FieldGroup>
          </div>
        )}
      </div>

      {/* ═══ Résultat soumission ═══════════════════════════════ */}
      {submitResult && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${
            submitResult.success
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}
        >
          {submitResult.success ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <div>
            <p className="font-semibold">
              {submitResult.success ? 'Bilan enregistré avec succès' : 'Erreur'}
            </p>
            {submitResult.success && submitResult.data?.analyse && (
              <div className="mt-2 space-y-1 text-xs">
                <p>Sphère équivalente OD: {submitResult.data.analyse.sphere_equivalente_od?.toFixed(2) ?? '—'} D</p>
                <p>Sphère équivalente OG: {submitResult.data.analyse.sphere_equivalente_og?.toFixed(2) ?? '—'} D</p>
                <p>Classification OD: {submitResult.data.analyse.classification_od || '—'}</p>
                <p>Classification OG: {submitResult.data.analyse.classification_og || '—'}</p>
                {submitResult.data.analyse.alertes?.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-emerald-200 dark:border-emerald-700">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">Alertes cliniques :</p>
                    {submitResult.data.analyse.alertes.map((a, i) => (
                      <p key={i}>⚠ {a.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!submitResult.success && <p className="text-xs mt-1">{submitResult.error}</p>}
          </div>
        </div>
      )}

      {/* ═══ Boutons ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          Réinitialiser
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors shadow-sm"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer le bilan'}
        </button>
      </div>
    </form>
  );
}
