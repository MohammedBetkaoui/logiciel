// ─────────────────────────────────────────────────────────────────
// BBA-Data – MedicalDashboard (Dashboard épidémiologique)
// Graphiques Recharts : Radar, Line, Pie
// Analyse statistique des bilans – Institut BBA
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  Users,
  FileText,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
  TrendingUp,
  Download,
  X,
  Maximize2,
  Clock,
  HardDrive,
  ClipboardList,
  Eye,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ClinicalAlerts from '../components/medical/ClinicalAlerts';
import {
  getDashboardStats,
  getAnomalies,
  getPioHistory,
  getDemographics,
  getActiveAlerts,
  exportAnonymisedCSV,
  getBilansSimplesStats,
} from '../services/api';

// ─── Couleurs du thème médical ───────────────────────────────
const COLORS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  violet: '#8b5cf6',
  cyan: '#06b6d4',
  rose: '#f43f5e',
  slate: '#64748b',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

// ─── Valeurs par défaut (pas de données) ─────────────────────
const EMPTY_STATS = {
  total_patients: 0,
  total_examens: 0,
  alertes_actives: 0,
  examens_ce_mois: 0,
};


// ─── Composant StatCard ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, subtext }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mt-1">
            {value}
          </p>
          {subtext && (
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
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
          {entry.name}: <strong>{entry.value}</strong>
          {entry.name.includes('PIO') ? ' mmHg' : ''}
        </p>
      ))}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function MedicalDashboard({ targetCard, onTargetCardConsumed }) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [anomalies, setAnomalies] = useState([]);
  const [pioData, setPioData] = useState([]);
  const [demographics, setDemographics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const [simpleStats, setSimpleStats] = useState(null);
  const modalRef = useRef(null);

  // Auto-expand card when navigated from guide page
  useEffect(() => {
    if (targetCard) {
      setExpandedCard(targetCard);
      if (onTargetCardConsumed) onTargetCardConsumed();
    }
  }, [targetCard, onTargetCardConsumed]);

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

  // Charger les données depuis l'API si disponible
  useEffect(() => {
    async function loadData() {
      try {
        const [s, a, p, d, al, ss] = await Promise.all([
          getDashboardStats(),
          getAnomalies(),
          getPioHistory(),
          getDemographics(),
          getActiveAlerts(),
          getBilansSimplesStats(),
        ]);
        setStats(s);
        setAnomalies(a);
        setPioData(p);
        setDemographics(d);
        setAlerts(al);
        setSimpleStats(ss);
        setBackendOnline(true);
      } catch {
        // Utilise les données de démo
        setBackendOnline(false);
      }
    }
    loadData();
  }, []);

  // Export CSV anonymisé (RGPD)
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csv = await exportAnonymisedCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bbadata_anonyme_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail in demo mode
    } finally {
      setIsExporting(false);
    }
  };

  // Transform demographics for pie chart
  const pieData = demographics.reduce((acc, d) => {
    const existing = acc.find((x) => x.name === d.tranche_age);
    if (existing) {
      existing.value += d.count;
    } else {
      acc.push({ name: d.tranche_age, value: d.count });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Tableau de bord
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Synthèse des bilans optométriques – Institut BBA – Données{' '}
            {backendOnline ? (
              <span className="text-emerald-500 font-medium">en direct</span>
            ) : (
              <span className="text-amber-500 font-medium">hors ligne</span>
            )}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={Download}
          size="sm"
          onClick={handleExportCSV}
          isLoading={isExporting}
          aria-label="Exporter les données anonymisées en CSV"
        >
          Export RGPD
        </Button>
      </div>

      {/* ─── Stat Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Patients"
          value={stats.total_patients}
          color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          subtext="Population dépistée"
        />
        <StatCard
          icon={FileText}
          label="Bilans"
          value={stats.total_examens}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          subtext="Fiches cliniques collectées"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pathologies détectées"
          value={stats.alertes_actives}
          color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          subtext="PIO > 21 mmHg / Réf. ophtalmo"
        />
        <StatCard
          icon={CalendarDays}
          label="Ce mois"
          value={stats.examens_ce_mois}
          color="bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
          subtext="Bilans de dépistage"
        />
      </div>

      {/* ─── Expanded Card Modal ─────────────────────────── */}
      {expandedCard && createPortal(
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
                {expandedCard === 'anomalies' && 'Prévalence des anomalies'}
                {expandedCard === 'pio' && 'Évolution de la PIO'}
                {expandedCard === 'demographics' && 'Segmentation démographique'}
                {expandedCard === 'alerts' && 'Alertes cliniques actives'}
              </h2>
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                {expandedCard === 'anomalies' && 'Distribution épidémiologique des pathologies détectées'}
                {expandedCard === 'pio' && 'Pression intraoculaire (mmHg) – Seuil: 21 mmHg'}
                {expandedCard === 'demographics' && "Répartition par tranche d'âge – population dépistée"}
                {expandedCard === 'alerts' && 'Patients nécessitant une attention (ISO 14971)'}
              </p>
            </div>

            {/* Anomalies Radar expanded */}
            {expandedCard === 'anomalies' && (
              <ResponsiveContainer width="100%" height={480}>
                <RadarChart data={anomalies} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis dataKey="anomalie" tick={{ fontSize: 12, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                  <PolarRadiusAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 'auto']} className="dark:[&_text]:fill-neutral-500" />
                  <Radar name="Cas détectés" dataKey="count" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            )}

            {/* PIO Line expanded */}
            {expandedCard === 'pio' && (
              <ResponsiveContainer width="100%" height={480}>
                <LineChart data={pioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis dataKey="patient" tick={{ fontSize: 12, fill: '#6b7280' }} angle={-20} textAnchor="end" height={60} className="dark:[&_text]:fill-neutral-400" />
                  <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} domain={[8, 30]} label={{ value: 'mmHg', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#9ca3af' } }} className="dark:[&_text]:fill-neutral-500" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={21} stroke={COLORS.red} strokeDasharray="4 4" label={{ value: 'Seuil 21 mmHg', position: 'right', style: { fontSize: 12, fill: COLORS.red } }} />
                  <Line type="monotone" dataKey="pio_od" name="PIO OD" stroke={COLORS.blue} strokeWidth={2.5} dot={{ r: 5, fill: COLORS.blue }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="pio_og" name="PIO OG" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ r: 5, fill: COLORS.emerald }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Demographics Pie expanded */}
            {expandedCard === 'demographics' && (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={480}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={160}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                      className="dark:[&_text]:fill-neutral-400"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Alerts expanded */}
            {expandedCard === 'alerts' && (
              <div className="max-h-[60vh] overflow-y-auto">
                <ClinicalAlerts alerts={alerts} />
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ─── Charts Row 1: Radar + PIO Line ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar Chart – Répartition des anomalies */}
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('anomalies')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card
            title="Prévalence des anomalies"
            description="Distribution épidémiologique des pathologies détectées"
            icon={Activity}
          >
            <div className="mt-3 -mx-2" role="img" aria-label="Graphique radar des anomalies visuelles">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={anomalies} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
                  <PolarAngleAxis
                    dataKey="anomalie"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    className="dark:[&_text]:fill-neutral-400"
                  />
                  <PolarRadiusAxis
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    domain={[0, 'auto']}
                    className="dark:[&_text]:fill-neutral-500"
                  />
                  <Radar
                    name="Cas détectés"
                    dataKey="count"
                    stroke={COLORS.blue}
                    fill={COLORS.blue}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Line Chart – Évolution PIO */}
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('pio')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card
            title="Évolution de la PIO"
            description="Pression intraoculaire (mmHg) – Seuil: 21 mmHg"
            icon={TrendingUp}
          >
            <div className="mt-3 -mx-2" role="img" aria-label="Graphique évolution de la pression intraoculaire">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={pioData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:[&>line]:stroke-neutral-700" />
                  <XAxis
                    dataKey="patient"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    angle={-20}
                    textAnchor="end"
                    height={50}
                    className="dark:[&_text]:fill-neutral-400"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    domain={[8, 30]}
                    label={{
                      value: 'mmHg',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 10, fill: '#9ca3af' },
                    }}
                    className="dark:[&_text]:fill-neutral-500"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={21}
                    stroke={COLORS.red}
                    strokeDasharray="4 4"
                    label={{
                      value: 'Seuil 21 mmHg',
                      position: 'right',
                      style: { fontSize: 10, fill: COLORS.red },
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pio_od"
                    name="PIO OD"
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.blue }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pio_og"
                    name="PIO OG"
                    stroke={COLORS.emerald}
                    strokeWidth={2}
                    dot={{ r: 4, fill: COLORS.emerald }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* ─── Charts Row 2: Demographics + Alerts ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart – Démographie */}
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('demographics')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card
            title="Segmentation démographique"
            description="Répartition par tranche d'âge – population dépistée"
            icon={Users}
          >
            <div className="mt-3 flex items-center justify-center" role="img" aria-label="Graphique répartition démographique">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                    className="dark:[&_text]:fill-neutral-400"
                  >
                    {pieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        stroke="transparent"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Alertes cliniques actives */}
        <div className="cursor-pointer group relative" onClick={() => setExpandedCard('alerts')}>
          <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 dark:bg-neutral-700/80 rounded-lg p-1.5">
            <Maximize2 size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <Card
            title="Alertes cliniques actives"
            description="Patients nécessitant une attention (ISO 14971)"
            icon={ShieldAlert}
          >
            <ClinicalAlerts alerts={alerts} />
          </Card>
        </div>
      </div>

      {/* ─── Activité & Statut système ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card
          title="Activité récente"
          description={alerts.length ? 'Dernières alertes cliniques' : 'Aucune activité'}
          icon={TrendingUp}
        >
          <div className="space-y-3 mt-2">
            {alerts.length === 0 && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 py-4 text-center">Aucune donnée disponible</p>
            )}
            {alerts.slice(0, 4).map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      a.niveau_urgence >= 2 ? 'bg-red-400' : 'bg-emerald-400'
                    }`}
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {a.alerte_clinique} – {a.nom} {a.prenom}
                  </span>
                </div>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">{a.date_examen}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Statut système"
          description="État des services backend"
          icon={Clock}
        >
          <div className="space-y-3 mt-2">
            {[
              { service: 'Serveur FastAPI', status: backendOnline ? 'En ligne' : 'Hors ligne', online: backendOnline },
              { service: 'Base SQLite', status: 'Prêt', online: true },
              { service: 'Python Runtime', status: 'Détecté', online: true },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-700 last:border-0"
              >
                <span className="text-sm text-neutral-600 dark:text-neutral-300">{item.service}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      item.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                  >
                    {item.status}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.online ? 'bg-emerald-400' : 'bg-neutral-300 dark:bg-neutral-600'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SECTION: BILANS SIMPLIFIÉS – Résumé                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {simpleStats && simpleStats.total > 0 && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800" />
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-200 dark:border-emerald-800">
              <ClipboardList size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                Bilans Simplifiés
              </span>
            </div>
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800" />
          </div>

          {/* Stat Cards simplifiés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={ClipboardList}
              label="Bilans simplifiés"
              value={simpleStats.total}
              color="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
              subtext="Total dépistages rapides"
            />
            <StatCard
              icon={Eye}
              label="Non emmétrope"
              value={simpleStats.statut_refractif?.['Non emmetrope'] || 0}
              color="bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              subtext={`${simpleStats.total ? (((simpleStats.statut_refractif?.['Non emmetrope'] || 0) / simpleStats.total) * 100).toFixed(0) : 0}% des bilans`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Anomalies détectées"
              value={Object.values(simpleStats.anomalies || {}).reduce((a, b) => a + b, 0)}
              color="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              subtext="Cas avec anomalies visuelles"
            />
            <StatCard
              icon={Users}
              label="Amétropies"
              value={Object.keys(simpleStats.ametropies || {}).length}
              color="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              subtext="Types d'amétropie détectés"
            />
          </div>

          {/* Charts simplifiés: Amétropies + Acuité visuelle */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Amétropies – Dépistage rapide" description="Types d'amétropie détectés" icon={Eye}>
              <div className="mt-3 -mx-2">
                {Object.keys(simpleStats.ametropies || {}).length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={Object.entries(simpleStats.ametropies).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                        className="dark:[&_text]:fill-neutral-400"
                      >
                        {Object.keys(simpleStats.ametropies).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-neutral-400 py-8 text-center">Aucune donnée</p>
                )}
              </div>
            </Card>

            <Card title="Acuité visuelle – Dépistage rapide" description="Distribution des niveaux d'acuité" icon={Activity}>
              <div className="mt-3 -mx-2">
                {Object.keys(simpleStats.acuite_visuelle || {}).length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={Object.entries(simpleStats.acuite_visuelle).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
                        className="dark:[&_text]:fill-neutral-400"
                      >
                        {Object.keys(simpleStats.acuite_visuelle).map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-neutral-400 py-8 text-center">Aucune donnée</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
