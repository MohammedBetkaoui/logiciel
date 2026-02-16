// ─────────────────────────────────────────────────────────────────
// BBA-Data – Détails Bilan Optométrique (Lecture seule + Export PDF)
// Conforme ISO 13666 / ISO 8596
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  ArrowLeft, FileDown, Download, Printer, Eye, Glasses, Move,
  User, Calendar, AlertTriangle, CheckCircle, Shield,
  Activity, Clock, FileText, Loader2,
} from 'lucide-react';

// ─── Utilitaires d'affichage ─────────────────────────────────
function fmt(val, suffix = '') {
  if (val === null || val === undefined || val === '') return '—';
  return `${val}${suffix}`;
}

function fmtSphere(val) {
  if (val === null || val === undefined) return '—';
  return val > 0 ? `+${Number(val).toFixed(2)} D` : `${Number(val).toFixed(2)} D`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

// ─── Composants d'affichage ──────────────────────────────────
function DataField({ label, value, highlight, mono }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`text-sm font-medium ${
          highlight
            ? 'text-red-600 dark:text-red-400 font-bold'
            : 'text-neutral-800 dark:text-neutral-100'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, badge }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100 dark:border-neutral-700 mb-4">
      <Icon size={18} className="text-blue-500" />
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{title}</h3>
      {badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
          {badge}
        </span>
      )}
    </div>
  );
}

function UrgenceBadge({ niveau }) {
  const config = {
    0: { label: 'Routine', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300', icon: CheckCircle },
    1: { label: 'Surveillance', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Eye },
    2: { label: 'Référé', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
    3: { label: 'Urgence', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
  };
  const c = config[niveau] || config[0];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
      <Icon size={13} /> {c.label}
    </span>
  );
}

// ─── Export PDF (via impression navigateur) ───────────────────
function generatePrintContent(bilan) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan Optométrique – ${bilan.nom} ${bilan.prenom}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20mm; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    h2 { font-size: 13px; color: #2563eb; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
    .header-right { text-align: right; font-size: 10px; color: #6b7280; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .field { padding: 6px 8px; background: #f9fafb; border-radius: 4px; }
    .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; margin-bottom: 2px; }
    .field-value { font-size: 11px; font-weight: 600; }
    .field-value.mono { font-family: 'Consolas', monospace; }
    .field-value.alert { color: #dc2626; }
    .eye-block { padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; }
    .eye-block h4 { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .eye-block.od h4 { color: #2563eb; }
    .eye-block.og h4 { color: #059669; }
    .alert-box { padding: 8px 12px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; margin-top: 8px; font-size: 10px; }
    .footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #9ca3af; display: flex; justify-content: space-between; }
    .conformity { font-size: 8px; color: #9ca3af; margin-top: 4px; }
    @media print { body { padding: 10mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Bilan Optométrique</h1>
      <p style="color:#6b7280">BBA-Data – Institut BBA – Analyse des bilans optométriques</p>
    </div>
    <div class="header-right">
      <p><strong>Date :</strong> ${fmtDate(bilan.date_examen)}</p>
      <p><strong>Praticien :</strong> ${bilan.praticien || '—'}</p>
      <p><strong>Réf :</strong> #${bilan.examen_id}</p>
    </div>
  </div>

  <h2>Patient</h2>
  <div class="grid">
    <div class="field"><div class="field-label">Nom</div><div class="field-value">${bilan.nom || '—'} ${bilan.prenom || ''}</div></div>
    <div class="field"><div class="field-label">Date de naissance</div><div class="field-value">${bilan.date_naissance || '—'}</div></div>
    <div class="field"><div class="field-label">Sexe</div><div class="field-value">${bilan.sexe || '—'}</div></div>
  </div>

  <h2>Acuité Visuelle (ISO 8596)</h2>
  <div class="grid">
    <div class="field"><div class="field-label">AV OD SC</div><div class="field-value">${fmt(bilan.av_od_sc)}</div></div>
    <div class="field"><div class="field-label">AV OG SC</div><div class="field-value">${fmt(bilan.av_og_sc)}</div></div>
    <div class="field"><div class="field-label">AV OD AC</div><div class="field-value">${fmt(bilan.av_od_ac)}</div></div>
    <div class="field"><div class="field-label">AV OG AC</div><div class="field-value">${fmt(bilan.av_og_ac)}</div></div>
    <div class="field"><div class="field-label">AV Binoculaire</div><div class="field-value">${fmt(bilan.av_binoculaire)}</div></div>
  </div>

  <h2>Réfraction Objective (Autoréfractomètre)</h2>
  <div class="grid-2">
    <div class="eye-block od">
      <h4>Œil Droit (OD)</h4>
      <div class="grid">
        <div class="field"><div class="field-label">SPH</div><div class="field-value mono">${fmtSphere(bilan.auto_od_sphere)}</div></div>
        <div class="field"><div class="field-label">CYL</div><div class="field-value mono">${fmtSphere(bilan.auto_od_cylindre)}</div></div>
        <div class="field"><div class="field-label">AXE</div><div class="field-value mono">${fmt(bilan.auto_od_axe, '°')}</div></div>
      </div>
    </div>
    <div class="eye-block og">
      <h4>Œil Gauche (OG)</h4>
      <div class="grid">
        <div class="field"><div class="field-label">SPH</div><div class="field-value mono">${fmtSphere(bilan.auto_og_sphere)}</div></div>
        <div class="field"><div class="field-label">CYL</div><div class="field-value mono">${fmtSphere(bilan.auto_og_cylindre)}</div></div>
        <div class="field"><div class="field-label">AXE</div><div class="field-value mono">${fmt(bilan.auto_og_axe, '°')}</div></div>
      </div>
    </div>
  </div>

  <h2>Réfraction Subjective (Prescription – ISO 13666)</h2>
  <div class="grid-2">
    <div class="eye-block od">
      <h4>Œil Droit (OD)</h4>
      <div class="grid">
        <div class="field"><div class="field-label">SPH</div><div class="field-value mono">${fmtSphere(bilan.rx_od_sphere)}</div></div>
        <div class="field"><div class="field-label">CYL</div><div class="field-value mono">${fmtSphere(bilan.rx_od_cylindre)}</div></div>
        <div class="field"><div class="field-label">AXE</div><div class="field-value mono">${fmt(bilan.rx_od_axe, '°')}</div></div>
        <div class="field"><div class="field-label">ADD</div><div class="field-value mono">${fmtSphere(bilan.rx_od_addition)}</div></div>
        <div class="field"><div class="field-label">Prisme</div><div class="field-value mono">${fmt(bilan.rx_od_prisme, ' Δ')}</div></div>
        <div class="field"><div class="field-label">Base</div><div class="field-value">${fmt(bilan.rx_od_base_prisme)}</div></div>
      </div>
    </div>
    <div class="eye-block og">
      <h4>Œil Gauche (OG)</h4>
      <div class="grid">
        <div class="field"><div class="field-label">SPH</div><div class="field-value mono">${fmtSphere(bilan.rx_og_sphere)}</div></div>
        <div class="field"><div class="field-label">CYL</div><div class="field-value mono">${fmtSphere(bilan.rx_og_cylindre)}</div></div>
        <div class="field"><div class="field-label">AXE</div><div class="field-value mono">${fmt(bilan.rx_og_axe, '°')}</div></div>
        <div class="field"><div class="field-label">ADD</div><div class="field-value mono">${fmtSphere(bilan.rx_og_addition)}</div></div>
        <div class="field"><div class="field-label">Prisme</div><div class="field-value mono">${fmt(bilan.rx_og_prisme, ' Δ')}</div></div>
        <div class="field"><div class="field-label">Base</div><div class="field-value">${fmt(bilan.rx_og_base_prisme)}</div></div>
      </div>
    </div>
  </div>

  <h2>Mesures Complémentaires</h2>
  <div class="grid">
    <div class="field"><div class="field-label">DP OD</div><div class="field-value mono">${fmt(bilan.dp_od, ' mm')}</div></div>
    <div class="field"><div class="field-label">DP OG</div><div class="field-value mono">${fmt(bilan.dp_og, ' mm')}</div></div>
    <div class="field"><div class="field-label">DP Bino</div><div class="field-value mono">${fmt(bilan.dp_binoculaire, ' mm')}</div></div>
    <div class="field"><div class="field-label">PIO OD</div><div class="field-value mono ${bilan.pio_od > 21 ? 'alert' : ''}">${fmt(bilan.pio_od, ' mmHg')}</div></div>
    <div class="field"><div class="field-label">PIO OG</div><div class="field-value mono ${bilan.pio_og > 21 ? 'alert' : ''}">${fmt(bilan.pio_og, ' mmHg')}</div></div>
    <div class="field"><div class="field-label">Méthode PIO</div><div class="field-value">${fmt(bilan.methode_pio)}</div></div>
  </div>

  <h2>Vision Binoculaire & Examens</h2>
  <div class="grid">
    <div class="field"><div class="field-label">Motilité</div><div class="field-value">${fmt(bilan.motilite_oculaire)}</div></div>
    <div class="field"><div class="field-label">Cover Test</div><div class="field-value">${fmt(bilan.cover_test)}</div></div>
    <div class="field"><div class="field-label">Test couleurs</div><div class="field-value">${fmt(bilan.test_couleurs)}</div></div>
    <div class="field"><div class="field-label">Fond d'œil</div><div class="field-value">${fmt(bilan.fond_oeil)}</div></div>
    <div class="field"><div class="field-label">Biomicroscopie</div><div class="field-value">${fmt(bilan.biomicroscopie)}</div></div>
    <div class="field"><div class="field-label">Champ visuel</div><div class="field-value">${fmt(bilan.champ_visuel)}</div></div>
  </div>

  <h2>Conclusion</h2>
  <div class="grid" style="grid-template-columns: 1fr 1fr;">
    <div class="field"><div class="field-label">Diagnostic</div><div class="field-value">${fmt(bilan.diagnostic)}</div></div>
    <div class="field"><div class="field-label">Observations</div><div class="field-value">${fmt(bilan.observations)}</div></div>
  </div>
  ${bilan.alerte_clinique ? `<div class="alert-box">⚠ <strong>Alerte :</strong> ${bilan.alerte_clinique}</div>` : ''}

  <div class="footer">
    <span>BBA-Data – Bilan #${bilan.examen_id} – Généré le ${new Date().toLocaleDateString('fr-FR')}</span>
    <span>Conforme ISO 13666 / ISO 8596 – RGPD</span>
  </div>
  <p class="conformity">Ce document est généré automatiquement par BBA-Data (Institut BBA). Les données sont anonymisées conformément à la Déclaration d'Helsinki et au RGPD (Règlement UE 2016/679). Hash d'intégrité : ${bilan.signature_hash || 'N/A'}</p>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function BilanDetails({ examenId, onBack }) {
  const [bilan, setBilan] = useState(null);
  const [analyse, setAnalyse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`http://localhost:8000/api/bilans/${examenId}`);
        if (!res.ok) throw new Error('Bilan non trouvé');
        const data = await res.json();
        setBilan(data.bilan);
        setAnalyse(data.analyse);
      } catch (e) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    }
    if (examenId) load();
  }, [examenId]);

  const handleExportPDF = () => {
    if (!bilan) return;
    const win = window.open('', '_blank');
    win.document.write(generatePrintContent(bilan));
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    if (!bilan) return;
    setIsDownloading(true);
    try {
      const container = document.createElement('div');
      container.innerHTML = generatePrintContent(bilan)
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/i, '')
        .replace(/<\/html>/i, '')
        .replace(/<head>[\s\S]*?<\/head>/i, '')
        .replace(/<\/?body[^>]*>/gi, '');
      // Apply inline styles from the template's <style>
      const styleMatch = generatePrintContent(bilan).match(/<style>([\s\S]*?)<\/style>/);
      if (styleMatch) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styleMatch[1];
        container.prepend(styleEl);
      }
      container.style.fontFamily = "'Segoe UI', Tahoma, sans-serif";
      container.style.fontSize = '11px';
      container.style.color = '#1a1a1a';
      container.style.padding = '12mm';

      const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `bilan_${bilan.examen_id}_${bilan.nom}_${bilan.prenom}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(opt).from(container).save();
    } catch (err) {
      console.error('Erreur génération PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-neutral-400">
        <Loader2 size={24} className="animate-spin mr-2" /> Chargement du bilan...
      </div>
    );
  }

  if (error || !bilan) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto text-red-400 mb-3" />
        <p className="text-sm text-red-500">{error || 'Bilan introuvable'}</p>
        <button onClick={onBack} className="mt-4 text-sm text-blue-600 hover:underline">
          ← Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait rounded-lg transition-colors shadow-sm"
          >
            {isDownloading ? (
              <><Loader2 size={15} className="animate-spin" /> Génération…</>
            ) : (
              <><Download size={15} /> Télécharger PDF</>
            )}
          </button>
         
          
        </div>
      </div>

      {/* ─── Titre ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              Bilan #{bilan.examen_id} – {bilan.nom} {bilan.prenom}
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5 flex items-center gap-2">
              <Calendar size={13} /> {fmtDate(bilan.date_examen)}
              <span className="text-neutral-300 dark:text-neutral-600">•</span>
              {bilan.praticien}
            </p>
          </div>
          <UrgenceBadge niveau={bilan.niveau_urgence ?? 0} />
        </div>
      </div>

      {/* ─── Analyse clinique (si disponible) ──────────────── */}
      {analyse && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Analyse Clinique Automatique</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-blue-500 dark:text-blue-400 uppercase tracking-wide text-[10px] font-medium">SE OD</p>
              <p className="font-mono font-bold text-blue-800 dark:text-blue-200">{analyse.sphere_equivalente_od?.toFixed(2) ?? '—'} D</p>
            </div>
            <div>
              <p className="text-blue-500 dark:text-blue-400 uppercase tracking-wide text-[10px] font-medium">SE OG</p>
              <p className="font-mono font-bold text-blue-800 dark:text-blue-200">{analyse.sphere_equivalente_og?.toFixed(2) ?? '—'} D</p>
            </div>
            <div>
              <p className="text-blue-500 dark:text-blue-400 uppercase tracking-wide text-[10px] font-medium">Classification OD</p>
              <p className="font-bold text-blue-800 dark:text-blue-200">{analyse.classification_od || '—'}</p>
            </div>
            <div>
              <p className="text-blue-500 dark:text-blue-400 uppercase tracking-wide text-[10px] font-medium">Classification OG</p>
              <p className="font-bold text-blue-800 dark:text-blue-200">{analyse.classification_og || '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Section: Acuité Visuelle ─────────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <SectionTitle icon={Eye} title="Acuité Visuelle" badge="ISO 8596" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <DataField label="AV OD SC" value={fmt(bilan.av_od_sc)} mono />
          <DataField label="AV OG SC" value={fmt(bilan.av_og_sc)} mono />
          <DataField label="AV OD AC" value={fmt(bilan.av_od_ac)} mono />
          <DataField label="AV OG AC" value={fmt(bilan.av_og_ac)} mono />
          <DataField label="AV Binoculaire" value={fmt(bilan.av_binoculaire)} mono />
        </div>
      </div>

      {/* ─── Section: Réfraction ──────────────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <SectionTitle icon={Glasses} title="Réfraction" badge="ISO 13666" />

        {/* Autoréfractomètre */}
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">Réfraction Objective</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg space-y-2">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="SPH" value={fmtSphere(bilan.auto_od_sphere)} mono />
              <DataField label="CYL" value={fmtSphere(bilan.auto_od_cylindre)} mono />
              <DataField label="AXE" value={fmt(bilan.auto_od_axe, '°')} mono />
            </div>
          </div>
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg space-y-2">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="SPH" value={fmtSphere(bilan.auto_og_sphere)} mono />
              <DataField label="CYL" value={fmtSphere(bilan.auto_og_cylindre)} mono />
              <DataField label="AXE" value={fmt(bilan.auto_og_axe, '°')} mono />
            </div>
          </div>
        </div>

        {/* Réfraction subjective */}
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">Réfraction Subjective (Prescription)</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg space-y-3">
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">Œil Droit (OD)</p>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="SPH" value={fmtSphere(bilan.rx_od_sphere)} mono />
              <DataField label="CYL" value={fmtSphere(bilan.rx_od_cylindre)} mono />
              <DataField label="AXE" value={fmt(bilan.rx_od_axe, '°')} mono />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="ADD" value={fmtSphere(bilan.rx_od_addition)} mono />
              <DataField label="Prisme" value={fmt(bilan.rx_od_prisme, ' Δ')} mono />
              <DataField label="Base" value={fmt(bilan.rx_od_base_prisme)} />
            </div>
          </div>
          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg space-y-3">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Œil Gauche (OG)</p>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="SPH" value={fmtSphere(bilan.rx_og_sphere)} mono />
              <DataField label="CYL" value={fmtSphere(bilan.rx_og_cylindre)} mono />
              <DataField label="AXE" value={fmt(bilan.rx_og_axe, '°')} mono />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <DataField label="ADD" value={fmtSphere(bilan.rx_og_addition)} mono />
              <DataField label="Prisme" value={fmt(bilan.rx_og_prisme, ' Δ')} mono />
              <DataField label="Base" value={fmt(bilan.rx_og_base_prisme)} />
            </div>
          </div>
        </div>

        {/* DP + PIO */}
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-3">Distances Pupillaires & PIO</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          <DataField label="DP OD" value={fmt(bilan.dp_od, ' mm')} mono />
          <DataField label="DP OG" value={fmt(bilan.dp_og, ' mm')} mono />
          <DataField label="DP Bino" value={fmt(bilan.dp_binoculaire, ' mm')} mono />
          <DataField label="PIO OD" value={fmt(bilan.pio_od, ' mmHg')} mono highlight={bilan.pio_od > 21} />
          <DataField label="PIO OG" value={fmt(bilan.pio_og, ' mmHg')} mono highlight={bilan.pio_og > 21} />
          <DataField label="Méthode" value={fmt(bilan.methode_pio)} />
        </div>
      </div>

      {/* ─── Section: Vision Binoculaire ──────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <SectionTitle icon={Move} title="Vision Binoculaire & Examens Complémentaires" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DataField label="Motilité oculaire" value={fmt(bilan.motilite_oculaire)} highlight={bilan.motilite_oculaire === 'Anormale'} />
          <DataField label="Cover Test" value={fmt(bilan.cover_test)} />
          <DataField label="Test couleurs" value={fmt(bilan.test_couleurs)} highlight={bilan.test_couleurs === 'Déficient'} />
          <DataField label="Fond d'œil" value={fmt(bilan.fond_oeil)} />
          <DataField label="Biomicroscopie" value={fmt(bilan.biomicroscopie)} />
          <DataField label="Champ visuel" value={fmt(bilan.champ_visuel)} highlight={bilan.champ_visuel !== 'Normal' && bilan.champ_visuel} />
        </div>
      </div>

      {/* ─── Section: Conclusion ──────────────────────────── */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5">
        <SectionTitle icon={FileText} title="Diagnostic & Conclusion" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataField label="Diagnostic" value={fmt(bilan.diagnostic)} />
          <DataField label="Observations" value={fmt(bilan.observations)} />
        </div>
        {bilan.alerte_clinique && (
          <div className="mt-4 flex items-start gap-2 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Alerte clinique</p>
              <p className="text-xs mt-0.5">{bilan.alerte_clinique}</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Footer technique ─────────────────────────────── */}
      <div className="flex items-center justify-between px-2 text-[10px] text-neutral-400 dark:text-neutral-500">
        <span className="flex items-center gap-1">
          <Shield size={10} /> Hash : {bilan.signature_hash?.slice(0, 16) || 'N/A'}…
        </span>
        <span>ISO 13666 · ISO 8596 · RGPD · CEI 62304</span>
      </div>
    </div>
  );
}
