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

// ─── Mapping colonnes CSV attendues ─────────────────────────
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

export default function ImportCSV() {
  const fileRef = useRef(null);
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
      // Validate all rows
      const allWarnings = rows.flatMap((row, i) => validateRow(row, i));
      setValidations(allWarnings);
    };
    reader.readAsText(f, 'utf-8');
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsed?.rows.length) return;
    setImporting(true);
    setResult(null);
    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of parsed.rows) {
      try {
        // Step 1: Create patient
        const patientRes = await fetch('http://localhost:8000/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: row.nom,
            prenom: row.prenom,
            date_naissance: row.date_naissance,
            sexe: row.sexe,
            telephone: row.telephone || null,
            email: row.email || null,
            ville: row.ville || null,
            consentement_rgpd: true,
          }),
        });
        if (!patientRes.ok) {
          failed++;
          errors.push(`${row.nom} ${row.prenom}: erreur création patient`);
          continue;
        }
        const patient = await patientRes.json();

        // Step 2: Create examen with all clinical data
        const examenData = {
          patient_id: patient.patient_id,
          praticien: row.praticien || 'Import CSV',
          motif_consultation: row.motif_consultation || '',
          antecedents_oculaires: row.antecedents_oculaires || '',
          antecedents_generaux: row.antecedents_generaux || '',
          port_actuel: row.port_actuel || '',
          // AV
          av_od_sc: parseFloat(row.av_od_sc) || null,
          av_og_sc: parseFloat(row.av_og_sc) || null,
          av_od_ac: parseFloat(row.av_od_ac) || null,
          av_og_ac: parseFloat(row.av_og_ac) || null,
          av_binoculaire: parseFloat(row.av_binoculaire) || null,
          // Autorefraction
          auto_od_sphere: parseFloat(row.auto_od_sphere) || null,
          auto_od_cylindre: parseFloat(row.auto_od_cylindre) || null,
          auto_od_axe: parseFloat(row.auto_od_axe) || null,
          auto_og_sphere: parseFloat(row.auto_og_sphere) || null,
          auto_og_cylindre: parseFloat(row.auto_og_cylindre) || null,
          auto_og_axe: parseFloat(row.auto_og_axe) || null,
          // Subjective refraction
          rx_od_sphere: parseFloat(row.rx_od_sphere) || null,
          rx_od_cylindre: parseFloat(row.rx_od_cylindre) || null,
          rx_od_axe: parseFloat(row.rx_od_axe) || null,
          rx_od_addition: parseFloat(row.rx_od_addition) || null,
          rx_og_sphere: parseFloat(row.rx_og_sphere) || null,
          rx_og_cylindre: parseFloat(row.rx_og_cylindre) || null,
          rx_og_axe: parseFloat(row.rx_og_axe) || null,
          rx_og_addition: parseFloat(row.rx_og_addition) || null,
          // Measures
          dp_od: parseFloat(row.dp_od) || null,
          dp_og: parseFloat(row.dp_og) || null,
          dp_binoculaire: parseFloat(row.dp_binoculaire) || null,
          pio_od: parseFloat(row.pio_od) || null,
          pio_og: parseFloat(row.pio_og) || null,
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
    const csv = EXPECTED_COLUMNS.join(';') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bbadata_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Import CSV
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Module de transfert – Passerelle CSV entre la collecte web et l'analyse statistique
          </p>
        </div>
        <Button variant="secondary" icon={Download} size="sm" onClick={handleDownloadTemplate}>
          Télécharger template
        </Button>
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
          description={`${parsed.rows.length} lignes détectées – ${EXPECTED_COLUMNS.length} colonnes attendues`}
          icon={Eye}
        >
          <div className="mt-3 space-y-3">
            {/* Column mapping status */}
            <div className="flex flex-wrap gap-2">
              {EXPECTED_COLUMNS.slice(0, 15).map((col) => {
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
              {EXPECTED_COLUMNS.length > 15 && (
                <span className="text-xs text-neutral-400 dark:text-neutral-500 self-center">
                  +{EXPECTED_COLUMNS.length - 15} autres colonnes...
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
                          <td key={h} className="py-1 px-2 text-neutral-700 dark:text-neutral-300 max-w-[120px] truncate">
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
            onClick={handleImport}
            isLoading={importing}
            disabled={!parsed.rows.length || errorCount > 0}
          >
            Importer {parsed.rows.length} bilans
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
          <p><strong>Colonnes requises :</strong> {REQUIRED_COLUMNS.join(', ')}</p>
          <p><strong>Colonnes optionnelles :</strong> {EXPECTED_COLUMNS.filter(c => !REQUIRED_COLUMNS.includes(c)).slice(0, 10).join(', ')}...</p>
          <p><strong>Anonymisation :</strong> Conformément à la Déclaration d'Helsinki, les données nominatives ne sont utilisées que pour le suivi clinique. L'export statistique anonymise toutes les informations.</p>
          <p><strong>Calculs automatiques :</strong> Équivalent sphérique (ES = SPH + CYL/2), classification des amétropies (ISO 13666:2019), alertes PIO (&gt; 21 mmHg, AAO PPP).</p>
        </div>
      </Card>
    </div>
  );
}
