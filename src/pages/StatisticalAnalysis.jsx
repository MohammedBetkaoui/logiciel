// ─────────────────────────────────────────────────────────────────
// BBA-Data – Analyse Statistique des Bilans Optométriques
// Prévalence des amétropies · Segmentation démographique
// Moyennes de réfraction · Classifications automatiques
// Conforme ISO 13666:2019 / AAO Preferred Practice Patterns
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
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

export default function StatisticalAnalysis() {
  const [bilans, setBilans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ sexe: 'all', tranche: 'all' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setBilans(data);
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
      'Données anonymisées – Déclaration d\'Helsinki',
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

      {/* ─── Charts Row 1: Prevalence + Demographics ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* ─── Charts Row 2: Gender + Motifs ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* ─── Moyennes de réfraction ───────────────────────── */}
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
