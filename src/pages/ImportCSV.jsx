// ─────────────────────────────────────────────────────────────────
// BBA-Data – Module de Transfert CSV
// Importation de données cliniques au format CSV
// Passerelle entre le formulaire web (Vercel) et l'analyse desktop
// ─────────────────────────────────────────────────────────────────

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  Eye,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// ─── Mapping colonnes CSV attendues (Bilan Complet) ─────────
const EXPECTED_COLUMNS = [
  'nom', 'prenom', 'date_naissance', 'sexe', 'telephone', 'email', 'ville',
  'motif_consultation', 'antecedents_oculaires', 'antecedents_generaux',
  'port_actuel',
  'av_od_sc', 'av_og_sc', 'av_od_ac', 'av_og_ac', 'av_binoculaire',
  'auto_od_sphere', 'auto_od_cylindre', 'auto_od_axe',
  'auto_og_sphere', 'auto_og_cylindre', 'auto_og_axe',
  'rx_od_sphere', 'rx_od_cylindre', 'rx_od_axe', 'rx_od_addition',
  'rx_og_sphere', 'rx_og_cylindre', 'rx_og_axe', 'rx_og_addition',
  'dp_od', 'dp_og', 'dp_binoculaire',
  'pio_od', 'pio_og',
  'diagnostic', 'observations', 'praticien',
];

const REQUIRED_COLUMNS = ['nom', 'prenom', 'date_naissance', 'sexe'];

// ─── Mapping colonnes CSV (Bilan Simplifié) ─────────────────
const EXPECTED_COLUMNS_SIMPLE = [
  'age', 'sexe', 'ametropie', 'anomalies', 'acuite_visuelle',
  'ametropie_myopie', 'ametropie_hypermetropie', 'ametropie_astigmatisme',
  'anomalie_insuffisance_accommodation', 'anomalie_exces_accommodation', 'anomalie_fatigue_accommodative',
  'anomalie_spasme_accommodatif', 'anomalie_inertie_accommodative', 'anomalie_paralysie_accommodative',
  'anomalie_insuffisance_convergence', 'anomalie_pseudo_insuffisance_convergence', 'anomalie_exces_convergence',
  'anomalie_insuffisance_convergence_pure', 'anomalie_esophorie_basique', 'anomalie_insuffisance_divergence',
  'anomalie_exophorie_basique', 'anomalie_exces_divergence', 'anomalie_phorie_verticale_hyper_d_g',
  'anomalie_phorie_verticale_hyper_g_d', 'anomalie_paralysie_oculomotrice', 'anomalie_dysfonctionnement_vergentiel',
  'anomalie_reserves_fusionnelles_reduites', 'anomalie_pas_d_anomalie',
];

const REQUIRED_COLUMNS_SIMPLE = ['age', 'sexe', 'acuite_visuelle'];

const VALID_AMETROPIES = ['Myopie', 'Hypermétropie', 'Astigmatisme'];
const VALID_ANOMALIES = [
  "Insuffisance d'accommodation",
  "Excès d'accommodation",
  'Fatigue accommodative',
  'Spasme accommodatif',
  'Inertie accommodative',
  'Paralysie accommodative',
  'Insuffisance de convergence',
  'Pseudo-insuffisance de convergence',
  'Excès de convergence',
  'Insuffisance de convergence pure',
  'Ésophorie basique',
  'Insuffisance de divergence',
  'Exophorie basique',
  'Excès de divergence',
  'Phorie verticale hyper D/G',
  'Phorie verticale hyper G/D',
  'Paralysie oculomotrice',
  'Dysfonctionnement vergentiel',
  'Réserves fusionnelles réduites',
  "Pas d'anomalie",
];
const VALID_STATUT = ['Emmetrope', 'Non emmetrope'];

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

const ANOMALIES_ALIASES = {
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

const AMETROPIE_FLAG_MAP = {
  ametropie_myopie: 'Myopie',
  ametropie_hypermetropie: 'Hypermétropie',
  ametropie_astigmatisme: 'Astigmatisme',
};

const ANOMALIES_FLAG_MAP = {
  anomalie_insuffisance_accommodation: "Insuffisance d'accommodation",
  anomalie_exces_accommodation: "Excès d'accommodation",
  anomalie_fatigue_accommodative: 'Fatigue accommodative',
  anomalie_spasme_accommodatif: 'Spasme accommodatif',
  anomalie_inertie_accommodative: 'Inertie accommodative',
  anomalie_paralysie_accommodative: 'Paralysie accommodative',
  anomalie_insuffisance_convergence: 'Insuffisance de convergence',
  anomalie_pseudo_insuffisance_convergence: 'Pseudo-insuffisance de convergence',
  anomalie_exces_convergence: 'Excès de convergence',
  anomalie_insuffisance_convergence_pure: 'Insuffisance de convergence pure',
  anomalie_esophorie_basique: 'Ésophorie basique',
  anomalie_insuffisance_divergence: 'Insuffisance de divergence',
  anomalie_exophorie_basique: 'Exophorie basique',
  anomalie_exces_divergence: 'Excès de divergence',
  anomalie_phorie_verticale_hyper_d_g: 'Phorie verticale hyper D/G',
  anomalie_phorie_verticale_hyper_g_d: 'Phorie verticale hyper G/D',
  anomalie_paralysie_oculomotrice: 'Paralysie oculomotrice',
  anomalie_dysfonctionnement_vergentiel: 'Dysfonctionnement vergentiel',
  anomalie_reserves_fusionnelles_reduites: 'Réserves fusionnelles réduites',
  anomalie_pas_d_anomalie: "Pas d'anomalie",
};

const truthyFlag = (value) => ['1', 'true', 'oui', 'yes', 'x'].includes(String(value || '').toLowerCase().trim());

function parseSimpleAmetropies(row) {
  const fromText = (row.ametropie || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => AMETROPIE_ALIASES[normalizeLabel(s)] || s);

  const fromFlags = Object.entries(AMETROPIE_FLAG_MAP)
    .filter(([key]) => truthyFlag(row[key]))
    .map(([, label]) => label);

  return [...new Set([...fromText, ...fromFlags])].filter((v) => VALID_AMETROPIES.includes(v));
}

function parseSimpleAnomalies(row) {
  const fromText = (row.anomalies || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ANOMALIES_ALIASES[normalizeLabel(s)] || s);

  const fromFlags = Object.entries(ANOMALIES_FLAG_MAP)
    .filter(([key]) => truthyFlag(row[key]))
    .map(([, label]) => label);

  let merged = [...new Set([...fromText, ...fromFlags])].filter((v) => VALID_ANOMALIES.includes(v));
  if (merged.includes("Pas d'anomalie") && merged.length > 1) {
    merged = merged.filter((v) => v !== "Pas d'anomalie");
  }
  return merged;
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [], errors: ['Fichier vide ou sans données'] };

  // Detect separator (comma or semicolon)
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) {
      errors.push(`Ligne ${i + 1}: ${values.length} colonnes au lieu de ${headers.length}`);
      continue;
    }
    const row = {};
    headers.forEach((h, j) => {
      row[h] = values[j] || '';
    });
    rows.push(row);
  }

  return { headers, rows, errors };
}

function validateRow(row, idx) {
  const warnings = [];
  // Required fields
  for (const col of REQUIRED_COLUMNS) {
    if (!row[col]) warnings.push({ line: idx + 2, col, level: 'error', msg: `${col} manquant` });
  }
  // PIO range check (AAO Preferred Practice Patterns)
  const pioOd = parseFloat(row.pio_od);
  const pioOg = parseFloat(row.pio_og);
  if (pioOd && pioOd > 21) warnings.push({ line: idx + 2, col: 'pio_od', level: 'warning', msg: `PIO OD = ${pioOd} > 21 mmHg` });
  if (pioOg && pioOg > 21) warnings.push({ line: idx + 2, col: 'pio_og', level: 'warning', msg: `PIO OG = ${pioOg} > 21 mmHg` });
  // AV range
  ['av_od_sc', 'av_og_sc', 'av_od_ac', 'av_og_ac'].forEach((col) => {
    const v = parseFloat(row[col]);
    if (v && (v < 0 || v > 2.0)) warnings.push({ line: idx + 2, col, level: 'warning', msg: `${col} = ${v} hors norme (0–2.0)` });
  });
  // Sphere range
  ['rx_od_sphere', 'rx_og_sphere', 'auto_od_sphere', 'auto_og_sphere'].forEach((col) => {
    const v = parseFloat(row[col]);
    if (v && (v < -25 || v > 25)) warnings.push({ line: idx + 2, col, level: 'error', msg: `${col} = ${v} hors limites (±25 D)` });
  });
  // Axe range
  ['rx_od_axe', 'rx_og_axe', 'auto_od_axe', 'auto_og_axe'].forEach((col) => {
    const v = parseFloat(row[col]);
    if (v !== undefined && v !== '' && !isNaN(v) && (v < 0 || v > 180)) warnings.push({ line: idx + 2, col, level: 'error', msg: `${col} = ${v}° hors [0–180]` });
  });
  return warnings;
}

function validateRowSimple(row, idx) {
  const warnings = [];
  for (const col of REQUIRED_COLUMNS_SIMPLE) {
    if (!row[col]) warnings.push({ line: idx + 2, col, level: 'error', msg: `${col} manquant` });
  }
  const age = parseInt(row.age);
  if (row.age && (isNaN(age) || age < 0 || age > 150))
    warnings.push({ line: idx + 2, col: 'age', level: 'error', msg: `Âge invalide: ${row.age}` });
  if (row.sexe && !['Homme', 'Femme'].includes(row.sexe))
    warnings.push({ line: idx + 2, col: 'sexe', level: 'warning', msg: `Sexe non reconnu: ${row.sexe}` });
  const parsedAmetropies = parseSimpleAmetropies(row);
  const parsedAnomalies = parseSimpleAnomalies(row);

  if (parsedAmetropies.length === 0)
    warnings.push({ line: idx + 2, col: 'ametropie', level: 'warning', msg: 'Aucune amétropie reconnue' });

  if ((row.ametropie || '').trim()) {
    const vals = row.ametropie.split(',').map((s) => s.trim()).filter(Boolean);
    vals.forEach((v) => {
      if (!AMETROPIE_ALIASES[normalizeLabel(v)]) {
        warnings.push({ line: idx + 2, col: 'ametropie', level: 'warning', msg: `Amétropie non reconnue: ${v}` });
      }
    });
  }

  if ((row.anomalies || '').trim()) {
    const vals = row.anomalies.split(',').map((s) => s.trim()).filter(Boolean);
    vals.forEach((v) => {
      if (!ANOMALIES_ALIASES[normalizeLabel(v)]) {
        warnings.push({ line: idx + 2, col: 'anomalies', level: 'warning', msg: `Anomalie non reconnue: ${v}` });
      }
    });
  }

  if ((row.anomalies || '').trim() && parsedAnomalies.length === 0)
    warnings.push({ line: idx + 2, col: 'anomalies', level: 'warning', msg: 'Aucune anomalie exploitable détectée' });

  if (row.statut_refractif && !VALID_STATUT.includes(row.statut_refractif))
    warnings.push({ line: idx + 2, col: 'statut_refractif', level: 'warning', msg: `Statut réfractif non reconnu: ${row.statut_refractif}` });
  return warnings;
}

export default function ImportCSV() {
  const fileRef = useRef(null);
  const [importMode, setImportMode] = useState('complet'); // 'complet' | 'simple'
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [validations, setValidations] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [previewRows, setPreviewRows] = useState(5);

  const handleFile = useCallback((e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows, errors } = parseCSV(ev.target.result);
      setParsed({ headers, rows, parseErrors: errors });
      const validateFn = importMode === 'simple' ? validateRowSimple : validateRow;
      const allWarnings = rows.flatMap((row, i) => validateFn(row, i));
      setValidations(allWarnings);
    };
    reader.readAsText(f, 'utf-8');
  }, [importMode]);

  const handleImport = useCallback(async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);
    setResult(null);
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of parsed.rows) {
      try {
        // ── Helper: safe float parser (0 stays 0, empty/NaN → null)
        const safeFloat = (val) => {
          if (val === null || val === undefined || val === '') return null;
          const v = parseFloat(val);
          return isNaN(v) ? null : v;
        };

        // ── Normalize sexe: "Homme" → "M", "Femme" → "F", else "Autre"
        const sexeMap = { homme: 'M', masculin: 'M', m: 'M', femme: 'F', feminin: 'F', féminin: 'F', f: 'F' };
        const normalizedSexe = sexeMap[(row.sexe || '').toLowerCase().trim()] || 'Autre';

        // ── Normalize date_naissance: DD/MM/YYYY, DD-MM-YYYY, DD MM YYYY → YYYY-MM-DD
        let normalizedDate = (row.date_naissance || '').trim();
        // DD/MM/YYYY or DD-MM-YYYY
        if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(normalizedDate)) {
          const [dd, mm, yyyy] = normalizedDate.split(/[\/\-]/);
          normalizedDate = `${yyyy}-${mm}-${dd}`;
        }
        // DD MM YYYY (espaces)
        else if (/^\d{2}\s+\d{2}\s+\d{4}$/.test(normalizedDate)) {
          const [dd, mm, yyyy] = normalizedDate.split(/\s+/);
          normalizedDate = `${yyyy}-${mm}-${dd}`;
        }
        // YYYY/MM/DD or YYYY-MM-DD already OK
        else if (/^\d{4}[\/\-]\d{2}[\/\-]\d{2}$/.test(normalizedDate)) {
          normalizedDate = normalizedDate.replace(/\//g, '-');
        }

        // Step 1: Create patient
        const patientRes = await fetch('http://localhost:8000/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: row.nom,
            prenom: row.prenom,
            date_naissance: normalizedDate,
            sexe: normalizedSexe,
            telephone: row.telephone || null,
            email: row.email || null,
            ville: row.ville || null,
            consentement_rgpd: 1,
          }),
        });
        if (!patientRes.ok) {
          failed++;
          errors.push(`${row.nom} ${row.prenom}: erreur création patient`);
          continue;
        }
        const patient = await patientRes.json();

        // ── Helper: parse AV values like "6 oct" → 0.6, "10 oct" → 1.0, or plain "0.8" → 0.8
        const parseAV = (val) => {
          if (!val || val === '') return null;
          const s = val.toString().trim().toLowerCase();
          // Format "X oct" or "X/10" → value / 10
          const octMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:oct|dixième|dixiemes?|\/\s*10)/);
          if (octMatch) {
            const v = parseFloat(octMatch[1]) / 10;
            return isNaN(v) ? null : v;
          }
          // Fraction like "6/10"
          const fracMatch = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
          if (fracMatch) {
            const v = parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]);
            return isNaN(v) ? null : v;
          }
          const v = parseFloat(s);
          return isNaN(v) ? null : v;
        };

        // Step 2: Create examen with all clinical data
        const examenData = {
          patient_id: patient.patient_id,
          praticien: row.praticien || 'Import CSV',
          motif_consultation: row.motif_consultation || '',
          antecedents_oculaires: row.antecedents_oculaires || '',
          antecedents_generaux: row.antecedents_generaux || '',
          port_actuel: row.port_actuel || '',
          // AV (handle "6 oct" = 6/10 = 0.6 format)
          av_od_sc: parseAV(row.av_od_sc),
          av_og_sc: parseAV(row.av_og_sc),
          av_od_ac: parseAV(row.av_od_ac),
          av_og_ac: parseAV(row.av_og_ac),
          av_binoculaire: parseAV(row.av_binoculaire),
          // Autorefraction
          auto_od_sphere: safeFloat(row.auto_od_sphere),
          auto_od_cylindre: safeFloat(row.auto_od_cylindre),
          auto_od_axe: safeFloat(row.auto_od_axe),
          auto_og_sphere: safeFloat(row.auto_og_sphere),
          auto_og_cylindre: safeFloat(row.auto_og_cylindre),
          auto_og_axe: safeFloat(row.auto_og_axe),
          // Subjective refraction
          rx_od_sphere: safeFloat(row.rx_od_sphere),
          rx_od_cylindre: safeFloat(row.rx_od_cylindre),
          rx_od_axe: safeFloat(row.rx_od_axe),
          rx_od_addition: safeFloat(row.rx_od_addition),
          rx_og_sphere: safeFloat(row.rx_og_sphere),
          rx_og_cylindre: safeFloat(row.rx_og_cylindre),
          rx_og_axe: safeFloat(row.rx_og_axe),
          rx_og_addition: safeFloat(row.rx_og_addition),
          // Measures
          dp_od: safeFloat(row.dp_od),
          dp_og: safeFloat(row.dp_og),
          dp_binoculaire: safeFloat(row.dp_binoculaire),
          pio_od: safeFloat(row.pio_od),
          pio_og: safeFloat(row.pio_og),
          diagnostic: row.diagnostic || '',
          observations: row.observations || '',
        };

        const examenRes = await fetch('http://localhost:8000/api/examens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(examenData),
        });
        if (examenRes.ok) {
          success++;
        } else {
          failed++;
          errors.push(`${row.nom} ${row.prenom}: erreur création examen`);
        }
      } catch (err) {
        failed++;
        errors.push(`${row.nom} ${row.prenom}: ${err.message}`);
      }
    }

    setResult({ success, failed, errors });
    setImporting(false);
  }, [parsed]);

  const handleImportSimple = useCallback(async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);
    setResult(null);
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of parsed.rows) {
      try {
        const ametropies = parseSimpleAmetropies(row);
        const anomalies = parseSimpleAnomalies(row);

        const payload = {
          age: parseInt(row.age),
          sexe: row.sexe || 'Homme',
          ametropie: ametropies.join(', '),
          anomalies: anomalies.join(', ') || null,
          acuite_visuelle: (row.acuite_visuelle || '').trim() || null,
          statut_refractif: row.statut_refractif || (ametropies.length > 0 ? 'Non emmetrope' : 'Emmetrope'),
        };

        const res = await fetch('http://localhost:8000/api/bilans-simples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          success++;
        } else {
          failed++;
          const err = await res.json().catch(() => ({}));
          errors.push(`Ligne ${success + failed}: ${err.detail || 'erreur serveur'}`);
        }
      } catch (err) {
        failed++;
        errors.push(`Ligne ${success + failed}: ${err.message}`);
      }
    }

    setResult({ success, failed, errors });
    setImporting(false);
  }, [parsed]);

  const handleReset = () => {
    setFile(null);
    setParsed(null);
    setValidations([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const errorCount = validations.filter((v) => v.level === 'error').length;
  const warningCount = validations.filter((v) => v.level === 'warning').length;

  const handleDownloadTemplate = () => {
    const cols = importMode === 'simple' ? EXPECTED_COLUMNS_SIMPLE : EXPECTED_COLUMNS;
    const csv = cols.join(';') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = importMode === 'simple' ? 'bilans_simples_template.csv' : 'bbadata_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSwitchMode = (mode) => {
    setImportMode(mode);
    setFile(null);
    setParsed(null);
    setValidations([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const activeColumns = importMode === 'simple' ? EXPECTED_COLUMNS_SIMPLE : EXPECTED_COLUMNS;
  const activeRequired = importMode === 'simple' ? REQUIRED_COLUMNS_SIMPLE : REQUIRED_COLUMNS;

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Import CSV
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            {importMode === 'simple'
              ? 'Import de bilans simplifiés – Dépistage rapide (âge, amétropie, anomalies...)'
              : 'Module de transfert – Passerelle CSV entre la collecte web et l\'analyse statistique'}
          </p>
        </div>
        <Button variant="secondary" icon={Download} size="sm" onClick={handleDownloadTemplate}>
          Télécharger template
        </Button>
      </div>

      {/* ─── Mode Tabs ────────────────────────────────────── */}
      <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => handleSwitchMode('complet')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            importMode === 'complet'
              ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Bilan Optométrique
        </button>
        <button
          type="button"
          onClick={() => handleSwitchMode('simple')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            importMode === 'simple'
              ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Bilan Simplifié
        </button>
      </div>

      {/* ─── Upload Zone ──────────────────────────────────── */}
      <Card title="Fichier CSV" description="Glissez ou sélectionnez un fichier de bilans" icon={FileSpreadsheet}>
        <div className="mt-3">
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-neutral-50 dark:bg-neutral-800/50"
          >
            <Upload size={32} className="text-neutral-400 dark:text-neutral-500 mb-2" />
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              {file ? file.name : 'Cliquez ou glissez un fichier .csv'}
            </span>
            {file && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                {(file.size / 1024).toFixed(1)} Ko
              </span>
            )}
            <input
              id="csv-upload"
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFile}
            />
          </label>
        </div>
      </Card>

      {/* ─── Validation Results ───────────────────────────── */}
      {parsed && (
        <Card
          title="Validation des données"
          description={`${parsed.rows.length} lignes détectées – ${activeColumns.length} colonnes attendues`}
          icon={Eye}
        >
          <div className="mt-3 space-y-3">
            {/* Column mapping status */}
            <div className="flex flex-wrap gap-2">
              {activeColumns.slice(0, 15).map((col) => {
                const found = parsed.headers.includes(col);
                return (
                  <span
                    key={col}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      found
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {found ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {col}
                  </span>
                );
              })}
              {activeColumns.length > 15 && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500 self-center">
                  +{activeColumns.length - 15} autres colonnes...
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={14} /> {parsed.rows.length} lignes valides
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle size={14} /> {errorCount} erreurs
                </span>
              )}
              {warningCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={14} /> {warningCount} alertes PIO/AV
                </span>
              )}
            </div>

            {/* Parse errors */}
            {parsed.parseErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Erreurs de format :</p>
                {parsed.parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                ))}
              </div>
            )}

            {/* Validation warnings */}
            {validations.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {validations.slice(0, 20).map((v, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                      v.level === 'error'
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    }`}
                  >
                    {v.level === 'error' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                    Ligne {v.line} – {v.msg}
                  </div>
                ))}
                {validations.length > 20 && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    +{validations.length - 20} autres alertes...
                  </p>
                )}
              </div>
            )}

            {/* Preview table */}
            {parsed.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-1.5 px-2 text-left text-neutral-500 dark:text-neutral-400 font-semibold">#</th>
                      {parsed.headers.slice(0, 8).map((h) => (
                        <th key={h} className="py-1.5 px-2 text-left text-neutral-500 dark:text-neutral-400 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {parsed.rows.slice(0, previewRows).map((row, i) => (
                      <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                        <td className="py-1 px-2 text-neutral-400">{i + 1}</td>
                        {parsed.headers.slice(0, 8).map((h) => (
                          <td key={h} className="py-1 px-2 text-neutral-700 dark:text-neutral-300 max-w-30 truncate">
                            {row[h] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > previewRows && (
                  <button
                    onClick={() => setPreviewRows((p) => p + 10)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    Afficher plus ({parsed.rows.length - previewRows} restants)
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Import Result ────────────────────────────────── */}
      {result && (
        <Card title="Résultat de l'import" icon={result.failed === 0 ? CheckCircle2 : AlertTriangle}>
          <div className="mt-2 space-y-2">
            <div className="flex gap-4">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ {result.success} bilans importés
              </span>
              {result.failed > 0 && (
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  ✗ {result.failed} échecs
                </span>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Actions ──────────────────────────────────────── */}
      {parsed && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            icon={Upload}
            onClick={importMode === 'simple' ? handleImportSimple : handleImport}
            isLoading={importing}
            disabled={!parsed.rows.length || errorCount > 0}
          >
            Importer {parsed.rows.length} {importMode === 'simple' ? 'bilans simplifiés' : 'bilans'}
          </Button>
          <Button variant="ghost" icon={Trash2} onClick={handleReset}>
            Réinitialiser
          </Button>
        </div>
      )}

      {/* ─── Info Panel ───────────────────────────────────── */}
      <Card title="Format CSV attendu" description="Spécifications du fichier d'import" icon={FileSpreadsheet}>
        <div className="mt-2 space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
          <p><strong>Séparateur :</strong> point-virgule (;) ou virgule (,) – détection automatique</p>
          <p><strong>Encodage :</strong> UTF-8</p>
          <p><strong>Colonnes requises :</strong> {activeRequired.join(', ')}</p>
          {importMode === 'simple' ? (
            <>
              <p><strong>Colonnes :</strong> {EXPECTED_COLUMNS_SIMPLE.join(', ')}</p>
              <p><strong>Amétropies valides :</strong> {VALID_AMETROPIES.join(', ')} (séparées par virgule si multiples)</p>
              <p><strong>Anomalies valides :</strong> {VALID_ANOMALIES.join(', ')} (séparées par virgule si multiples)</p>
              <p><strong>Statut réfractif :</strong> non requis dans le CSV simplifié, inféré automatiquement à l'import</p>
              <p><strong>Sexe :</strong> Homme, Femme</p>
              <div className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg font-mono text-[11px]">
                <p className="text-neutral-600 dark:text-neutral-300 mb-1">Exemple :</p>
                <p>"age";"sexe";"ametropie";"anomalies";"acuite_visuelle";"ametropie_myopie";"ametropie_hypermetropie";"ametropie_astigmatisme";"anomalie_insuffisance_accommodation";"anomalie_exces_accommodation";"anomalie_fatigue_accommodative";"anomalie_spasme_accommodatif";"anomalie_inertie_accommodative";"anomalie_paralysie_accommodative";"anomalie_insuffisance_convergence";"anomalie_pseudo_insuffisance_convergence";"anomalie_exces_convergence";"anomalie_insuffisance_convergence_pure";"anomalie_esophorie_basique";"anomalie_insuffisance_divergence";"anomalie_exophorie_basique";"anomalie_exces_divergence";"anomalie_phorie_verticale_hyper_d_g";"anomalie_phorie_verticale_hyper_g_d";"anomalie_paralysie_oculomotrice";"anomalie_dysfonctionnement_vergentiel";"anomalie_reserves_fusionnelles_reduites";"anomalie_pas_d_anomalie"</p>
                <p>25;"Homme";"Hypermétropie";"Insuffisance d'accommodation, Excès d'accommodation";"6/10";0;1;0;1;1;0;0;1;0;1;1;0;0;1;0;1;0;1;0;0;1;0;0</p>
              </div>
            </>
          ) : (
            <>
              <p><strong>Colonnes optionnelles :</strong> {EXPECTED_COLUMNS.filter(c => !REQUIRED_COLUMNS.includes(c)).slice(0, 10).join(', ')}...</p>
              <p><strong>Anonymisation :</strong> Conformément à la Déclaration d'Helsinki, les données nominatives ne sont utilisées que pour le suivi clinique. L'export statistique anonymise toutes les informations.</p>
              <p><strong>Calculs automatiques :</strong> Équivalent sphérique (ES = SPH + CYL/2), classification des amétropies (ISO 13666:2019), alertes PIO (&gt; 21 mmHg, AAO PPP).</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
