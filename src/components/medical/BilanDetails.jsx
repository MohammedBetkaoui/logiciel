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
  const urgenceConfig = {
    0: { label: 'Routine', color: '#6b7280', bg: '#f3f4f6' },
    1: { label: 'Surveillance', color: '#2563eb', bg: '#eff6ff' },
    2: { label: 'Référé', color: '#d97706', bg: '#fffbeb' },
    3: { label: 'Urgence', color: '#dc2626', bg: '#fef2f2' },
  };
  const urg = urgenceConfig[bilan.niveau_urgence ?? 0] || urgenceConfig[0];

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan Optométrique – ${bilan.nom} ${bilan.prenom}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10px; color: #1e293b; background: #fff;
      padding: 0; line-height: 1.45;
    }
    .page { padding: 14mm 16mm 20mm; position: relative; min-height: 100vh; }

    /* ── Bande latérale décorative ── */
    .side-band {
      position: fixed; top: 0; left: 0; width: 5px; height: 100%;
      background: linear-gradient(180deg, #1e40af, #3b82f6, #93c5fd);
    }

    /* ── En-tête ── */
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 14px; margin-bottom: 16px;
      border-bottom: 2.5px solid #1e40af;
    }
    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo {
      width: 48px; height: 48px; border-radius: 10px;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 16px; letter-spacing: -0.5px;
      box-shadow: 0 2px 8px rgba(30,64,175,0.25);
    }
    .header-text h1 {
      font-size: 18px; font-weight: 800; color: #0f172a;
      letter-spacing: -0.3px; line-height: 1.2;
    }
    .header-text .subtitle {
      font-size: 9px; color: #64748b; font-weight: 500;
      margin-top: 2px; letter-spacing: 0.3px;
    }
    .header-meta { text-align: right; }
    .header-meta .doc-type {
      font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px;
      color: #1e40af; font-weight: 700; margin-bottom: 4px;
    }
    .header-meta .ref-number {
      font-size: 20px; font-weight: 800; color: #0f172a;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .header-meta .date-line {
      font-size: 9px; color: #64748b; margin-top: 3px;
    }

    /* ── Bandeau patient ── */
    .patient-banner {
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 1px solid #bae6fd; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 16px;
    }
    .patient-info { display: flex; align-items: center; gap: 12px; }
    .patient-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 700; font-size: 15px;
    }
    .patient-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .patient-details { font-size: 9px; color: #475569; margin-top: 2px; }
    .urgence-badge {
      padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* ── Sections ── */
    .section {
      margin-bottom: 14px; border: 1px solid #e2e8f0;
      border-radius: 8px; overflow: hidden;
    }
    .section-header {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: #1e40af; background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-header .badge {
      margin-left: auto; font-size: 7px; padding: 2px 7px;
      background: #dbeafe; color: #1e40af; border-radius: 10px;
      font-weight: 600; letter-spacing: 0.3px;
    }
    .section-body { padding: 12px 14px; }

    /* ── Tableaux de données ── */
    table.data-table {
      width: 100%; border-collapse: collapse; font-size: 10px;
    }
    table.data-table th {
      background: #f1f5f9; color: #64748b; font-size: 8px;
      text-transform: uppercase; letter-spacing: 0.8px; font-weight: 600;
      padding: 6px 10px; text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    table.data-table td {
      padding: 7px 10px; border-bottom: 1px solid #f1f5f9;
      font-weight: 500;
    }
    table.data-table tr:last-child td { border-bottom: none; }
    table.data-table .mono {
      font-family: 'Consolas', 'Courier New', monospace;
      font-weight: 600; letter-spacing: 0.3px;
    }
    table.data-table .alert { color: #dc2626; font-weight: 700; }
    table.data-table .eye-label {
      font-weight: 700; font-size: 9px; padding: 5px 10px;
    }
    table.data-table .eye-od { color: #1e40af; background: #eff6ff; }
    table.data-table .eye-og { color: #047857; background: #ecfdf5; }

    /* ── Grille simple ── */
    .field-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .field-grid-2 { grid-template-columns: repeat(2, 1fr); }
    .field-grid-6 { grid-template-columns: repeat(6, 1fr); }
    .field-card {
      padding: 7px 10px; background: #f8fafc;
      border: 1px solid #f1f5f9; border-radius: 6px;
    }
    .field-card .label {
      font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.6px;
      color: #94a3b8; font-weight: 600; margin-bottom: 3px;
    }
    .field-card .value {
      font-size: 11px; font-weight: 600; color: #0f172a;
    }
    .field-card .value.mono {
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .field-card .value.alert { color: #dc2626; }

    /* ── Alerte clinique ── */
    .clinical-alert {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 14px; background: #fffbeb;
      border: 1px solid #fcd34d; border-left: 4px solid #f59e0b;
      border-radius: 6px; margin-top: 12px;
    }
    .clinical-alert .alert-icon {
      width: 20px; height: 20px; border-radius: 50%;
      background: #fef3c7; display: flex; align-items: center;
      justify-content: center; font-size: 11px; flex-shrink: 0; margin-top: 1px;
    }
    .clinical-alert .alert-title {
      font-size: 9px; font-weight: 700; color: #92400e;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .clinical-alert .alert-text {
      font-size: 10px; color: #78350f; margin-top: 2px; line-height: 1.5;
    }

    /* ── Conclusion ── */
    .conclusion-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
    }
    .conclusion-box {
      padding: 10px 14px; background: #f8fafc;
      border: 1px solid #e2e8f0; border-radius: 6px;
    }
    .conclusion-box .box-label {
      font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px;
      color: #64748b; font-weight: 600; margin-bottom: 4px;
    }
    .conclusion-box .box-value {
      font-size: 10px; color: #0f172a; font-weight: 500; line-height: 1.5;
    }

    /* ── Pied de page ── */
    .footer-area {
      position: absolute; bottom: 14mm; left: 16mm; right: 16mm;
    }
    .footer-line {
      display: flex; justify-content: space-between; align-items: flex-end;
      padding-top: 10px; border-top: 1.5px solid #e2e8f0;
    }
    .footer-left { font-size: 7.5px; color: #94a3b8; line-height: 1.6; }
    .footer-left .brand { font-weight: 700; color: #64748b; }
    .footer-right { text-align: right; }
    .footer-right .hash {
      font-family: 'Consolas', monospace; font-size: 7px;
      color: #94a3b8; background: #f8fafc; padding: 3px 8px;
      border-radius: 4px; border: 1px solid #f1f5f9;
    }
    .footer-right .standards {
      font-size: 7px; color: #94a3b8; margin-top: 4px;
    }

    /* ── Estampille ── */
    .stamp {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border: 1.5px solid #cbd5e1;
      border-radius: 4px; font-size: 7px; color: #64748b;
      font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;
    }
    .stamp-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #22c55e;
    }

    @media print {
      .page { padding: 10mm 14mm 18mm; }
      .side-band { display: none; }
    }
  </style>
</head>
<body>
  <div class="side-band"></div>
  <div class="page">

    <!-- ═══ EN-TÊTE ═══ -->
    <div class="header">
      <div class="header-brand">
        <div class="header-logo">BBA</div>
        <div class="header-text">
          <h1>Bilan Optométrique</h1>
          <div class="subtitle">Institut BBA &nbsp;·&nbsp; Système Digital d'Analyse Statistique des Bilans Optométriques</div>
        </div>
      </div>
      <div class="header-meta">
        <div class="doc-type">Rapport d'Examen</div>
        <div class="ref-number">#${String(bilan.examen_id).padStart(4, '0')}</div>
        <div class="date-line">${fmtDate(bilan.date_examen)}</div>
        <div class="date-line">Praticien : <strong>${bilan.praticien || '—'}</strong></div>
      </div>
    </div>

    <!-- ═══ BANDEAU PATIENT ═══ -->
    <div class="patient-banner">
      <div class="patient-info">
        <div class="patient-avatar">${(bilan.nom?.[0] || '?').toUpperCase()}</div>
        <div>
          <div class="patient-name">${bilan.nom || '—'} ${bilan.prenom || ''}</div>
          <div class="patient-details">
            Né(e) le ${bilan.date_naissance || '—'} &nbsp;·&nbsp; Sexe : ${bilan.sexe || '—'}
          </div>
        </div>
      </div>
      <span class="urgence-badge" style="background:${urg.bg}; color:${urg.color}; border:1px solid ${urg.color}30;">
        ● &nbsp;${urg.label}
      </span>
    </div>

    <!-- ═══ ACUITÉ VISUELLE ═══ -->
    <div class="section">
      <div class="section-header">
        <span>👁 &nbsp;Acuité Visuelle</span>
        <span class="badge">ISO 8596</span>
      </div>
      <div class="section-body">
        <table class="data-table">
          <thead>
            <tr>
              <th></th><th>sans correction</th><th>avec correction</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="eye-label eye-od">Œil Droit (OD)</td>
              <td class="mono">${fmt(bilan.av_od_sc)}</td>
              <td class="mono">${fmt(bilan.av_od_ac)}</td>
            </tr>
            <tr>
              <td class="eye-label eye-og">Œil Gauche (OG)</td>
              <td class="mono">${fmt(bilan.av_og_sc)}</td>
              <td class="mono">${fmt(bilan.av_og_ac)}</td>
            </tr>
            <tr>
              <td style="font-weight:600; color:#475569;">AV Binoculaire</td>
              <td class="mono" colspan="2">${fmt(bilan.av_binoculaire)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ RÉFRACTION OBJECTIVE ═══ -->
    <div class="section">
      <div class="section-header">
        <span>🔬 &nbsp;Réfraction Objective</span>
        <span class="badge">Autoréfractomètre</span>
      </div>
      <div class="section-body">
        <table class="data-table">
          <thead>
            <tr><th></th><th>Sphère</th><th>Cylindre</th><th>Axe</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="eye-label eye-od">OD</td>
              <td class="mono">${fmtSphere(bilan.auto_od_sphere)}</td>
              <td class="mono">${fmtSphere(bilan.auto_od_cylindre)}</td>
              <td class="mono">${fmt(bilan.auto_od_axe, '°')}</td>
            </tr>
            <tr>
              <td class="eye-label eye-og">OG</td>
              <td class="mono">${fmtSphere(bilan.auto_og_sphere)}</td>
              <td class="mono">${fmtSphere(bilan.auto_og_cylindre)}</td>
              <td class="mono">${fmt(bilan.auto_og_axe, '°')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ RÉFRACTION SUBJECTIVE ═══ -->
    <div class="section">
      <div class="section-header">
        <span>📋 &nbsp;Réfraction Subjective – Prescription</span>
        <span class="badge">ISO 13666</span>
      </div>
      <div class="section-body">
        <table class="data-table">
          <thead>
            <tr><th></th><th>Sphère</th><th>Cylindre</th><th>Axe</th><th>Addition</th><th>Prisme</th><th>Base</th></tr>
          </thead>
          <tbody>
            <tr>
              <td class="eye-label eye-od">OD</td>
              <td class="mono">${fmtSphere(bilan.rx_od_sphere)}</td>
              <td class="mono">${fmtSphere(bilan.rx_od_cylindre)}</td>
              <td class="mono">${fmt(bilan.rx_od_axe, '°')}</td>
              <td class="mono">${fmtSphere(bilan.rx_od_addition)}</td>
              <td class="mono">${fmt(bilan.rx_od_prisme, ' Δ')}</td>
              <td>${fmt(bilan.rx_od_base_prisme)}</td>
            </tr>
            <tr>
              <td class="eye-label eye-og">OG</td>
              <td class="mono">${fmtSphere(bilan.rx_og_sphere)}</td>
              <td class="mono">${fmtSphere(bilan.rx_og_cylindre)}</td>
              <td class="mono">${fmt(bilan.rx_og_axe, '°')}</td>
              <td class="mono">${fmtSphere(bilan.rx_og_addition)}</td>
              <td class="mono">${fmt(bilan.rx_og_prisme, ' Δ')}</td>
              <td>${fmt(bilan.rx_og_base_prisme)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ MESURES COMPLÉMENTAIRES ═══ -->
    <div class="section">
      <div class="section-header">
        <span>📐 &nbsp;Distances Pupillaires & Pression Intraoculaire</span>
      </div>
      <div class="section-body">
        <div class="field-grid field-grid-6">
          <div class="field-card"><div class="label">DP OD</div><div class="value mono">${fmt(bilan.dp_od, ' mm')}</div></div>
          <div class="field-card"><div class="label">DP OG</div><div class="value mono">${fmt(bilan.dp_og, ' mm')}</div></div>
          <div class="field-card"><div class="label">DP Binoculaire</div><div class="value mono">${fmt(bilan.dp_binoculaire, ' mm')}</div></div>
          <div class="field-card"><div class="label">PIO OD</div><div class="value mono ${bilan.pio_od > 21 ? 'alert' : ''}">${fmt(bilan.pio_od, ' mmHg')}</div></div>
          <div class="field-card"><div class="label">PIO OG</div><div class="value mono ${bilan.pio_og > 21 ? 'alert' : ''}">${fmt(bilan.pio_og, ' mmHg')}</div></div>
          <div class="field-card"><div class="label">Méthode PIO</div><div class="value">${fmt(bilan.methode_pio)}</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ VISION BINOCULAIRE ═══ -->
    <div class="section">
      <div class="section-header">
        <span>🔍 &nbsp;Vision Binoculaire & Examens Complémentaires</span>
      </div>
      <div class="section-body">
        <div class="field-grid">
          <div class="field-card"><div class="label">Motilité oculaire</div><div class="value">${fmt(bilan.motilite_oculaire)}</div></div>
          <div class="field-card"><div class="label">Cover Test</div><div class="value">${fmt(bilan.cover_test)}</div></div>
          <div class="field-card"><div class="label">Test couleurs</div><div class="value">${fmt(bilan.test_couleurs)}</div></div>
          <div class="field-card"><div class="label">Fond d'œil</div><div class="value">${fmt(bilan.fond_oeil)}</div></div>
          <div class="field-card"><div class="label">Biomicroscopie</div><div class="value">${fmt(bilan.biomicroscopie)}</div></div>
          <div class="field-card"><div class="label">Champ visuel</div><div class="value">${fmt(bilan.champ_visuel)}</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ CONCLUSION ═══ -->
    <div class="section">
      <div class="section-header">
        <span>📝 &nbsp;Diagnostic & Conclusion</span>
      </div>
      <div class="section-body">
        <div class="conclusion-grid">
          <div class="conclusion-box">
            <div class="box-label">Diagnostic</div>
            <div class="box-value">${fmt(bilan.diagnostic)}</div>
          </div>
          <div class="conclusion-box">
            <div class="box-label">Observations</div>
            <div class="box-value">${fmt(bilan.observations)}</div>
          </div>
        </div>
        ${bilan.alerte_clinique ? `
        <div class="clinical-alert">
          <div class="alert-icon">⚠</div>
          <div>
            <div class="alert-title">Alerte Clinique</div>
            <div class="alert-text">${bilan.alerte_clinique}</div>
          </div>
        </div>` : ''}
      </div>
    </div>

    <!-- ═══ PIED DE PAGE ═══ -->
    <div class="footer-area">
      <div class="footer-line">
        <div class="footer-left">
          <span class="brand">BBA-Data</span> — Institut BBA · Bilan #${String(bilan.examen_id).padStart(4, '0')}<br>
          Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}<br>
          Ce document est confidentiel. Toute reproduction ou diffusion non autorisée est interdite.<br>
          Données traitées conformément à la Déclaration d'Helsinki et au RGPD (UE 2016/679).
        </div>
        <div class="footer-right">
          <div class="stamp"><div class="stamp-dot"></div>Document vérifié</div>
          <div class="hash" style="margin-top:6px;">SHA-256 : ${bilan.signature_hash?.slice(0, 24) || 'N/A'}</div>
          <div class="standards">ISO 13666 · ISO 8596 · RGPD · CEI 62304</div>
        </div>
      </div>
    </div>

  </div>
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
