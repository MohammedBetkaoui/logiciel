// ─────────────────────────────────────────────────────────────────
// BBA-Data – Analyse Statistique des Bilans Optométriques
// Prévalence des amétropies · Segmentation démographique
// Moyennes de réfraction · Classifications automatiques
// Conforme ISO 13666:2019 / AAO Preferred Practice Patterns
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Users,
  Eye,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
  X,
  Maximize2,
  Activity,
  Crosshair,
  Gauge,
  Glasses,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#64748b'];

// ─── Calcul Équivalent Sphérique (ISO 13666:2019) ───────────
function calcES(sph, cyl) {
  const s = parseFloat(sph);
  const c = parseFloat(cyl);
  if (isNaN(s)) return null;
  return +(s + (isNaN(c) ? 0 : c / 2)).toFixed(2);
}

function classifyAmetropie(es) {
  if (es === null) return 'Non classifié';
  if (es <= -6.0) return 'Myopie forte';
  if (es <= -3.0) return 'Myopie modérée';
  if (es < -0.5) return 'Myopie faible';
  if (es <= 0.5) return 'Emmétrope';
  if (es <= 2.0) return 'Hypermétropie faible';
  if (es <= 5.0) return 'Hypermétropie modérée';
  return 'Hypermétropie forte';
}

function classifyAstigmatisme(cyl) {
  const c = Math.abs(parseFloat(cyl));
  if (isNaN(c) || c < 0.5) return null;
  if (c < 1.0) return 'Léger';
  if (c < 2.0) return 'Modéré';
  return 'Fort';
}

function getTrancheAge(dateNaissance) {
  if (!dateNaissance) return 'Inconnu';
  const birth = new Date(dateNaissance);
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 86400000));
  if (age < 10) return '0-9 ans';
  if (age < 20) return '10-19 ans';
  if (age < 30) return '20-29 ans';
  if (age < 40) return '30-39 ans';
  if (age < 50) return '40-49 ans';
  if (age < 60) return '50-59 ans';
  return '60+ ans';
}

// ─── Tooltip personnalisé ────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-neutral-700 dark:text-neutral-200 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
          {entry.name}: <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
        </p>
      ))}
    </div>
  );
}

export default function StatisticalAnalysis({ targetCard, onTargetCardConsumed }) {
  const [bilans, setBilans] = useState([]);
  const [bilansSimples, setBilansSimples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('simple'); // 'complet' | 'simple'
  const [filter, setFilter] = useState({ sexe: 'all', tranche: 'all' });
  const [filterSimple, setFilterSimple] = useState({ sexe: 'all', tranche: 'all' });
  const [expandedCard, setExpandedCard] = useState(null);
  const modalRef = useRef(null);

  // Auto-expand card when navigated from guide page
  useEffect(() => {
    if (targetCard && !loading) {
      setExpandedCard(targetCard);
      if (onTargetCardConsumed) onTargetCardConsumed();
    }
  }, [targetCard, loading, onTargetCardConsumed]);

  // Scroll main container to top on open & lock scroll
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (expandedCard) {
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
        mainEl.style.overflow = 'hidden';
      }
      document.body.style.overflow = 'hidden';
    } else {
      if (mainEl) mainEl.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      if (mainEl) mainEl.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [expandedCard]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, resSimple] = await Promise.all([
        fetch('http://localhost:8000/api/bilans?limit=1000'),
        fetch('http://localhost:8000/api/bilans-simples?limit=1000'),
      ]);
      if (res.ok) {
        const data = await res.json();
        setBilans(data);
      }
      if (resSimple.ok) {
        const data = await resSimple.json();
        setBilansSimples(data);
      }
    } catch { /* backend offline */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Apply filters ──────────────────────────────────────
  const filtered = bilans.filter((b) => {
    if (filter.sexe !== 'all' && b.sexe !== filter.sexe) return false;
    if (filter.tranche !== 'all' && getTrancheAge(b.date_naissance) !== filter.tranche) return false;
    return true;
  });

  // ─── Computed statistics ────────────────────────────────
  const totalBilans = filtered.length;

  // Prevalence computation
  const prevalence = {};
  const astigmatismeCount = { Léger: 0, Modéré: 0, Fort: 0 };
  let presbyCount = 0;
  let pioAlertCount = 0;
  let totalES_OD = 0, totalES_OG = 0, countES = 0;
  let totalSPH_OD = 0, totalSPH_OG = 0, totalCYL_OD = 0, totalCYL_OG = 0, countRx = 0;

  for (const b of filtered) {
    const esOd = calcES(b.rx_od_sphere, b.rx_od_cylindre);
    const esOg = calcES(b.rx_og_sphere, b.rx_og_cylindre);
    const es = esOd !== null ? esOd : esOg;

    // Classification des amétropies
    const cls = classifyAmetropie(es);
    prevalence[cls] = (prevalence[cls] || 0) + 1;

    // Astigmatisme
    const astOd = classifyAstigmatisme(b.rx_od_cylindre);
    const astOg = classifyAstigmatisme(b.rx_og_cylindre);
    if (astOd) astigmatismeCount[astOd]++;
    if (astOg) astigmatismeCount[astOg]++;

    // Presbytie (addition > 0)
    if (parseFloat(b.rx_od_addition) > 0 || parseFloat(b.rx_og_addition) > 0) presbyCount++;

    // PIO alerts (AAO PPP: > 21 mmHg)
    if (parseFloat(b.pio_od) > 21 || parseFloat(b.pio_og) > 21) pioAlertCount++;

    // Averages
    if (esOd !== null && esOg !== null) {
      totalES_OD += esOd;
      totalES_OG += esOg;
      countES++;
    }
    if (b.rx_od_sphere != null) {
      totalSPH_OD += parseFloat(b.rx_od_sphere) || 0;
      totalSPH_OG += parseFloat(b.rx_og_sphere) || 0;
      totalCYL_OD += parseFloat(b.rx_od_cylindre) || 0;
      totalCYL_OG += parseFloat(b.rx_og_cylindre) || 0;
      countRx++;
    }
  }

  const avgES_OD = countES ? (totalES_OD / countES).toFixed(2) : '—';
  const avgES_OG = countES ? (totalES_OG / countES).toFixed(2) : '—';
  const avgSPH_OD = countRx ? (totalSPH_OD / countRx).toFixed(2) : '—';
  const avgSPH_OG = countRx ? (totalSPH_OG / countRx).toFixed(2) : '—';
  const avgCYL_OD = countRx ? (totalCYL_OD / countRx).toFixed(2) : '—';
  const avgCYL_OG = countRx ? (totalCYL_OG / countRx).toFixed(2) : '—';

  // Prevalence chart data
  const prevalenceData = Object.entries(prevalence)
    .map(([name, value]) => ({ name, value, pct: totalBilans ? ((value / totalBilans) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);

  // Demographics
  const demoMap = {};
  for (const b of filtered) {
    const t = getTrancheAge(b.date_naissance);
    demoMap[t] = (demoMap[t] || 0) + 1;
  }
  const demoData = Object.entries(demoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  // Gender distribution
  const genderMap = {};
  for (const b of filtered) {
    const s = b.sexe || 'Inconnu';
    genderMap[s] = (genderMap[s] || 0) + 1;
  }
  const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

  // Motif de consultation
  const motifMap = {};
  for (const b of filtered) {
    const m = b.motif_consultation || 'Non spécifié';
    motifMap[m] = (motifMap[m] || 0) + 1;
  }
  const motifData = Object.entries(motifMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // ─── NEW: Astigmatisme Pie Data ──────────────────────────
  const astigTotal = Object.values(astigmatismeCount).reduce((a, b) => a + b, 0);
  const astigPieData = Object.entries(astigmatismeCount)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, pct: astigTotal ? ((value / astigTotal) * 100).toFixed(1) : 0 }));

  // ─── NEW: PIO Distribution ──────────────────────────────
  const pioBuckets = { '< 10': 0, '10-15': 0, '15-18': 0, '18-21': 0, '21-25': 0, '25-30': 0, '> 30': 0 };
  for (const b of filtered) {
    for (const pio of [parseFloat(b.pio_od), parseFloat(b.pio_og)]) {
      if (isNaN(pio)) continue;
      if (pio < 10) pioBuckets['< 10']++;
      else if (pio < 15) pioBuckets['10-15']++;
      else if (pio < 18) pioBuckets['15-18']++;
      else if (pio < 21) pioBuckets['18-21']++;
      else if (pio < 25) pioBuckets['21-25']++;
      else if (pio < 30) pioBuckets['25-30']++;
      else pioBuckets['> 30']++;
    }
  }
  const pioDistData = Object.entries(pioBuckets)
    .map(([name, value]) => ({ name: `${name} mmHg`, value }))
    .filter((d) => d.value > 0);

  // ─── NEW: Acuité Visuelle moyenne SC vs AC ──────────────
  let sumAvOdSc = 0, sumAvOgSc = 0, sumAvOdAc = 0, sumAvOgAc = 0;
  let countAvSc = 0, countAvAc = 0;
  for (const b of filtered) {
    const odsc = parseFloat(b.av_od_sc), ogsc = parseFloat(b.av_og_sc);
    const odac = parseFloat(b.av_od_ac), ogac = parseFloat(b.av_og_ac);
    if (!isNaN(odsc) && !isNaN(ogsc)) { sumAvOdSc += odsc; sumAvOgSc += ogsc; countAvSc++; }
    if (!isNaN(odac) && !isNaN(ogac)) { sumAvOdAc += odac; sumAvOgAc += ogac; countAvAc++; }
  }
  const avData = [
    { name: 'OD SC', value: countAvSc ? +(sumAvOdSc / countAvSc).toFixed(2) : 0 },
    { name: 'OG SC', value: countAvSc ? +(sumAvOgSc / countAvSc).toFixed(2) : 0 },
    { name: 'OD AC', value: countAvAc ? +(sumAvOdAc / countAvAc).toFixed(2) : 0 },
    { name: 'OG AC', value: countAvAc ? +(sumAvOgAc / countAvAc).toFixed(2) : 0 },
  ];

  // ─── NEW: Anisométropie (diff ES OD-OG) ────────────────
  const anisoData = { 'Normal (< 1D)': 0, 'Légère (1-2D)': 0, 'Significative (> 2D)': 0 };
  let anisoCount = 0;
  for (const b of filtered) {
    const esOd = calcES(b.rx_od_sphere, b.rx_od_cylindre);
    const esOg = calcES(b.rx_og_sphere, b.rx_og_cylindre);
    if (esOd !== null && esOg !== null) {
      const diff = Math.abs(esOd - esOg);
      if (diff < 1) anisoData['Normal (< 1D)']++;
      else if (diff <= 2) anisoData['Légère (1-2D)']++;
      else { anisoData['Significative (> 2D)']++; anisoCount++; }
    }
  }
  const anisoChartData = Object.entries(anisoData)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);

  // ─── NEW: Presbytie par tranche d'âge ──────────────────
  const presbyByAge = {};
  for (const b of filtered) {
    const t = getTrancheAge(b.date_naissance);
    if (!presbyByAge[t]) presbyByAge[t] = { tranche: t, presbyte: 0, nonPresbye: 0 };
    if (parseFloat(b.rx_od_addition) > 0 || parseFloat(b.rx_og_addition) > 0) {
      presbyByAge[t].presbyte++;
    } else {
      presbyByAge[t].nonPresbye++;
    }
  }
  const presbyByAgeData = Object.values(presbyByAge).sort((a, b) => {
    const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
    return order.indexOf(a.tranche) - order.indexOf(b.tranche);
  });

  // ─── NEW: Distribution des axes de cylindre ────────────
  const axeBuckets = { '0-30°': 0, '31-60°': 0, '61-90°': 0, '91-120°': 0, '121-150°': 0, '151-180°': 0 };
  for (const b of filtered) {
    for (const axe of [parseInt(b.rx_od_axe), parseInt(b.rx_og_axe)]) {
      if (isNaN(axe)) continue;
      if (axe <= 30) axeBuckets['0-30°']++;
      else if (axe <= 60) axeBuckets['31-60°']++;
      else if (axe <= 90) axeBuckets['61-90°']++;
      else if (axe <= 120) axeBuckets['91-120°']++;
      else if (axe <= 150) axeBuckets['121-150°']++;
      else axeBuckets['151-180°']++;
    }
  }
  const axeData = Object.entries(axeBuckets).map(([subject, count]) => ({ subject, count }));

  // ═══════════════════════════════════════════════════════════
  // BILANS SIMPLIFIÉS – Computed statistics
  // ═══════════════════════════════════════════════════════════

  function getTrancheFromAge(age) {
    if (age == null) return 'Inconnu';
    if (age < 10) return '0-9 ans';
    if (age < 20) return '10-19 ans';
    if (age < 30) return '20-29 ans';
    if (age < 40) return '30-39 ans';
    if (age < 50) return '40-49 ans';
    if (age < 60) return '50-59 ans';
    return '60+ ans';
  }

  const filteredSimple = bilansSimples.filter((b) => {
    if (filterSimple.sexe !== 'all' && b.sexe !== filterSimple.sexe) return false;
    if (filterSimple.tranche !== 'all' && getTrancheFromAge(b.age) !== filterSimple.tranche) return false;
    return true;
  });

  const totalSimple = filteredSimple.length;

  // Amétropie distribution (multi-values comma separated)
  const sAmetropieMap = {};
  for (const b of filteredSimple) {
    if (b.ametropie) {
      for (const a of b.ametropie.split(',')) {
        const v = a.trim();
        if (v) sAmetropieMap[v] = (sAmetropieMap[v] || 0) + 1;
      }
    }
  }
  const sAmetropieData = Object.entries(sAmetropieMap)
    .map(([name, value]) => ({ name, value, pct: totalSimple ? ((value / totalSimple) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);

  // Anomalies distribution
  const sAnomaliesMap = {};
  for (const b of filteredSimple) {
    if (b.anomalies) {
      for (const a of b.anomalies.split(',')) {
        const v = a.trim();
        if (v && v !== 'Aucune') sAnomaliesMap[v] = (sAnomaliesMap[v] || 0) + 1;
      }
    }
  }
  const sAnomaliesData = Object.entries(sAnomaliesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Acuité visuelle distribution
  const sAcuiteMap = {};
  for (const b of filteredSimple) {
    if (b.acuite_visuelle) {
      sAcuiteMap[b.acuite_visuelle] = (sAcuiteMap[b.acuite_visuelle] || 0) + 1;
    }
  }
  const acuiteOrder = ['PL-', 'PL+', 'VBLM', 'CLD', '<1/10', '1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10'];
  const sAcuiteData = Object.entries(sAcuiteMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => acuiteOrder.indexOf(a.name) - acuiteOrder.indexOf(b.name));

  // Statut réfractif
  const sStatutMap = {};
  for (const b of filteredSimple) {
    if (b.statut_refractif) {
      sStatutMap[b.statut_refractif] = (sStatutMap[b.statut_refractif] || 0) + 1;
    }
  }
  const sStatutData = Object.entries(sStatutMap).map(([name, value]) => ({ name, value }));

  // Sexe distribution
  const sSexeMap = {};
  for (const b of filteredSimple) {
    const s = b.sexe || 'Inconnu';
    sSexeMap[s] = (sSexeMap[s] || 0) + 1;
  }
  const sSexeData = Object.entries(sSexeMap).map(([name, value]) => ({ name, value }));

  // Demographics by age
  const sDemoMap = {};
  for (const b of filteredSimple) {
    const t = getTrancheFromAge(b.age);
    sDemoMap[t] = (sDemoMap[t] || 0) + 1;
  }
  const sDemoData = Object.entries(sDemoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  // KPIs for simplified
  const sNonEmmetrope = sStatutMap['Non emmetrope'] || 0;
  const sAnomaliesCount = Object.values(sAnomaliesMap).reduce((a, b) => a + b, 0);
  const sAucuneAnomalie = filteredSimple.filter(b => !b.anomalies || b.anomalies.includes('Aucune')).length;

  // Available tranches for simple filter
  const availableTranchesSimple = [...new Set(bilansSimples.map((b) => getTrancheFromAge(b.age)))].sort((a, b) => {
    const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
    return order.indexOf(a) - order.indexOf(b);
  });

  // ═══════════════════════════════════════════════════════════
  // BILANS SIMPLIFIÉS – Statistiques basées sur les normes
  // ═══════════════════════════════════════════════════════════

  // ─── Classification déficience visuelle OMS (ISO 8596 / ICD-11 9D90) ───
  function acuiteToDecimal(avStr) {
    if (!avStr) return null;
    const av = avStr.trim();
    if (av === 'PL-') return 0.0;
    if (av === 'PL+') return 0.01;
    if (av === 'VBLM') return 0.02;
    if (av === 'CLD') return 0.04;
    if (av.includes('/')) {
      const parts = av.replace('<', '').split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    return null;
  }

  function classifierDeficienceOMS(decAv) {
    if (decAv === null) return 'Non classifié';
    if (decAv >= 0.8) return 'Normal (≥ 8/10)';
    if (decAv >= 0.5) return 'Déficience légère';
    if (decAv >= 0.3) return 'Déficience modérée';
    if (decAv >= 0.1) return 'Déficience sévère';
    if (decAv >= 0.05) return 'Cécité légale';
    return 'Cécité';
  }

  const sDeficienceMap = {};
  for (const b of filteredSimple) {
    const dec = acuiteToDecimal(b.acuite_visuelle);
    const cat = classifierDeficienceOMS(dec);
    sDeficienceMap[cat] = (sDeficienceMap[cat] || 0) + 1;
  }
  const deficienceOrder = ['Normal (≥ 8/10)', 'Déficience légère', 'Déficience modérée', 'Déficience sévère', 'Cécité légale', 'Cécité', 'Non classifié'];
  const sDeficienceData = Object.entries(sDeficienceMap)
    .map(([name, value]) => ({ name, value, pct: totalSimple ? ((value / totalSimple) * 100).toFixed(1) : 0 }))
    .sort((a, b) => deficienceOrder.indexOf(a.name) - deficienceOrder.indexOf(b.name));
  const deficienceColors = { 'Normal (≥ 8/10)': '#10b981', 'Déficience légère': '#f59e0b', 'Déficience modérée': '#f97316', 'Déficience sévère': '#ef4444', 'Cécité légale': '#dc2626', 'Cécité': '#991b1b', 'Non classifié': '#6b7280' };

  // ─── Amétropies par sexe (STROBE) ──────────────────────────
  const sAmetropieBySexe = {};
  for (const b of filteredSimple) {
    const s = b.sexe || 'Inconnu';
    if (b.ametropie) {
      for (const a of b.ametropie.split(',')) {
        const v = a.trim();
        if (v) {
          if (!sAmetropieBySexe[v]) sAmetropieBySexe[v] = {};
          sAmetropieBySexe[v][s] = (sAmetropieBySexe[v][s] || 0) + 1;
        }
      }
    }
  }
  const allSexesSimple = [...new Set(filteredSimple.map(b => b.sexe || 'Inconnu'))];
  const sAmetropieBySexeData = Object.entries(sAmetropieBySexe)
    .map(([name, sexes]) => ({ name, ...sexes }))
    .sort((a, b) => {
      const totalA = allSexesSimple.reduce((s, k) => s + (a[k] || 0), 0);
      const totalB = allSexesSimple.reduce((s, k) => s + (b[k] || 0), 0);
      return totalB - totalA;
    });

  // ─── Anomalies par tranche d'âge (AAO PPP / ICD-11) ───────
  const sAnomaliesByAge = {};
  for (const b of filteredSimple) {
    const t = getTrancheFromAge(b.age);
    if (b.anomalies) {
      for (const a of b.anomalies.split(',')) {
        const v = a.trim();
        if (v && v !== 'Aucune') {
          if (!sAnomaliesByAge[t]) sAnomaliesByAge[t] = {};
          sAnomaliesByAge[t][v] = (sAnomaliesByAge[t][v] || 0) + 1;
        }
      }
    }
  }
  const allAnomaliesNames = [...new Set(filteredSimple.flatMap(b => (b.anomalies || '').split(',').map(a => a.trim()).filter(a => a && a !== 'Aucune')))];
  const ageOrder = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
  const sAnomaliesByAgeData = Object.entries(sAnomaliesByAge)
    .map(([tranche, anomalies]) => ({ tranche, ...anomalies }))
    .sort((a, b) => ageOrder.indexOf(a.tranche) - ageOrder.indexOf(b.tranche));

  // ─── Taux de non-emmétropie par âge (OMS VISION 2020) ─────
  const sEmmetropieByAge = {};
  for (const b of filteredSimple) {
    const t = getTrancheFromAge(b.age);
    if (!sEmmetropieByAge[t]) sEmmetropieByAge[t] = { tranche: t, total: 0, nonEmmetrope: 0, emmetrope: 0 };
    sEmmetropieByAge[t].total++;
    if (b.statut_refractif === 'Non emmetrope') {
      sEmmetropieByAge[t].nonEmmetrope++;
    } else {
      sEmmetropieByAge[t].emmetrope++;
    }
  }
  const sEmmetropieByAgeData = Object.values(sEmmetropieByAge)
    .map(d => ({ ...d, taux: d.total ? +((d.nonEmmetrope / d.total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => ageOrder.indexOf(a.tranche) - ageOrder.indexOf(b.tranche));

  // ─── Anomalies par sexe (STROBE / ICD-11) ─────────────────
  const sAnomaliesBySexe = {};
  for (const b of filteredSimple) {
    const s = b.sexe || 'Inconnu';
    if (b.anomalies) {
      for (const a of b.anomalies.split(',')) {
        const v = a.trim();
        if (v && v !== 'Aucune') {
          if (!sAnomaliesBySexe[v]) sAnomaliesBySexe[v] = {};
          sAnomaliesBySexe[v][s] = (sAnomaliesBySexe[v][s] || 0) + 1;
        }
      }
    }
  }
  const sAnomaliesBySexeData = Object.entries(sAnomaliesBySexe)
    .map(([name, sexes]) => ({ name, ...sexes }))
    .sort((a, b) => {
      const totalA = allSexesSimple.reduce((s, k) => s + (a[k] || 0), 0);
      const totalB = allSexesSimple.reduce((s, k) => s + (b[k] || 0), 0);
      return totalB - totalA;
    });

  // KPIs normés supplémentaires
  const sDeficienceCount = Object.entries(sDeficienceMap)
    .filter(([k]) => k !== 'Normal (≥ 8/10)' && k !== 'Non classifié')
    .reduce((s, [, v]) => s + v, 0);
  const sDeficiencePct = totalSimple ? ((sDeficienceCount / totalSimple) * 100).toFixed(1) : 0;

  // Available tranches for filter
  const availableTranches = [...new Set(bilans.map((b) => getTrancheAge(b.date_naissance)))].sort();

  const handleExportStats = () => {
    const lines = [
      'BBA-Data – Statistiques des bilans optométriques',
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      `Total bilans analysés : ${totalBilans}`,
      '',
      '== PRÉVALENCE DES AMÉTROPIES ==',
      ...prevalenceData.map((p) => `${p.name}: ${p.value} (${p.pct}%)`),
      '',
      '== MOYENNES DE RÉFRACTION ==',
      `ES moyen OD: ${avgES_OD} D`,
      `ES moyen OG: ${avgES_OG} D`,
      `SPH moyen OD: ${avgSPH_OD} D | OG: ${avgSPH_OG} D`,
      `CYL moyen OD: ${avgCYL_OD} D | OG: ${avgCYL_OG} D`,
      '',
      '== ASTIGMATISME ==',
      ...Object.entries(astigmatismeCount).map(([k, v]) => `${k}: ${v}`),
      '',
      `Presbytie: ${presbyCount} (${totalBilans ? ((presbyCount / totalBilans) * 100).toFixed(1) : 0}%)`,
      `Alertes PIO > 21 mmHg: ${pioAlertCount}`,
      '',
      '== SEGMENTATION DÉMOGRAPHIQUE ==',
      ...demoData.map((d) => `${d.name}: ${d.value}`),
      '',
      '== MOTIFS DE CONSULTATION ==',
      ...motifData.map((m) => `${m.name}: ${m.value}`),
      '',
      '== BILANS SIMPLIFIÉS ==',
      `Total bilans simplifiés : ${totalSimple}`,
      '',
      '-- Déficience visuelle OMS (ISO 8596 / ICD-11 9D90) --',
      ...sDeficienceData.map((p) => `${p.name}: ${p.value} (${p.pct}%)`),
      '',
      '-- Taux de non-emmétropie par âge (OMS VISION 2020) --',
      ...sEmmetropieByAgeData.map((d) => `${d.tranche}: ${d.taux}% (${d.nonEmmetrope}/${d.total})`),
      '',
      '-- Amétropies par sexe (STROBE) --',
      ...sAmetropieBySexeData.map((d) => `${d.name}: ${allSexesSimple.map(s => `${s}=${d[s] || 0}`).join(', ')}`),
      '',
      '-- Anomalies par tranche d\'âge (AAO PPP / ICD-11) --',
      ...sAnomaliesByAgeData.map((d) => `${d.tranche}: ${allAnomaliesNames.map(a => `${a}=${d[a] || 0}`).join(', ')}`),
      '',
      'Données anonymisées – Déclaration d\'Helsinki',
      'Normes : ISO 8596 · OMS ICD-11 9D90 · ISO 13666 · AAO PPP · ICD-11 · STROBE · OMS VISION 2020',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bbadata_stats_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-500" size={24} />
        <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Analyse Statistique
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Prévalence des amétropies · Segmentation démographique · Institut BBA
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Download} size="sm" onClick={handleExportStats}>
            Export rapport
          </Button>
          <Button variant="ghost" icon={RefreshCw} size="sm" onClick={loadData}>
            Actualiser
          </Button>
        </div>
      </div>

      {/* ─── Section Tabs ─────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
        <button
          onClick={() => setSection('simple')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            section === 'simple'
              ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <ClipboardList size={15} />
          Bilans Simplifiés
        </button>
        <button
          onClick={() => setSection('complet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            section === 'complet'
              ? 'bg-white dark:bg-neutral-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <Eye size={15} />
          Bilans Optométriques
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: BILANS OPTOMÉTRIQUES                         */}
      {/* ═══════════════════════════════════════════════════════ */}
      {section === 'complet' && (<>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-400" />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Filtres :</span>
        </div>
        <select
          value={filter.sexe}
          onChange={(e) => setFilter((f) => ({ ...f, sexe: e.target.value }))}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        >
          <option value="all">Tous sexes</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>
        <select
          value={filter.tranche}
          onChange={(e) => setFilter((f) => ({ ...f, tranche: e.target.value }))}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        >
          <option value="all">Toutes tranches d'âge</option>
          {availableTranches.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {totalBilans} bilans
        </span>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total bilans', value: totalBilans, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'ES moy. OD', value: `${avgES_OD} D`, color: 'text-violet-600 dark:text-violet-400' },
          { label: 'ES moy. OG', value: `${avgES_OG} D`, color: 'text-violet-600 dark:text-violet-400' },
          { label: 'Presbytie', value: `${totalBilans ? ((presbyCount / totalBilans) * 100).toFixed(0) : 0}%`, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Astigmatisme', value: Object.values(astigmatismeCount).reduce((a, b) => a + b, 0), color: 'text-cyan-600 dark:text-cyan-400' },
          { label: 'Alertes PIO', value: pioAlertCount, color: 'text-red-600 dark:text-red-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4 text-center">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Expanded Card Modal ─────────────────────────── */}
      {expandedCard && !expandedCard.startsWith('s-') && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setExpandedCard(null)}
        >
          <div
            ref={modalRef}
            className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-8 animate-[scaleIn_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedCard(null)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                {expandedCard === 'prevalence' && 'Prévalence des amétropies'}
                {expandedCard === 'demographics' && 'Segmentation démographique'}
                {expandedCard === 'gender' && 'Répartition par sexe'}
                {expandedCard === 'motifs' && 'Motifs de consultation'}
                {expandedCard === 'refraction' && 'Moyennes de réfraction'}
                {expandedCard === 'astigmatisme' && 'Distribution de l\'astigmatisme'}
                {expandedCard === 'pio-dist' && 'Distribution de la PIO'}
                {expandedCard === 'acuite' && 'Acuité visuelle moyenne'}
                {expandedCard === 'anisometropie' && 'Analyse de l\'anisométropie'}
                {expandedCard === 'presbytie-age' && 'Presbytie par tranche d\'âge'}
                {expandedCard === 'axes' && 'Distribution des axes de cylindre'}
              </h2>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                {expandedCard === 'prevalence' && 'Classification ISO 13666:2019 (ES = SPH + CYL/2)'}
                {expandedCard === 'demographics' && 'Répartition par tranche d\'âge'}
                {expandedCard === 'gender' && 'Distribution H/F de la population consultante'}
                {expandedCard === 'motifs' && 'Les motifs les plus fréquents – Optimisation du dépistage'}
                {expandedCard === 'refraction' && 'Calculs automatiques ES (ISO 13666:2019)'}
                {expandedCard === 'astigmatisme' && 'Répartition léger / modéré / fort (CYL ≥ 0.5 D)'}
                {expandedCard === 'pio-dist' && 'Histogramme des valeurs PIO (mmHg) – Seuil AAO PPP'}
                {expandedCard === 'acuite' && 'Comparaison sans correction (SC) vs avec correction (AC) – ISO 8596'}
                {expandedCard === 'anisometropie' && 'Différence d\'ES entre OD et OG – ISO 14971'}
                {expandedCard === 'presbytie-age' && 'Taux de presbytie par groupe d\'âge (addition > 0)'}
                {expandedCard === 'axes' && 'Orientation de l\'astigmatisme (0–180°)'}
              </p>
            </div>

            {/* Prevalence expanded */}
            {expandedCard === 'prevalence' && (
              <>
                <ResponsiveContainer width="100%" height={480}>
                  <BarChart data={prevalenceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Nombre de cas" radius={[0, 6, 6, 0]}>
                      {prevalenceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {prevalenceData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Demographics expanded */}
            {expandedCard === 'demographics' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Patients" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Gender expanded */}
            {expandedCard === 'gender' && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={480}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={160}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name === 'M' ? 'Masculin' : name === 'F' ? 'Féminin' : name} (${(percent * 100).toFixed(0)}%)`}
                      className="dark:[&_text]:fill-neutral-400"
                    >
                      {genderData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Motifs expanded */}
            {expandedCard === 'motifs' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={motifData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Nb consultations" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Refraction expanded */}
            {expandedCard === 'refraction' && (
              <>
                <table className="w-full text-base">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-700">
                      <th className="py-3 px-4 text-left text-sm font-semibold text-neutral-500 dark:text-neutral-400">Mesure</th>
                      <th className="py-3 px-4 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">OD</th>
                      <th className="py-3 px-4 text-center text-sm font-semibold text-neutral-500 dark:text-neutral-400">OG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                    {[
                      { label: 'Sphère moyenne (D)', od: avgSPH_OD, og: avgSPH_OG },
                      { label: 'Cylindre moyen (D)', od: avgCYL_OD, og: avgCYL_OG },
                      { label: 'Équivalent sphérique moyen (D)', od: avgES_OD, og: avgES_OG },
                    ].map((row) => (
                      <tr key={row.label} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                        <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300 font-medium">{row.label}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg text-neutral-800 dark:text-neutral-100">{row.od}</td>
                        <td className="py-3 px-4 text-center font-mono text-lg text-neutral-800 dark:text-neutral-100">{row.og}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-5 text-center">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase">Presbytie</p>
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mt-1">{presbyCount}</p>
                    <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">{totalBilans ? ((presbyCount / totalBilans) * 100).toFixed(1) : 0}% des bilans</p>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-5 text-center">
                    <p className="text-xs font-medium text-cyan-600 dark:text-cyan-400 uppercase">Astigmatisme</p>
                    <p className="text-3xl font-bold text-cyan-700 dark:text-cyan-300 mt-1">
                      {Object.values(astigmatismeCount).reduce((a, b) => a + b, 0)}
                    </p>
                    <p className="text-xs text-cyan-500 dark:text-cyan-400 mt-1">yeux avec CYL ≥ 0.5 D</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 text-center">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase">PIO &gt; 21 mmHg</p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">{pioAlertCount}</p>
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">Référé ophtalmologique (AAO PPP)</p>
                  </div>
                </div>
              </>
            )}

            {/* Astigmatisme Pie expanded */}
            {expandedCard === 'astigmatisme' && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={480}>
                  <PieChart>
                    <Pie data={astigPieData} cx="50%" cy="50%" innerRadius={80} outerRadius={160} paddingAngle={3} dataKey="value"
                      label={({ name, pct }) => `${name} (${pct}%)`} className="dark:[&_text]:fill-neutral-400">
                      {astigPieData.map((_, i) => (<Cell key={i} fill={['#06b6d4', '#f59e0b', '#ef4444'][i % 3]} stroke="transparent" />))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* PIO Distribution expanded */}
            {expandedCard === 'pio-dist' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={pioDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Nb yeux" radius={[6, 6, 0, 0]}>
                    {pioDistData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('21') || d.name.includes('25') || d.name.includes('30') ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Acuité Visuelle expanded */}
            {expandedCard === 'acuite' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={avData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis domain={[0, 1.5]} tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="AV moyenne (décimal)" radius={[6, 6, 0, 0]}>
                    {avData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('SC') ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Anisométropie expanded */}
            {expandedCard === 'anisometropie' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={anisoChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                    {anisoChartData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('Normal') ? '#10b981' : d.name.includes('Légère') ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Presbytie par âge expanded */}
            {expandedCard === 'presbytie-age' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={presbyByAgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="tranche" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="presbyte" name="Presbyte" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="nonPresbye" name="Non presbyte" fill="#3b82f6" stackId="a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Axes de cylindre expanded */}
            {expandedCard === 'axes' && (
              <ResponsiveContainer width="100%" height={480}>
                <RadarChart data={axeData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <PolarRadiusAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Radar name="Nb yeux" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Charts Row 1: Prevalence + Demographics ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('prevalence')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Prévalence des amétropies" description="Classification ISO 13666:2019 (ES = SPH + CYL/2)" icon={BarChart3}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={prevalenceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nombre de cas" radius={[0, 4, 4, 0]}>
                    {prevalenceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Percentage table */}
            <div className="mt-2 space-y-1">
              {prevalenceData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                  </div>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('demographics')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Segmentation démographique" description="Répartition par tranche d'âge" icon={Users}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={demoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row 2: Gender + Motifs ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('gender')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Répartition par sexe" description="Distribution H/F de la population consultante" icon={PieIcon}>
            <div className="mt-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name === 'M' ? 'Masculin' : name === 'F' ? 'Féminin' : name} (${(percent * 100).toFixed(0)}%)`}
                    className="dark:[&_text]:fill-neutral-400"
                  >
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('motifs')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Motifs de consultation" description="Les motifs les plus fréquents – Optimisation du dépistage" icon={Eye}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={motifData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nb consultations" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row 3: Astigmatisme + PIO Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('astigmatisme')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Distribution de l'astigmatisme" description="Répartition léger / modéré / fort (CYL ≥ 0.5 D)" icon={Crosshair}>
            <div className="mt-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={astigPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                    label={({ name, pct }) => `${name} (${pct}%)`} className="dark:[&_text]:fill-neutral-400">
                    {astigPieData.map((_, i) => (<Cell key={i} fill={['#06b6d4', '#f59e0b', '#ef4444'][i % 3]} stroke="transparent" />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4">
              {astigPieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: ['#06b6d4', '#f59e0b', '#ef4444'][i % 3] }} />
                  <span className="text-neutral-600 dark:text-neutral-300">{d.name}: <strong>{d.value}</strong></span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('pio-dist')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Distribution de la PIO" description="Histogramme des valeurs PIO (mmHg) – Seuil AAO PPP" icon={Gauge}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={pioDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Nb yeux" radius={[4, 4, 0, 0]}>
                    {pioDistData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('21') || d.name.includes('25') || d.name.includes('30') ? '#ef4444' : '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row 4: Acuité Visuelle + Anisométropie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('acuite')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Acuité visuelle moyenne" description="Comparaison SC vs AC – ISO 8596" icon={Eye}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={avData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis domain={[0, 1.5]} tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="AV moyenne" radius={[4, 4, 0, 0]}>
                    {avData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('SC') ? '#f59e0b' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-neutral-500 dark:text-neutral-400">Sans correction</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-neutral-500 dark:text-neutral-400">Avec correction</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('anisometropie')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Analyse de l'anisométropie" description="Différence d'ES entre OD et OG – ISO 14971" icon={AlertTriangle}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={anisoChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" radius={[4, 4, 0, 0]}>
                    {anisoChartData.map((d, i) => (
                      <Cell key={i} fill={d.name.includes('Normal') ? '#10b981' : d.name.includes('Légère') ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {anisoCount > 0 && (
              <div className="mt-2 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                <p className="text-xs text-red-600 dark:text-red-400">
                  ⚠ {anisoCount} patient{anisoCount > 1 ? 's' : ''} avec anisométropie significative ({'>'} 2D)
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ─── Charts Row 5: Presbytie/âge + Axes cylindre ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('presbytie-age')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Presbytie par tranche d'âge" description="Taux de presbytie par groupe d'âge (addition > 0)" icon={Glasses}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={presbyByAgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="tranche" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="presbyte" name="Presbyte" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="nonPresbye" name="Non presbyte" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('axes')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Distribution des axes de cylindre" description="Orientation de l'astigmatisme (0–180°)" icon={Activity}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={axeData} cx="50%" cy="50%" outerRadius="65%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Radar name="Nb yeux" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Moyennes de réfraction ───────────────────────── */}
      <div className="cursor-pointer group relative" onClick={() => setExpandedCard('refraction')}>
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
          <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
        </div>
      <Card title="Moyennes de réfraction" description="Calculs automatiques ES (ISO 13666:2019)" icon={TrendingUp}>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-700">
                <th className="py-2 px-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Mesure</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400">OD</th>
                <th className="py-2 px-3 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400">OG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
              {[
                { label: 'Sphère moyenne (D)', od: avgSPH_OD, og: avgSPH_OG },
                { label: 'Cylindre moyen (D)', od: avgCYL_OD, og: avgCYL_OG },
                { label: 'Équivalent sphérique moyen (D)', od: avgES_OD, og: avgES_OG },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                  <td className="py-2 px-3 text-neutral-700 dark:text-neutral-300 font-medium">{row.label}</td>
                  <td className="py-2 px-3 text-center font-mono text-neutral-800 dark:text-neutral-100">{row.od}</td>
                  <td className="py-2 px-3 text-center font-mono text-neutral-800 dark:text-neutral-100">{row.og}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase">Presbytie</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{presbyCount}</p>
            <p className="text-[10px] text-amber-500 dark:text-amber-400">{totalBilans ? ((presbyCount / totalBilans) * 100).toFixed(1) : 0}% des bilans</p>
          </div>
          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
            <p className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 uppercase">Astigmatisme</p>
            <p className="text-lg font-bold text-cyan-700 dark:text-cyan-300">
              {Object.values(astigmatismeCount).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-[10px] text-cyan-500 dark:text-cyan-400">yeux avec CYL ≥ 0.5 D</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
            <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">PIO &gt; 21 mmHg</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{pioAlertCount}</p>
            <p className="text-[10px] text-red-500 dark:text-red-400">Référé ophtalmologique (AAO PPP)</p>
          </div>
        </div>
      </Card>
      </div>

      </>)}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: BILANS SIMPLIFIÉS                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {section === 'simple' && (<>

      {/* ─── Filters Simplifiés ───────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-emerald-500" />
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Filtres :</span>
        </div>
        <select
          value={filterSimple.sexe}
          onChange={(e) => setFilterSimple((f) => ({ ...f, sexe: e.target.value }))}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        >
          <option value="all">Tous sexes</option>
          <option value="Homme">Homme</option>
          <option value="Femme">Femme</option>
        </select>
        <select
          value={filterSimple.tranche}
          onChange={(e) => setFilterSimple((f) => ({ ...f, tranche: e.target.value }))}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
        >
          <option value="all">Toutes tranches d'âge</option>
          {availableTranchesSimple.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {totalSimple} bilans simplifiés
        </span>
      </div>

      {/* ─── KPI Cards Simplifiés ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total bilans', value: totalSimple, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Non emmétrope', value: `${totalSimple ? ((sNonEmmetrope / totalSimple) * 100).toFixed(0) : 0}%`, color: 'text-orange-600 dark:text-orange-400' },
          { label: 'Anomalies détectées', value: sAnomaliesCount, color: 'text-red-600 dark:text-red-400' },
          { label: 'Sans anomalie', value: sAucuneAnomalie, color: 'text-green-600 dark:text-green-400' },
          { label: 'Amétropies', value: Object.keys(sAmetropieMap).length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Déficience visuelle', value: `${sDeficiencePct}%`, color: 'text-red-600 dark:text-red-400' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-neutral-800 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 p-4 text-center">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Expanded Card Modal (simplifiés) ────────────── */}
      {expandedCard && expandedCard.startsWith('s-') && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setExpandedCard(null)}
        >
          <div
            className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-[90vw] max-w-5xl max-h-[90vh] overflow-y-auto p-8 animate-[scaleIn_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setExpandedCard(null)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                {expandedCard === 's-ametropie' && 'Répartition des amétropies'}
                {expandedCard === 's-anomalies' && 'Répartition des anomalies'}
                {expandedCard === 's-acuite' && 'Distribution de l\'acuité visuelle'}
                {expandedCard === 's-statut' && 'Statut réfractif'}
                {expandedCard === 's-sexe' && 'Répartition par sexe'}
                {expandedCard === 's-demo' && 'Segmentation par tranche d\'âge'}
                {expandedCard === 's-deficience' && 'Classification de la déficience visuelle (OMS)'}
                {expandedCard === 's-ametropie-sexe' && 'Amétropies par sexe'}
                {expandedCard === 's-anomalies-age' && 'Anomalies par tranche d\'âge'}
                {expandedCard === 's-emmetropie-age' && 'Taux de non-emmétropie par tranche d\'âge'}
                {expandedCard === 's-anomalies-sexe' && 'Anomalies par sexe'}
              </h2>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                {expandedCard === 's-ametropie' && 'Classification OMS – Bulletin de la santé visuelle mondiale'}
                {expandedCard === 's-anomalies' && 'Classification ICD-11 (CIM-11) · AAO Preferred Practice Patterns'}
                {expandedCard === 's-acuite' && 'Échelle décimale ISO 8596 · Seuils OMS ICD-11 9D90'}
                {expandedCard === 's-statut' && 'Définition de l\'emmétropie selon ISO 13666:2019'}
                {expandedCard === 's-sexe' && 'Stratification STROBE · Déclaration d\'Helsinki'}
                {expandedCard === 's-demo' && 'Recommandations AAO PPP · OMS VISION 2020'}
                {expandedCard === 's-deficience' && 'Seuils OMS ICD-11 9D90 · ISO 8596 · AAO PPP'}
                {expandedCard === 's-ametropie-sexe' && 'Stratification STROBE · ISO 13666:2019'}
                {expandedCard === 's-anomalies-age' && 'Dépistage AAO PPP · Classification ICD-11 (CIM-11)'}
                {expandedCard === 's-emmetropie-age' && 'OMS VISION 2020 · ISO 13666:2019'}
                {expandedCard === 's-anomalies-sexe' && 'Stratification STROBE · ICD-11 (CIM-11)'}
              </p>
            </div>

            {expandedCard === 's-ametropie' && (
              <>
                <ResponsiveContainer width="100%" height={480}>
                  <BarChart data={sAmetropieData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Cas" radius={[0, 6, 6, 0]}>
                      {sAmetropieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sAmetropieData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {expandedCard === 's-anomalies' && (
              <ResponsiveContainer width="100%" height={480}>
                <RadarChart data={sAnomaliesData} cx="50%" cy="50%" outerRadius="65%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Radar name="Cas" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {expandedCard === 's-acuite' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={sAcuiteData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {expandedCard === 's-statut' && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={480}>
                  <PieChart>
                    <Pie data={sStatutData} cx="50%" cy="50%" innerRadius={80} outerRadius={160} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      className="dark:[&_text]:fill-neutral-400"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {expandedCard === 's-sexe' && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={480}>
                  <PieChart>
                    <Pie data={sSexeData} cx="50%" cy="50%" innerRadius={80} outerRadius={160} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      className="dark:[&_text]:fill-neutral-400"
                    >
                      {sSexeData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {expandedCard === 's-demo' && (
              <ResponsiveContainer width="100%" height={480}>
                <BarChart data={sDemoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Déficience visuelle OMS expanded */}
            {expandedCard === 's-deficience' && (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sDeficienceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                      {sDeficienceData.map((d, i) => (
                        <Cell key={i} fill={deficienceColors[d.name] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {sDeficienceData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: deficienceColors[p.name] || '#6b7280' }} />
                        <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <strong>Normes :</strong> Seuils OMS ICD-11 9D90 · Normal ≥ 8/10 · Déficience légère {'<'} 8/10 · Modérée {'<'} 5/10 · Sévère {'<'} 3/10 · Cécité légale {'<'} 1/10 · Cécité {'<'} 0.5/10
                </div>
              </>
            )}

            {/* Amétropies par sexe expanded */}
            {expandedCard === 's-ametropie-sexe' && (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sAmetropieBySexeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {allSexesSimple.map((s, i) => (
                      <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-lime-50 dark:bg-lime-900/20 rounded-lg text-xs text-lime-700 dark:text-lime-300">
                  <strong>Norme STROBE :</strong> Stratification démographique par sexe – Transparence des caractéristiques de la population étudiée (ISO 13666:2019)
                </div>
              </>
            )}

            {/* Anomalies par tranche d'âge expanded */}
            {expandedCard === 's-anomalies-age' && (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sAnomaliesByAgeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {allAnomaliesNames.map((a, i) => (
                      <Bar key={a} dataKey={a} name={a} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allAnomaliesNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <strong>Normes :</strong> Dépistage AAO PPP par tranche d'âge · Classification ICD-11 : 9A00 (strabisme), 9A01 (amblyopie), 9A61 (glaucome), 9B10 (cataracte)
                </div>
              </>
            )}

            {/* Taux non-emmétropie par âge expanded */}
            {expandedCard === 's-emmetropie-age' && (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sEmmetropieByAgeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis dataKey="tranche" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" unit="%" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="taux" name="% Non emmétrope" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {sEmmetropieByAgeData.map((d, i) => (
                    <div key={i} className="text-center bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{d.tranche}</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{d.taux}%</p>
                      <p className="text-[10px] text-neutral-400">{d.nonEmmetrope}/{d.total} patients</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-xs text-cyan-700 dark:text-cyan-300">
                  <strong>Norme OMS VISION 2020 :</strong> Prévalence mondiale amétropies non corrigées ~2,7 milliards · Segmentation par âge (ISO 13666:2019)
                </div>
              </>
            )}

            {/* Anomalies par sexe expanded */}
            {expandedCard === 's-anomalies-sexe' && (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sAnomaliesBySexeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {allSexesSimple.map((s, i) => (
                      <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-700 dark:text-purple-300">
                  <strong>Normes :</strong> Stratification STROBE · Classification ICD-11 (CIM-11) · Déclaration d'Helsinki
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Charts Row S1: Amétropies + Anomalies ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-ametropie')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Répartition des amétropies" description="Types d'amétropie détectés lors du dépistage" icon={Eye}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sAmetropieData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Cas" radius={[0, 4, 4, 0]}>
                    {sAmetropieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-anomalies')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Répartition des anomalies" description="Anomalies visuelles détectées lors du dépistage" icon={AlertTriangle}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={sAnomaliesData} cx="50%" cy="50%" outerRadius="65%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <PolarRadiusAxis tick={{ fontSize: 8, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Radar name="Cas" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row S2: Acuité visuelle + Statut réfractif */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-acuite')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Distribution de l'acuité visuelle" description="Répartition des niveaux d'acuité – Dépistage" icon={Crosshair}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sAcuiteData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-statut')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Statut réfractif" description="Proportion emmétrope vs non emmétrope" icon={Gauge}>
            <div className="mt-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sStatutData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    className="dark:[&_text]:fill-neutral-400"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row S3: Sexe + Démographie ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-sexe')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Répartition par sexe" description="Distribution Homme / Femme – Dépistage" icon={Users}>
            <div className="mt-3 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sSexeData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    className="dark:[&_text]:fill-neutral-400"
                  >
                    {sSexeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-demo')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Segmentation par tranche d'âge" description="Répartition démographique – Dépistage" icon={BarChart3}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sDemoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: STATISTIQUES BASÉES SUR LES NORMES           */}
      {/* ═══════════════════════════════════════════════════════ */}

      <div className="mt-2 mb-1">
        <h2 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-500" />
          Statistiques basées sur les normes
        </h2>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
          ISO 8596 · OMS ICD-11 9D90 · AAO PPP · STROBE · OMS VISION 2020
        </p>
      </div>

      {/* ─── Charts Row S4: Déficience visuelle OMS + Taux non-emmétropie par âge ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-deficience')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Classification déficience visuelle (OMS)" description="Seuils OMS ICD-11 9D90 · ISO 8596" icon={Eye}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sDeficienceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Patients" radius={[4, 4, 0, 0]}>
                    {sDeficienceData.map((d, i) => (
                      <Cell key={i} fill={deficienceColors[d.name] || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {sDeficienceData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: deficienceColors[p.name] || '#6b7280' }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                  </div>
                  <span className="font-mono font-medium text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-emmetropie-age')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Taux de non-emmétropie par âge" description="OMS VISION 2020 · ISO 13666:2019" icon={TrendingUp}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sEmmetropieByAgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="tranche" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="taux" name="% Non emmétrope" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 justify-center">
              {sEmmetropieByAgeData.map((d, i) => (
                <div key={i} className="text-center bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-2 py-1">
                  <p className="text-[9px] text-neutral-400">{d.tranche}</p>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{d.taux}%</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row S5: Amétropies par sexe + Anomalies par âge ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-ametropie-sexe')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Amétropies par sexe" description="Stratification STROBE · ISO 13666:2019" icon={Users}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sAmetropieBySexeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {allSexesSimple.map((s, i) => (
                    <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-anomalies-age')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Anomalies par tranche d'âge" description="Dépistage AAO PPP · Classification ICD-11" icon={AlertTriangle}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sAnomaliesByAgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="tranche" tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {allAnomaliesNames.map((a, i) => (
                    <Bar key={a} dataKey={a} name={a} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allAnomaliesNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row S6: Anomalies par sexe ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('s-anomalies-sexe')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card title="Anomalies par sexe" description="Stratification STROBE · ICD-11 (CIM-11)" icon={Activity}>
            <div className="mt-3 -mx-2">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sAnomaliesBySexeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 9, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {allSexesSimple.map((s, i) => (
                    <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Résumé normatif */}
        <Card title="Référentiel normatif appliqué" description="Normes utilisées pour les statistiques simplifiées" icon={BookOpen}>
          <div className="mt-3 space-y-2">
            {[
              { norme: 'ISO 8596', desc: 'Échelle AV décimale · Classification déficience visuelle', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
              { norme: 'OMS ICD-11 9D90', desc: 'Seuils déficience : légère, modérée, sévère, cécité', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
              { norme: 'ISO 13666', desc: 'Définition emmétropie · Classification amétropies', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
              { norme: 'AAO PPP', desc: 'Dépistage anomalies par tranche d\'âge', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
              { norme: 'ICD-11 (CIM-11)', desc: '9A00 strabisme · 9A01 amblyopie · 9A61 glaucome', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
              { norme: 'STROBE', desc: 'Stratification par sexe et âge · Épidémiologie', color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300' },
              { norme: 'OMS VISION 2020', desc: 'Prévalence mondiale amétropies non corrigées', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300' },
            ].map((n) => (
              <div key={n.norme} className="flex items-start gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-md font-semibold whitespace-nowrap ${n.color}`}>{n.norme}</span>
                <span className="text-neutral-600 dark:text-neutral-300">{n.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      </>)}

      {/* ─── Footer ───────────────────────────────────────── */}
      <div className="text-center py-4 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          BBA-Data – Institut BBA · Données anonymisées conformément à la Déclaration d'Helsinki ·
          Calculs selon ISO 13666:2019 · Alertes AAO Preferred Practice Patterns
        </p>
      </div>
    </div>
  );
}
