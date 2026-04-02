// ─────────────────────────────────────────────────────────────────
// BBA-Data – Formulaire Bilan Optométrique (version étendue)
// ─────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  User,
  History,
  Eye,
  Glasses,
  Move,
  FileText,
  Save,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Loader2,
  Activity,
} from 'lucide-react';

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
  { value: 'BH', label: 'BH' },
  { value: 'BB', label: 'BB' },
  { value: 'BN', label: 'BN' },
  { value: 'BT', label: 'BT' },
];

const METHODE_PIO_OPTIONS = [
  { value: 'tonometre_air', label: 'Tonomètre à air' },
  { value: 'applanation', label: 'Applanation (Goldmann)' },
  { value: 'icare', label: 'iCare (rebond)' },
];

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-500';

const CELL_INPUT_CLASS =
  'w-full min-w-[80px] px-2 py-1.5 text-xs rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

const INTERPRETATION_ROWS = [
  { key: 'ppc', label: 'PPC' },
  { key: 'phories', label: 'Phories' },
  { key: 'lead_lag', label: 'Lead/Lag' },
  { key: 'arn_arp', label: 'ARN / ARP' },
  { key: 'ppa', label: 'PPA' },
  { key: 'aca', label: 'Rapport AC/A (calculé + gradient)' },
  { key: 'flex', label: 'Flexibilité accommodative (Bino + Mono)' },
  { key: 'rf', label: 'RFP / RFN (VP + VL)' },
];

function calculateAge(dateNaissance) {
  if (!dateNaissance) return '';
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : '';
}

function FieldGroup({ label, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</label>
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
      className={INPUT_CLASS}
      {...rest}
    />
  );
}

function TextInput({ register, name, rules, placeholder, ...rest }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      {...register(name, rules)}
      className={INPUT_CLASS}
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
      className={`${INPUT_CLASS} resize-none`}
    />
  );
}

function SelectInput({ register, name, options, rules, placeholder }) {
  return (
    <select {...register(name, rules)} className={INPUT_CLASS}>
      <option value="">{placeholder || '— Sélectionner —'}</option>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

function InlineCellInput({ register, name, placeholder, type = 'text', step }) {
  return (
    <input
      type={type}
      step={step}
      placeholder={placeholder}
      {...register(name)}
      className={CELL_INPUT_CLASS}
    />
  );
}

function InlineCellSelect({ register, name, options }) {
  return (
    <select {...register(name)} className={CELL_INPUT_CLASS}>
      {options.map((o) =>
        typeof o === 'string' ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

function ToggleButtons({ register, name, value, options }) {
  return (
    <div className="inline-flex flex-wrap items-center rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900/60 p-1 gap-1">
      {options.map((option) => {
        const selected = String(value ?? '') === String(option.value);
        return (
          <label
            key={option.value}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-colors ${
              selected
                ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500 dark:text-white dark:shadow-blue-950/40'
                : 'text-neutral-600 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-700/80'
            }`}
          >
            <input type="radio" value={option.value} {...register(name)} className="sr-only" />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function CheckChip({ register, name, label }) {
  return (
    <label className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-700 dark:text-neutral-200">
      <input
        type="checkbox"
        {...register(name)}
        className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-500 bg-white dark:bg-neutral-700 text-blue-600 focus:ring-blue-500"
      />
      <span>{label}</span>
    </label>
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
      {isOpen ? (
        <ChevronUp size={16} className="text-neutral-400" />
      ) : (
        <ChevronDown size={16} className="text-neutral-400" />
      )}
    </button>
  );
}

export default function BilanForm({ patientId, onSaved, existingData, examenId }) {
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
    anamnese: true,
    preliminaire: false,
    coverAv: false,
    binoculaireDetail: false,
    acuite: false,
    refraction: false,
    prescriptionFinale: false,
    interpretation: true,
  });

  const [submitResult, setSubmitResult] = useState(null);
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/patients')
      .then((r) => r.json())
      .then(setPatients)
      .catch(() => {});
  }, []);

  const watchedPatientId = watch('patient_id');
  const selectedPatient = useMemo(() => {
    const targetId = Number(patientId || watchedPatientId || existingData?.patient_id || 0);
    if (!targetId) return null;
    return patients.find((p) => Number(p.patient_id) === targetId) || null;
  }, [patientId, watchedPatientId, existingData, patients]);

  const patientAge = useMemo(() => {
    const birthDate = selectedPatient?.date_naissance || existingData?.date_naissance;
    return calculateAge(birthDate);
  }, [selectedPatient, existingData]);

  const patientPhone = selectedPatient?.telephone || existingData?.telephone || '';

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onSubmit = async (data) => {
    setSubmitResult(null);
    try {
      const cleaned = {};
      for (const [k, v] of Object.entries(data)) {
        const trimmed = typeof v === 'string' ? v.trim() : v;
        cleaned[k] = trimmed === '' || trimmed === undefined ? null : trimmed;
      }

      const numericFields = [
        'patient_id',
        'av_od_sc',
        'av_og_sc',
        'av_od_ac',
        'av_og_ac',
        'av_binoculaire',
        'auto_od_sphere',
        'auto_od_cylindre',
        'auto_od_axe',
        'auto_og_sphere',
        'auto_og_cylindre',
        'auto_og_axe',
        'rx_od_sphere',
        'rx_od_cylindre',
        'rx_od_axe',
        'rx_od_addition',
        'rx_od_prisme',
        'rx_og_sphere',
        'rx_og_cylindre',
        'rx_og_axe',
        'rx_og_addition',
        'rx_og_prisme',
        'dp_od',
        'dp_og',
        'dp_binoculaire',
        'pio_od',
        'pio_og',
        'harmon_cm',
        'revip_cm',
        'ppc_pb_cm',
        'ppc_pr_cm',
        'reflexe_lumiere_mm',
        'reflexe_penombre_mm',
        'comp_actuelle_od_sph',
        'comp_actuelle_od_cyl',
        'comp_actuelle_od_axe',
        'comp_actuelle_od_add',
        'comp_actuelle_od_prisme',
        'comp_actuelle_og_sph',
        'comp_actuelle_og_cyl',
        'comp_actuelle_og_axe',
        'comp_actuelle_og_add',
        'comp_actuelle_og_prisme',
        'ancien_od_sph',
        'ancien_od_cyl',
        'ancien_od_axe',
        'ancien_og_sph',
        'ancien_og_cyl',
        'ancien_og_axe',
        'ecart_pupillaire_vl_mm',
        'ecart_pupillaire_vp_mm',
        'addition_distance_cm',
        'addition_delta',
        'phorie_vl_h',
        'phorie_vl_v',
        'phorie_vp_h',
        'phorie_vp_v',
        'lead_lag_valeur',
        'arn_valeur',
        'arp_valeur',
        'ppa_od_cm',
        'ppa_od_amax',
        'ppa_og_cm',
        'ppa_og_amax',
        'ppa_odg_cm',
        'ppa_odg_amax',
        'aca_calcule',
        'aca_gradient',
        'flex_bino_cpm',
        'flex_mono_od_cpm',
        'flex_mono_og_cpm',
        'rfn_vl_flou',
        'rfn_vl_rupture',
        'rfn_vl_reprise',
        'rfn_vp_flou',
        'rfn_vp_rupture',
        'rfn_vp_reprise',
        'rfp_vl_flou',
        'rfp_vl_rupture',
        'rfp_vl_reprise',
        'rfp_vp_flou',
        'rfp_vp_rupture',
        'rfp_vp_reprise',
        'prescription_finale_od_sph',
        'prescription_finale_od_cyl',
        'prescription_finale_od_axe',
        'prescription_finale_od_prisme',
        'prescription_finale_og_sph',
        'prescription_finale_og_cyl',
        'prescription_finale_og_axe',
        'prescription_finale_og_prisme',
        'prescription_finale_addition',
        'prescription_finale_distance_lecture_cm',
      ];

      for (const f of numericFields) {
        if (cleaned[f] !== null && cleaned[f] !== undefined) {
          cleaned[f] = Number(cleaned[f]);
        }
      }

      if (cleaned.motilite_oculaire === 'PDDS BSSPI') {
        cleaned.motilite_oculaire = 'Normale';
      }

      if (!cleaned.champ_visuel && cleaned.champ_vision_preliminaire) {
        cleaned.champ_visuel =
          cleaned.champ_vision_preliminaire === 'Normale' ? 'Normal' : 'Réduit';
      }

      if (cleaned.champ_visuel === 'Normale') cleaned.champ_visuel = 'Normal';
      if (cleaned.champ_visuel === 'Anormale') cleaned.champ_visuel = 'Réduit';

      const pid = patientId || cleaned.patient_id;
      if (!pid) throw new Error('Veuillez sélectionner un patient.');

      cleaned.patient_id = Number(pid);
      if (!cleaned.praticien) cleaned.praticien = 'Dr. Praticien';

      const url = examenId
        ? `http://localhost:8000/api/bilans/${examenId}`
        : 'http://localhost:8000/api/examens';
      const method = examenId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
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

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-4">
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
                  className={INPUT_CLASS}
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <FieldGroup label="Examiné par (optométriste) *">
                <TextInput
                  register={register}
                  name="praticien"
                  rules={{ required: 'Nom de l’optométriste requis' }}
                  placeholder="Dr. Nom"
                />
                <FieldError message={errors.praticien?.message} />
              </FieldGroup>

              <FieldGroup label="Date examen">
                <input
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  {...register('date_examen')}
                  className={INPUT_CLASS}
                />
              </FieldGroup>

              <FieldGroup label="Âge">
                <input
                  type="text"
                  value={patientAge !== '' ? `${patientAge} ans` : ''}
                  readOnly
                  className={`${INPUT_CLASS} bg-neutral-100 dark:bg-neutral-700/60`}
                />
              </FieldGroup>

              <FieldGroup label="Téléphone">
                <input
                  type="text"
                  value={patientPhone || ''}
                  readOnly
                  className={`${INPUT_CLASS} bg-neutral-100 dark:bg-neutral-700/60`}
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

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={History}
          title="2. Anamnèse"
          badge="ISO 13666"
          isOpen={openSections.anamnese}
          onToggle={() => toggleSection('anamnese')}
        />
        {openSections.anamnese && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="L'intérêt / Motif">
                <TextInput
                  register={register}
                  name="motif_consultation"
                  placeholder="Vérification de compensation..."
                />
              </FieldGroup>
              <FieldGroup label="Fonction">
                <TextInput register={register} name="fonction_patient" placeholder="Étudiant, travail..." />
              </FieldGroup>
              <FieldGroup label="Loisir">
                <TextInput register={register} name="loisir_patient" placeholder="Sport, lecture..." />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Symptômes visuels">
                <TextArea
                  register={register}
                  name="symptomes_visuels"
                  placeholder="Vision de loin, lecture, fatigue visuelle..."
                  rows={3}
                />
              </FieldGroup>
              <FieldGroup label="Symptômes oculaires">
                <TextArea
                  register={register}
                  name="symptomes_oculaires"
                  placeholder="Rougeurs, sécheresse, douleur..."
                  rows={3}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Dernier examen ophtalmologique">
                <input type="date" {...register('dernier_examen_ophtalmo')} className={INPUT_CLASS} />
              </FieldGroup>
              <FieldGroup label="Traitement">
                <TextInput register={register} name="traitement_actuel" placeholder="Traitement actuel" />
              </FieldGroup>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">Port actuel</p>
              <div className="flex flex-wrap gap-2">
                <CheckChip register={register} name="port_lunettes" label="Lunettes" />
                <CheckChip register={register} name="port_lentilles" label="Lentilles" />
                <CheckChip register={register} name="port_reeducation" label="Rééducation" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Compensation optique actuelle
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Œil</th>
                      <th className="px-2 py-2 text-left font-semibold">SPH</th>
                      <th className="px-2 py-2 text-left font-semibold">CYL</th>
                      <th className="px-2 py-2 text-left font-semibold">AXE</th>
                      <th className="px-2 py-2 text-left font-semibold">ADD</th>
                      <th className="px-2 py-2 text-left font-semibold">PRISME</th>
                      <th className="px-2 py-2 text-left font-semibold">BASE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">OD</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_od_sph" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_od_cyl" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_od_axe" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_od_add" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_od_prisme" /></td>
                      <td className="px-2 py-2">
                        <InlineCellSelect register={register} name="comp_actuelle_od_base" options={BASE_PRISME_OPTIONS} />
                      </td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">OG</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_og_sph" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_og_cyl" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_og_axe" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_og_add" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="comp_actuelle_og_prisme" /></td>
                      <td className="px-2 py-2">
                        <InlineCellSelect register={register} name="comp_actuelle_og_base" options={BASE_PRISME_OPTIONS} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldGroup label="Pathologie oculaire">
                  <ToggleButtons
                    register={register}
                    name="pathologie_oculaire_presence"
                    value={watch('pathologie_oculaire_presence')}
                    options={[
                      { label: 'Oui', value: 'oui' },
                      { label: 'Non', value: 'non' },
                    ]}
                  />
                </FieldGroup>
                <TextInput
                  register={register}
                  name="pathologie_oculaire_description"
                  placeholder="Description"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">Santé générale</p>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <FieldGroup label="Maladie">
                    <ToggleButtons
                      register={register}
                      name="sante_maladie_presence"
                      value={watch('sante_maladie_presence')}
                      options={[
                        { label: 'Oui', value: 'oui' },
                        { label: 'Non', value: 'non' },
                      ]}
                    />
                  </FieldGroup>
                  <TextInput register={register} name="sante_maladie_detail" placeholder="Détail" />
                </div>

                <div className="space-y-2">
                  <FieldGroup label="Médicament">
                    <ToggleButtons
                      register={register}
                      name="sante_medicament_presence"
                      value={watch('sante_medicament_presence')}
                      options={[
                        { label: 'Oui', value: 'oui' },
                        { label: 'Non', value: 'non' },
                      ]}
                    />
                  </FieldGroup>
                  <TextInput register={register} name="sante_medicament_detail" placeholder="Détail" />
                </div>

                <div className="space-y-2">
                  <FieldGroup label="Allergie">
                    <ToggleButtons
                      register={register}
                      name="sante_allergie_presence"
                      value={watch('sante_allergie_presence')}
                      options={[
                        { label: 'Oui', value: 'oui' },
                        { label: 'Non', value: 'non' },
                      ]}
                    />
                  </FieldGroup>
                  <TextInput register={register} name="sante_allergie_detail" placeholder="Détail" />
                </div>
              </div>
            </div>

            <FieldGroup label="Hypothèse">
              <TextArea
                register={register}
                name="hypothese_clinique"
                placeholder="Ex: astigmatisme non corrigé"
                rows={3}
              />
            </FieldGroup>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Eye}
          title="3. Examen Préliminaire"
          badge="ISO 13666"
          isOpen={openSections.preliminaire}
          onToggle={() => toggleSection('preliminaire')}
        />
        {openSections.preliminaire && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FieldGroup label="Harmon (cm)">
                <NumberInput register={register} name="harmon_cm" step={0.1} placeholder="cm" />
              </FieldGroup>
              <FieldGroup label="Revip (cm)">
                <NumberInput register={register} name="revip_cm" step={0.1} placeholder="cm" />
              </FieldGroup>
              <FieldGroup label="PPC – P.B (cm)">
                <NumberInput register={register} name="ppc_pb_cm" step={0.1} placeholder="cm" />
              </FieldGroup>
              <FieldGroup label="PPC – P.R (cm)">
                <NumberInput register={register} name="ppc_pr_cm" step={0.1} placeholder="cm" />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FieldGroup label="Motilité oculaire">
                <ToggleButtons
                  register={register}
                  name="motilite_oculaire"
                  value={watch('motilite_oculaire')}
                  options={[
                    { label: 'PDDS BSSPI', value: 'PDDS BSSPI' },
                    { label: 'Anormale', value: 'Anormale' },
                  ]}
                />
              </FieldGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldGroup label="Réflexe pupillaire – Lum. habit (mm)">
                  <NumberInput register={register} name="reflexe_lumiere_mm" step={0.1} placeholder="mm" />
                </FieldGroup>
                <FieldGroup label="Réflexe pupillaire – Pénombre (mm)">
                  <NumberInput register={register} name="reflexe_penombre_mm" step={0.1} placeholder="mm" />
                </FieldGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldGroup label="PERRLA">
                  <ToggleButtons
                    register={register}
                    name="perrla"
                    value={watch('perrla')}
                    options={[
                      { label: 'Oui', value: 'oui' },
                      { label: 'Non', value: 'non' },
                    ]}
                  />
                </FieldGroup>
                <TextInput register={register} name="perrla_remarque" placeholder="Remarque" />
              </div>

              <div className="space-y-2">
                <FieldGroup label="Champ de vision">
                  <ToggleButtons
                    register={register}
                    name="champ_vision_preliminaire"
                    value={watch('champ_vision_preliminaire')}
                    options={[
                      { label: 'Normale', value: 'Normale' },
                      { label: 'Anormale', value: 'Anormale' },
                    ]}
                  />
                </FieldGroup>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 bg-neutral-50 dark:bg-neutral-800/40">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">Vision des couleurs</p>

              <FieldGroup label="Radio">
                <ToggleButtons
                  register={register}
                  name="vision_couleurs_methode"
                  value={watch('vision_couleurs_methode')}
                  options={[
                    { label: 'Ishihara', value: 'Ishihara' },
                    { label: 'R/V', value: 'R/V' },
                  ]}
                />
              </FieldGroup>

              <div className="flex flex-wrap gap-2">
                <CheckChip register={register} name="vision_couleurs_od" label="OD" />
                <CheckChip register={register} name="vision_couleurs_og" label="OG" />
                <CheckChip register={register} name="vision_couleurs_odg" label="ODG" />
              </div>

              <FieldGroup label="Interprétation clinique couleurs">
                <ToggleButtons
                  register={register}
                  name="test_couleurs"
                  value={watch('test_couleurs')}
                  options={[
                    { label: 'Normal', value: 'Normal' },
                    { label: 'Déficient', value: 'Déficient' },
                  ]}
                />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Move}
          title="4. Cover Test & AV Brute"
          badge="ISO 13666"
          isOpen={openSections.coverAv}
          onToggle={() => toggleSection('coverAv')}
        />
        {openSections.coverAv && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Masquage / Démasquage
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-2 py-2 text-left font-semibold">VL</th>
                      <th className="px-2 py-2 text-left font-semibold">VP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">Unilatérale</td>
                      <td className="px-2 py-2">
                        <InlineCellInput register={register} name="cover_uni_vl" placeholder="Ortho / Exo / Eso" />
                      </td>
                      <td className="px-2 py-2">
                        <InlineCellInput register={register} name="cover_uni_vp" placeholder="Ortho / Exo / Eso" />
                      </td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">Alterné</td>
                      <td className="px-2 py-2">
                        <InlineCellInput register={register} name="cover_alt_vl" placeholder="Ortho / Exo / Eso" />
                      </td>
                      <td className="px-2 py-2">
                        <InlineCellInput register={register} name="cover_alt_vp" placeholder="Ortho / Exo / Eso" />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">AV brute</p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Distance</th>
                      <th className="px-2 py-2 text-left font-semibold">OD</th>
                      <th className="px-2 py-2 text-left font-semibold">OG</th>
                      <th className="px-2 py-2 text-left font-semibold">ODG</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">VL</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vl_od" placeholder="x/10" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vl_og" placeholder="x/10" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vl_odg" placeholder="x/10" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">VP</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vp_od" placeholder="x/10" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vp_og" placeholder="x/10" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="av_brute_vp_odg" placeholder="x/10" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Correction autoref / ancien équipement
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Œil</th>
                      <th className="px-2 py-2 text-left font-semibold">SPH</th>
                      <th className="px-2 py-2 text-left font-semibold">CYL</th>
                      <th className="px-2 py-2 text-left font-semibold">AXE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">OD</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_od_sph" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_od_cyl" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_od_axe" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">OG</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_og_sph" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_og_cyl" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ancien_og_axe" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <FieldGroup label="Écart pupillaire VL (mm)">
                <NumberInput register={register} name="ecart_pupillaire_vl_mm" step={0.1} placeholder="mm" />
              </FieldGroup>
              <FieldGroup label="Écart pupillaire VP (mm)">
                <NumberInput register={register} name="ecart_pupillaire_vp_mm" step={0.1} placeholder="mm" />
              </FieldGroup>

              <FieldGroup label="Méthode">
                <ToggleButtons
                  register={register}
                  name="methode_equilibre"
                  value={watch('methode_equilibre')}
                  options={[
                    { label: 'SACS', value: 'SACS' },
                    { label: 'HUMPHRISS', value: 'HUMPHRISS' },
                  ]}
                />
              </FieldGroup>

              <FieldGroup label="Équilibre bio/bino">
                <ToggleButtons
                  register={register}
                  name="equilibre_bio_bino"
                  value={watch('equilibre_bio_bino')}
                  options={[
                    { label: 'Isoacuité', value: 'Isoacuité' },
                    { label: 'Anisoacuité', value: 'Anisoacuité' },
                  ]}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Test">
                <TextInput register={register} name="test_equilibre" placeholder="Filtre polarisé..." />
              </FieldGroup>
              <FieldGroup label="Synthèse Cover Test">
                <TextInput register={register} name="cover_test" placeholder="Synthèse clinique" />
              </FieldGroup>
            </div>

            <div className="flex flex-wrap gap-2">
              <CheckChip register={register} name="controle_vb" label="Contrôle VB" />
              <CheckChip register={register} name="essai_compensation" label="Essai de compensation" />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Activity}
          title="5. Vision Binoculaire Détaillée"
          badge="ISO 13666"
          isOpen={openSections.binoculaireDetail}
          onToggle={() => toggleSection('binoculaireDetail')}
        />
        {openSections.binoculaireDetail && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Addition – distance (cm)">
                <NumberInput register={register} name="addition_distance_cm" step={0.1} placeholder="cm" />
              </FieldGroup>
              <FieldGroup label="Addition – add (δ)">
                <NumberInput register={register} name="addition_delta" step={0.1} placeholder="δ" />
              </FieldGroup>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Phories dissociées (Δ)
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Distance</th>
                      <th className="px-2 py-2 text-left font-semibold">H</th>
                      <th className="px-2 py-2 text-left font-semibold">V</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">VL</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="phorie_vl_h" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="phorie_vl_v" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">VP</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="phorie_vp_h" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="phorie_vp_v" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <FieldGroup label="Lead/Lag – valeur">
                <NumberInput register={register} name="lead_lag_valeur" step={0.01} placeholder="D" />
              </FieldGroup>
              <FieldGroup label="Lead/Lag – référence">
                <TextInput register={register} name="lead_lag_reference" placeholder="Lag: +0.25 à +0.75" />
              </FieldGroup>
              <FieldGroup label="ARN">
                <NumberInput register={register} name="arn_valeur" step={0.25} placeholder="D" />
              </FieldGroup>
              <FieldGroup label="ARP">
                <NumberInput register={register} name="arp_valeur" step={0.25} placeholder="D" />
              </FieldGroup>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                PPA (Punctum Proximum Accommodatif)
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Œil</th>
                      <th className="px-2 py-2 text-left font-semibold">Distance (cm)</th>
                      <th className="px-2 py-2 text-left font-semibold">Amax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">OD</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_od_cm" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_od_amax" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">OG</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_og_cm" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_og_amax" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">ODG</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_odg_cm" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="ppa_odg_amax" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Rapport AC/A calculé (Norme: 4.5–5.2)">
                <NumberInput register={register} name="aca_calcule" step={0.1} placeholder="Δ/δ" />
              </FieldGroup>
              <FieldGroup label="Rapport AC/A gradient (Norme: 2.5)">
                <NumberInput register={register} name="aca_gradient" step={0.1} placeholder="Δ/δ" />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldGroup label="Flexibilité accommodative bino (Norme: 13 cpm)">
                <NumberInput register={register} name="flex_bino_cpm" step={0.1} placeholder="cpm" />
              </FieldGroup>
              <FieldGroup label="Flex mono OD (Norme: 17 cpm)">
                <NumberInput register={register} name="flex_mono_od_cpm" step={0.1} placeholder="cpm" />
              </FieldGroup>
              <FieldGroup label="Flex mono OG (Norme: 17 cpm)">
                <NumberInput register={register} name="flex_mono_og_cpm" step={0.1} placeholder="cpm" />
              </FieldGroup>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Réserve fusionnelle (flou / rupture / reprise)
              </p>
              <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full text-xs">
                  <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Réserve</th>
                      <th className="px-2 py-2 text-left font-semibold">Flou</th>
                      <th className="px-2 py-2 text-left font-semibold">Rupture</th>
                      <th className="px-2 py-2 text-left font-semibold">Reprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">RFN VL</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vl_flou" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vl_rupture" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vl_reprise" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">RFN VP</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vp_flou" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vp_rupture" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfn_vp_reprise" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">RFP VL</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vl_flou" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vl_rupture" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vl_reprise" /></td>
                    </tr>
                    <tr className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-semibold">RFP VP</td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vp_flou" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vp_rupture" /></td>
                      <td className="px-2 py-2"><InlineCellInput register={register} name="rfp_vp_reprise" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide">
                Représentation graphique de la zone de vision confortable
              </p>

              <div className="relative h-24 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-white/70 dark:bg-neutral-900/40">
                <div className="absolute left-4 right-4 top-7 border-t border-blue-400/60" />
                <div className="absolute left-4 right-4 top-16 border-t border-emerald-400/60" />
                <span className="absolute left-2 top-5 text-[10px] text-blue-500 font-medium">VL</span>
                <span className="absolute left-2 top-14 text-[10px] text-emerald-500 font-medium">VP</span>
                <span className="absolute left-1/3 top-5.5 h-2 w-2 rounded-full bg-blue-500" />
                <span className="absolute left-2/3 top-5.5 h-2 w-2 rounded-full bg-blue-500" />
                <span className="absolute left-1/2 top-15.5 h-2 w-2 rounded-full bg-emerald-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldGroup label="Points VL">
                  <TextInput register={register} name="zone_vl_points" placeholder="Ex: 8 / 12 / 16" />
                </FieldGroup>
                <FieldGroup label="Points VP">
                  <TextInput register={register} name="zone_vp_points" placeholder="Ex: 10 / 14 / 18" />
                </FieldGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Critère de Sheard (phorie gênante)">
                <ToggleButtons
                  register={register}
                  name="critere_sheard"
                  value={watch('critere_sheard')}
                  options={[
                    { label: 'Oui', value: 'oui' },
                    { label: 'Non', value: 'non' },
                  ]}
                />
              </FieldGroup>

              <FieldGroup label="Critère de Percival (VB confortable)">
                <ToggleButtons
                  register={register}
                  name="critere_percival"
                  value={watch('critere_percival')}
                  options={[
                    { label: 'Oui', value: 'oui' },
                    { label: 'Non', value: 'non' },
                  ]}
                />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Eye}
          title="6. Acuité Visuelle"
          badge="ISO 8596"
          isOpen={openSections.acuite}
          onToggle={() => toggleSection('acuite')}
        />
        {openSections.acuite && (
          <div className="p-5 space-y-4 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">
              Échelle décimale (0.0 – 2.0) · 1.0 = 10/10 · Conformité ISO 8596
            </p>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Sans correction (SC)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldGroup label="AV OD (SC)">
                  <NumberInput
                    register={register}
                    name="av_od_sc"
                    rules={avRules}
                    step={V.AV.step}
                    placeholder="ex: 0.5"
                  />
                  <FieldError message={errors.av_od_sc?.message} />
                </FieldGroup>
                <FieldGroup label="AV OG (SC)">
                  <NumberInput
                    register={register}
                    name="av_og_sc"
                    rules={avRules}
                    step={V.AV.step}
                    placeholder="ex: 0.6"
                  />
                  <FieldError message={errors.av_og_sc?.message} />
                </FieldGroup>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-2 uppercase tracking-wide">
                Avec correction (AC)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldGroup label="AV OD (AC)">
                  <NumberInput
                    register={register}
                    name="av_od_ac"
                    rules={avRules}
                    step={V.AV.step}
                    placeholder="ex: 1.0"
                  />
                  <FieldError message={errors.av_od_ac?.message} />
                </FieldGroup>
                <FieldGroup label="AV OG (AC)">
                  <NumberInput
                    register={register}
                    name="av_og_ac"
                    rules={avRules}
                    step={V.AV.step}
                    placeholder="ex: 1.0"
                  />
                  <FieldError message={errors.av_og_ac?.message} />
                </FieldGroup>
                <FieldGroup label="AV Binoculaire">
                  <NumberInput
                    register={register}
                    name="av_binoculaire"
                    rules={avRules}
                    step={V.AV.step}
                    placeholder="ex: 1.2"
                  />
                  <FieldError message={errors.av_binoculaire?.message} />
                </FieldGroup>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Glasses}
          title="7. Réfraction"
          badge="ISO 13666"
          isOpen={openSections.refraction}
          onToggle={() => toggleSection('refraction')}
        />
        {openSections.refraction && (
          <div className="p-5 space-y-6 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Réfraction objective (autoréfractomètre)
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput
                        register={register}
                        name="auto_od_sphere"
                        rules={sphereRules}
                        step={V.SPHERE.step}
                        placeholder="-2.50"
                      />
                      <FieldError message={errors.auto_od_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput
                        register={register}
                        name="auto_od_cylindre"
                        rules={cylindreRules}
                        step={V.CYLINDRE.step}
                        placeholder="-0.75"
                      />
                      <FieldError message={errors.auto_od_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput
                        register={register}
                        name="auto_od_axe"
                        rules={axeRules}
                        step={1}
                        placeholder="170"
                      />
                      <FieldError message={errors.auto_od_axe?.message} />
                    </FieldGroup>
                  </div>
                </div>

                <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput
                        register={register}
                        name="auto_og_sphere"
                        rules={sphereRules}
                        step={V.SPHERE.step}
                        placeholder="-2.00"
                      />
                      <FieldError message={errors.auto_og_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput
                        register={register}
                        name="auto_og_cylindre"
                        rules={cylindreRules}
                        step={V.CYLINDRE.step}
                        placeholder="-1.00"
                      />
                      <FieldError message={errors.auto_og_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput
                        register={register}
                        name="auto_og_axe"
                        rules={axeRules}
                        step={1}
                        placeholder="5"
                      />
                      <FieldError message={errors.auto_og_axe?.message} />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Réfraction subjective
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput
                        register={register}
                        name="rx_od_sphere"
                        rules={sphereRules}
                        step={V.SPHERE.step}
                        placeholder="-2.50"
                      />
                      <FieldError message={errors.rx_od_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput
                        register={register}
                        name="rx_od_cylindre"
                        rules={cylindreRules}
                        step={V.CYLINDRE.step}
                        placeholder="-0.75"
                      />
                      <FieldError message={errors.rx_od_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput
                        register={register}
                        name="rx_od_axe"
                        rules={axeRules}
                        step={1}
                        placeholder="170"
                      />
                      <FieldError message={errors.rx_od_axe?.message} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="ADD (D)">
                      <NumberInput
                        register={register}
                        name="rx_od_addition"
                        rules={addRules}
                        step={V.ADDITION.step}
                        placeholder="2.00"
                      />
                      <FieldError message={errors.rx_od_addition?.message} />
                    </FieldGroup>
                    <FieldGroup label="Prisme (Δ)">
                      <NumberInput
                        register={register}
                        name="rx_od_prisme"
                        rules={prismeRules}
                        step={V.PRISME.step}
                        placeholder="0"
                      />
                      <FieldError message={errors.rx_od_prisme?.message} />
                    </FieldGroup>
                    <FieldGroup label="Base">
                      <SelectInput
                        register={register}
                        name="rx_od_base_prisme"
                        options={BASE_PRISME_OPTIONS}
                        placeholder="—"
                      />
                    </FieldGroup>
                  </div>
                </div>

                <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="SPH (D)">
                      <NumberInput
                        register={register}
                        name="rx_og_sphere"
                        rules={sphereRules}
                        step={V.SPHERE.step}
                        placeholder="-2.00"
                      />
                      <FieldError message={errors.rx_og_sphere?.message} />
                    </FieldGroup>
                    <FieldGroup label="CYL (D)">
                      <NumberInput
                        register={register}
                        name="rx_og_cylindre"
                        rules={cylindreRules}
                        step={V.CYLINDRE.step}
                        placeholder="-1.00"
                      />
                      <FieldError message={errors.rx_og_cylindre?.message} />
                    </FieldGroup>
                    <FieldGroup label="AXE (°)">
                      <NumberInput
                        register={register}
                        name="rx_og_axe"
                        rules={axeRules}
                        step={1}
                        placeholder="5"
                      />
                      <FieldError message={errors.rx_og_axe?.message} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <FieldGroup label="ADD (D)">
                      <NumberInput
                        register={register}
                        name="rx_og_addition"
                        rules={addRules}
                        step={V.ADDITION.step}
                        placeholder="2.00"
                      />
                      <FieldError message={errors.rx_og_addition?.message} />
                    </FieldGroup>
                    <FieldGroup label="Prisme (Δ)">
                      <NumberInput
                        register={register}
                        name="rx_og_prisme"
                        rules={prismeRules}
                        step={V.PRISME.step}
                        placeholder="0"
                      />
                      <FieldError message={errors.rx_og_prisme?.message} />
                    </FieldGroup>
                    <FieldGroup label="Base">
                      <SelectInput
                        register={register}
                        name="rx_og_base_prisme"
                        options={BASE_PRISME_OPTIONS}
                        placeholder="—"
                      />
                    </FieldGroup>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Distance pupillaire (DP)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldGroup label="DP OD (mm)">
                  <NumberInput register={register} name="dp_od" rules={dpRules} step={V.DP.step} placeholder="32.0" />
                  <FieldError message={errors.dp_od?.message} />
                </FieldGroup>
                <FieldGroup label="DP OG (mm)">
                  <NumberInput register={register} name="dp_og" rules={dpRules} step={V.DP.step} placeholder="31.5" />
                  <FieldError message={errors.dp_og?.message} />
                </FieldGroup>
                <FieldGroup label="DP Binoculaire (mm)">
                  <NumberInput
                    register={register}
                    name="dp_binoculaire"
                    rules={{
                      min: { value: 50, message: 'Min 50 mm' },
                      max: { value: 80, message: 'Max 80 mm' },
                    }}
                    step={0.5}
                    placeholder="63.5"
                  />
                  <FieldError message={errors.dp_binoculaire?.message} />
                </FieldGroup>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-3 uppercase tracking-wide">
                Pression intraoculaire (PIO)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FieldGroup label="PIO OD (mmHg)">
                  <NumberInput register={register} name="pio_od" rules={pioRules} step={V.PIO.step} placeholder="15.0" />
                  <FieldError message={errors.pio_od?.message} />
                </FieldGroup>
                <FieldGroup label="PIO OG (mmHg)">
                  <NumberInput register={register} name="pio_og" rules={pioRules} step={V.PIO.step} placeholder="16.0" />
                  <FieldError message={errors.pio_og?.message} />
                </FieldGroup>
                <FieldGroup label="Méthode PIO">
                  <SelectInput
                    register={register}
                    name="methode_pio"
                    options={METHODE_PIO_OPTIONS}
                    placeholder="Méthode"
                  />
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

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={Glasses}
          title="8. Prescription Finale"
          badge="ISO 13666"
          isOpen={openSections.prescriptionFinale}
          onToggle={() => toggleSection('prescriptionFinale')}
        />
        {openSections.prescriptionFinale && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Œil</th>
                    <th className="px-2 py-2 text-left font-semibold">SPH</th>
                    <th className="px-2 py-2 text-left font-semibold">CYL</th>
                    <th className="px-2 py-2 text-left font-semibold">AXE</th>
                    <th className="px-2 py-2 text-left font-semibold">PRISME</th>
                    <th className="px-2 py-2 text-left font-semibold">BASE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="px-3 py-2 font-semibold text-blue-600 dark:text-blue-400">OD</td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_od_sph" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_od_cyl" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_od_axe" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_od_prisme" /></td>
                    <td className="px-2 py-2">
                      <InlineCellSelect register={register} name="prescription_finale_od_base" options={BASE_PRISME_OPTIONS} />
                    </td>
                  </tr>
                  <tr className="border-t border-neutral-200 dark:border-neutral-700">
                    <td className="px-3 py-2 font-semibold text-emerald-600 dark:text-emerald-400">OG</td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_og_sph" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_og_cyl" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_og_axe" /></td>
                    <td className="px-2 py-2"><InlineCellInput register={register} name="prescription_finale_og_prisme" /></td>
                    <td className="px-2 py-2">
                      <InlineCellSelect register={register} name="prescription_finale_og_base" options={BASE_PRISME_OPTIONS} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Addition (δ)">
                <NumberInput
                  register={register}
                  name="prescription_finale_addition"
                  step={0.1}
                  placeholder="δ"
                />
              </FieldGroup>
              <FieldGroup label="Distance de lecture (cm)">
                <NumberInput
                  register={register}
                  name="prescription_finale_distance_lecture_cm"
                  step={0.1}
                  placeholder="cm"
                />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        <SectionHeader
          icon={FileText}
          title="9. Interprétation"
          badge="ISO 14971"
          isOpen={openSections.interpretation}
          onToggle={() => toggleSection('interpretation')}
        />
        {openSections.interpretation && (
          <div className="p-5 space-y-5 border border-t-0 border-neutral-200 dark:border-neutral-700 rounded-b-xl">
            <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-full text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Paramètre</th>
                    <th className="px-2 py-2 text-left font-semibold">Statut</th>
                    <th className="px-2 py-2 text-left font-semibold">Valeur / Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {INTERPRETATION_ROWS.map((row) => (
                    <tr key={row.key} className="border-t border-neutral-200 dark:border-neutral-700">
                      <td className="px-3 py-2 font-medium text-neutral-700 dark:text-neutral-200">{row.label}</td>
                      <td className="px-2 py-2 w-44">
                        <select {...register(`interpretation_${row.key}_statut`)} className={CELL_INPUT_CLASS}>
                          <option value="">—</option>
                          <option value="ok">✓</option>
                          <option value="ko">✗</option>
                          <option value="valeur">Valeur</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <InlineCellInput
                          register={register}
                          name={`interpretation_${row.key}_valeur`}
                          placeholder="Détail"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FieldGroup label="Conclusion (diagnostic final et recommandations thérapeutiques)">
              <TextArea
                register={register}
                name="diagnostic"
                placeholder="Diagnostic final..."
                rows={6}
              />
            </FieldGroup>

            <FieldGroup label="Observations complémentaires">
              <TextArea
                register={register}
                name="observations"
                placeholder="Recommandations, suivi, orientation..."
                rows={4}
              />
            </FieldGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Fond d'œil">
                <TextArea register={register} name="fond_oeil" placeholder="Normal, rétinopathie..." rows={2} />
              </FieldGroup>
              <FieldGroup label="Biomicroscopie (LAF)">
                <TextArea register={register} name="biomicroscopie" placeholder="Cornée, cristallin..." rows={2} />
              </FieldGroup>
            </div>
          </div>
        )}
      </div>

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
              {submitResult.success ? (examenId ? 'Bilan mis à jour avec succès' : 'Bilan enregistré avec succès') : 'Erreur'}
            </p>
            {!submitResult.success && <p className="text-xs mt-1">{submitResult.error}</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => reset(existingData || {})}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Réinitialiser
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 disabled:bg-blue-400 dark:disabled:bg-blue-700 rounded-lg transition-colors shadow-sm shadow-blue-500/20 dark:shadow-blue-950/40"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isSubmitting ? 'Enregistrement...' : examenId ? 'Mettre à jour le bilan' : 'Enregistrer le bilan'}
        </button>
      </div>
    </form>
  );
}
