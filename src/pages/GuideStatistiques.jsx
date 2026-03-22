// ─────────────────────────────────────────────────────────────────
// BBA-Data – Guide des Statistiques
// Explication détaillée de chaque indicateur avec graphique
// intégré directement dans la page
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Eye,
  Activity,
  Crosshair,
  Gauge,
  Glasses,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Search,
  BookOpen,
  Info,
  BarChart2,
  X,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import ClinicalAlerts from '../components/medical/ClinicalAlerts';
import {
  getAnomalies,
  getPioHistory,
  getDemographics,
  getActiveAlerts,
} from '../services/api';

// ─── Couleurs ────────────────────────────────────────────────
const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f43f5e', '#64748b'];
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
const EPI_COLORS = { blue: '#3b82f6', emerald: '#10b981', amber: '#f59e0b', red: '#ef4444', violet: '#8b5cf6', cyan: '#06b6d4' };

// ─── Utilitaires calcul (ISO 13666:2019) ─────────────────────
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

const SIMPLE_AMETROPIE_ALIASES = {
  myopie: 'Myopie',
  hypermetropie: 'Hypermétropie',
  astigmatisme: 'Astigmatisme',
};

const SIMPLE_ANOMALIE_ALIASES = {
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

const SIMPLE_NO_ANOMALY_LABEL = "Pas d'anomalie";

function normalizeSimpleLabel(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSimpleValues(rawValue, aliases) {
  if (!rawValue) return [];
  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => aliases[normalizeSimpleLabel(item)] || item);
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

// ─── Données descriptives des statistiques ───────────────────

const STAT_CARDS = [
  {
    id: 'prevalence',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Prévalence des amétropies',
    icon: Eye,
    color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    chartType: 'Barres horizontales',
    norme: 'ISO 13666:2019',
    description:
      'Affiche la répartition des troubles réfractifs dans la population examinée. Chaque bilan est classé selon son Équivalent Sphérique (ES = SPH + CYL / 2) conformément à la norme ISO 13666:2019.',
    interpretation:
      'Les catégories incluent : Myopie forte (ES ≤ −6.0 D), Myopie modérée (−6.0 < ES ≤ −3.0 D), Myopie faible (−3.0 < ES < −0.5 D), Emmétrope (−0.5 ≤ ES ≤ +0.5 D), Hypermétropie faible (+0.5 < ES ≤ +2.0 D), Hypermétropie modérée (+2.0 < ES ≤ +5.0 D), Hypermétropie forte (ES > +5.0 D).',
    utilite: 'Permet d\'identifier les amétropies les plus fréquentes dans votre cohorte et d\'orienter les campagnes de prévention.',
  },
  {
    id: 'demographics',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Segmentation démographique',
    icon: Users,
    color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    badgeColor: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
    chartType: 'Barres verticales',
    norme: '—',
    description: 'Répartition des patients par tranche d\'âge (0-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60+ ans).',
    interpretation: 'Une surreprésentation d\'une tranche d\'âge peut biaiser les résultats d\'autres statistiques. Par exemple, une majorité de patients 40+ augmentera naturellement le taux de presbytie.',
    utilite: 'Aide à planifier les ressources et à cibler les campagnes de dépistage en fonction de la démographie réelle.',
  },
  {
    id: 'gender',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Répartition par sexe',
    icon: Users,
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    chartType: 'Camembert (Pie)',
    norme: '—',
    description: 'Distribution des patients selon le sexe (Homme / Femme / Inconnu). Visualisation en camembert avec pourcentages.',
    interpretation: 'Un déséquilibre de genre peut révéler des biais dans l\'accès aux soins. Certaines pathologies oculaires ont une prévalence différente selon le sexe.',
    utilite: 'Contexte démographique essentiel pour l\'analyse épidémiologique.',
  },
  {
    id: 'motifs',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Motifs de consultation',
    icon: BarChart3,
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    chartType: 'Barres verticales',
    norme: '—',
    description: 'Classement des 8 motifs de consultation les plus fréquents.',
    interpretation: 'Un motif dominant comme « baisse d\'acuité visuelle » peut signaler un besoin de dépistage précoce.',
    utilite: 'Optimise la planification des services et aide à comprendre les besoins de la population consultante.',
  },
  {
    id: 'refraction',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Moyennes de réfraction',
    icon: TrendingUp,
    color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    badgeColor: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    chartType: 'Tableau de moyennes',
    norme: 'ISO 13666:2019',
    description: 'Affiche les moyennes des paramètres de réfraction : ES OD/OG, SPH OD/OG, CYL OD/OG. Calcul : ES = SPH + CYL/2.',
    interpretation: 'Un ES moyen négatif indique une tendance myopique. La comparaison OD/OG permet de détecter des asymétries systématiques.',
    utilite: 'Aperçu rapide du profil réfractif moyen de la cohorte. Utile pour les études comparatives.',
  },
  {
    id: 'astigmatisme',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Distribution de l\'astigmatisme',
    icon: Crosshair,
    color: 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
    badgeColor: 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300',
    chartType: 'Camembert (Pie)',
    norme: 'ISO 13666:2019',
    description: 'Répartition des astigmatismes en 3 catégories : Léger (0.5–1.0 D), Modéré (1.0–2.0 D), Fort (> 2.0 D). CYL ≥ 0.5 D.',
    interpretation: 'Une proportion élevée d\'astigmatismes forts peut nécessiter des verres toriques ou des lentilles spécifiques.',
    utilite: 'Aide à anticiper les besoins en correction torique et à planifier les stocks de lentilles.',
  },
  {
    id: 'pio-dist',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Distribution de la PIO',
    icon: Gauge,
    color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    chartType: 'Histogramme (Barres)',
    norme: 'AAO Preferred Practice Patterns',
    description: 'Histogramme de la PIO (mmHg) par intervalles. Seuil d\'alerte AAO : 21 mmHg.',
    interpretation: 'Les valeurs > 21 mmHg (rouge) nécessitent un suivi ophtalmologique pour exclure un glaucome.',
    utilite: 'Dépistage du glaucome : identifie les patients nécessitant une référence ophtalmologique urgente.',
  },
  {
    id: 'acuite',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Acuité visuelle moyenne',
    icon: Glasses,
    color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    badgeColor: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
    chartType: 'Barres groupées',
    norme: 'ISO 8596',
    description: 'Compare l\'AV moyenne SC et AC pour OD et OG. Notation décimale (1.0 = 10/10).',
    interpretation: 'La différence SC→AC mesure le gain apporté par la correction. Un gain important indique une amétropie bien corrigée.',
    utilite: 'Mesure l\'efficacité de la correction optique et identifie les cas de malvoyance résiduelle.',
  },
  {
    id: 'anisometropie',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Analyse de l\'anisométropie',
    icon: Activity,
    color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    badgeColor: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300',
    chartType: 'Barres verticales',
    norme: 'ISO 14971',
    description: 'Différence d\'ES entre OD et OG. Classée en : Normal (< 1D), Légère (1–2D), Significative (> 2D).',
    interpretation: 'Une anisométropie > 2D peut provoquer une aniséiconie, source d\'inconfort binoculaire.',
    utilite: 'Identifie les patients à risque d\'aniséiconie et oriente vers des corrections adaptées.',
  },
  {
    id: 'presbytie-age',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Presbytie par tranche d\'âge',
    icon: TrendingUp,
    color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    badgeColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    chartType: 'Barres empilées',
    norme: '—',
    description: 'Proportion de presbytes (addition > 0) vs non-presbytes par tranche d\'âge.',
    interpretation: 'La presbytie apparaît vers 40-45 ans et est quasi-universelle après 55 ans.',
    utilite: 'Valide la cohérence des données et aide à planifier l\'offre en verres progressifs.',
  },
  {
    id: 'axes',
    page: 'statistical-analysis',
    pageName: 'Analyse statistique',
    titre: 'Distribution des axes de cylindre',
    icon: Crosshair,
    color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    chartType: 'Radar',
    norme: 'ISO 13666:2019',
    description: 'Distribution radar des axes de cylindre (0°–180°), divisés en 6 secteurs de 30°.',
    interpretation: 'Astigmatisme « selon la règle » (180° ± 30°) : fréquent chez les jeunes. « Contre la règle » (90° ± 30°) : plus fréquent chez les sujets âgés.',
    utilite: 'Comprend l\'orientation des astigmatismes pour adapter les techniques de correction.',
  },
  // ═══ Tableau de bord ════════════════════════════
  {
    id: 'anomalies',
    page: 'medical-dashboard',
    pageName: 'Tableau de bord',
    titre: 'Prévalence des anomalies',
    icon: AlertTriangle,
    color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    chartType: 'Radar',
    norme: '—',
    description: 'Graphique radar montrant la prévalence de chaque type d\'anomalie détectée.',
    interpretation: 'Un radar déséquilibré peut révéler un problème de santé publique spécifique nécessitant une action ciblée.',
    utilite: 'Vue d\'ensemble rapide des principales anomalies pour prioriser les actions de santé publique.',
  },
  {
    id: 'pio',
    page: 'medical-dashboard',
    pageName: 'Tableau de bord',
    titre: 'Évolution de la PIO',
    icon: TrendingUp,
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    chartType: 'Ligne temporelle',
    norme: 'AAO PPP (seuil 21 mmHg)',
    description: 'Courbe d\'évolution de la PIO moyenne avec ligne de référence à 21 mmHg.',
    interpretation: 'Une tendance ascendante signale une augmentation du risque de glaucome.',
    utilite: 'Suivi longitudinal du risque de glaucome à l\'échelle de la cohorte.',
  },
  {
    id: 'epi-demographics',
    page: 'medical-dashboard',
    pageName: 'Tableau de bord',
    titre: 'Segmentation démographique (épidémiologique)',
    icon: PieChart,
    color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    badgeColor: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
    chartType: 'Camembert (Pie)',
    norme: '—',
    description: 'Camembert de la répartition par tranche d\'âge depuis la perspective épidémiologique.',
    interpretation: 'Quelles tranches d\'âge sont les plus touchées par les consultations de dépistage.',
    utilite: 'Planification des campagnes de dépistage par tranche d\'âge.',
  },
  {
    id: 'alerts',
    page: 'medical-dashboard',
    pageName: 'Dashboard épidémiologique',
    titre: 'Alertes cliniques actives',
    icon: AlertTriangle,
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    chartType: 'Liste avec indicateurs',
    norme: 'ISO 14971',
    description: 'Liste des patients nécessitant une attention clinique immédiate : PIO > 21 mmHg, AV basse, anisométropie significative.',
    interpretation: 'Alertes rouges = priorité. Alertes oranges = suivi rapproché.',
    utilite: 'Garantit qu\'aucun patient à risque ne passe entre les mailles du filet.',
  },
  // ═══ Bilans Simplifiés ══════════════════════════
  {
    id: 's-ametropie',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Répartition des amétropies (simplifiés)',
    icon: Eye,
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    badgeColor: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    chartType: 'Barres horizontales',
    norme: 'OMS – Bulletin de la santé visuelle mondiale',
    description: 'Distribution des types d\'amétropie (Myopie, Hypermétropie, Astigmatisme, Presbytie, Anisométropie) détectés lors des dépistages rapides. Un patient peut présenter plusieurs amétropies. Classification selon les recommandations OMS sur les erreurs de réfraction non corrigées.',
    interpretation: 'Indique les amétropies prédominantes. Selon l\'OMS, les erreurs de réfraction non corrigées sont la 1re cause de déficience visuelle mondiale. Une forte prévalence de myopie chez les jeunes peut orienter les campagnes de prévention.',
    utilite: 'Identifie les tendances d\'amétropie dans la population dépistée pour adapter les ressources et répondre aux objectifs VISION 2020 / LANCE de l\'OMS.',
  },
  {
    id: 's-anomalies',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Répartition des anomalies (simplifiés)',
    icon: AlertTriangle,
    color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    badgeColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    chartType: 'Radar',
    norme: 'ICD-11 (CIM-11) · AAO PPP',
    description: 'Graphique radar des anomalies visuelles détectées : Strabisme, Amblyopie, Nystagmus, Daltonisme, Ptosis, Cataracte, Glaucome, Kératocône. Classification conforme à la CIM-11 (Classification Internationale des Maladies, OMS).',
    interpretation: 'Un radar déséquilibré révèle les anomalies dominantes. Selon l\'AAO Preferred Practice Patterns, le strabisme et l\'amblyopie requièrent un dépistage précoce chez l\'enfant. Le glaucome et la cataracte nécessitent un suivi ophtalmologique.',
    utilite: 'Vue d\'ensemble des pathologies détectées pour prioriser les références ophtalmologiques selon les critères AAO PPP.',
  },
  {
    id: 's-acuite',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Distribution de l\'acuité visuelle (simplifiés)',
    icon: Crosshair,
    color: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    badgeColor: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
    chartType: 'Barres verticales',
    norme: 'ISO 8596 · OMS ICD-11 9D90',
    description: 'Histogramme des niveaux d\'acuité visuelle (de PL- à 10/10) selon l\'échelle décimale ISO 8596. Inclut les notations basse vision : PL-, PL+, VBLM, CLD, <1/10. Seuils OMS : déficience visuelle légère (< 6/12), modérée (< 6/18), sévère (< 6/60), cécité (< 3/60 ou PL-).',
    interpretation: 'Selon la classification OMS ICD-11 9D90 : AV < 3/10 = déficience visuelle modérée, AV < 1/10 = déficience sévère. Une concentration vers les valeurs basses indique un besoin élevé de correction optique.',
    utilite: 'Évalue le niveau de vision selon les seuils OMS et identifie les cas de malvoyance nécessitant une prise en charge.',
  },
  {
    id: 's-statut',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Statut réfractif (simplifiés)',
    icon: Gauge,
    color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    badgeColor: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    chartType: 'Camembert (Pie)',
    norme: 'ISO 13666:2019',
    description: 'Proportion de patients emmétropes (vision normale sans correction, ES ≈ 0 D) vs non emmétropes (nécessitant une correction optique). Classification selon ISO 13666:2019 pour la définition de l\'emmétropie.',
    interpretation: 'Selon l\'OMS, 2.7 milliards de personnes ont besoin d\'une correction optique. Un taux élevé de « Non emmétrope » dans votre cohorte indique un besoin important de correction.',
    utilite: 'Indicateur clé pour mesurer le taux d\'erreurs réfractives non corrigées et planifier les corrections optiques.',
  },
  {
    id: 's-sexe',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Répartition par sexe (simplifiés)',
    icon: Users,
    color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    chartType: 'Camembert (Pie)',
    norme: 'Déclaration d\'Helsinki · STROBE',
    description: 'Distribution des patients dépistés selon le sexe (Homme / Femme). Stratification requise par les lignes directrices STROBE (STrengthening the Reporting of OBservational Studies in Epidemiology).',
    interpretation: 'Un déséquilibre de sexe peut révéler des biais dans l\'accès au dépistage. Selon l\'OMS, les femmes représentent 55% des personnes atteintes de déficience visuelle.',
    utilite: 'Contexte démographique essentiel pour la validité statistique et la conformité aux normes de publication épidémiologique (STROBE).',
  },
  {
    id: 's-demo',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Segmentation par tranche d\'âge (simplifiés)',
    icon: BarChart3,
    color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    badgeColor: 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300',
    chartType: 'Barres verticales',
    norme: 'OMS VISION 2020 · AAO PPP',
    description: 'Répartition des patients dépistés par tranche d\'âge (0-9, 10-19, 20-29, 30-39, 40-49, 50-59, 60+ ans). Tranches alignées sur les recommandations AAO pour le dépistage par âge.',
    interpretation: 'L\'AAO recommande un dépistage systématique chez l\'enfant (3-5 ans), puis à 40 ans minimum. L\'OMS via VISION 2020 cible les populations à risque par tranche d\'âge.',
    utilite: 'Planification des campagnes de dépistage ciblées selon les priorités AAO PPP et les objectifs OMS VISION 2020.',
  },
  // ═══ Bilans Simplifiés – Statistiques basées sur les normes ══
  {
    id: 's-deficience',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Classification déficience visuelle (OMS)',
    icon: Eye,
    color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    badgeColor: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    chartType: 'Barres verticales',
    norme: 'ISO 8596 · OMS ICD-11 9D90',
    description: 'Classification des patients selon les seuils de déficience visuelle de l\'OMS (ICD-11 9D90). Basée sur la conversion de l\'acuité visuelle en valeur décimale : Normal (≥ 8/10), Déficience légère (< 8/10), Modérée (< 5/10), Sévère (< 3/10), Cécité légale (< 1/10), Cécité (< 0.5/10).',
    interpretation: 'Permet d\'évaluer la répartition de la sévérité des problèmes visuels. Une concentration dans les catégories "Déficience modérée" à "Cécité" indique un besoin accru de prise en charge ophtalmologique.',
    utilite: 'Outil de stratification clinique conforme aux seuils OMS pour prioriser les patients nécessitant une intervention urgente.',
  },
  {
    id: 's-ametropie-sexe',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Amétropies par sexe',
    icon: Users,
    color: 'bg-lime-50 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400',
    badgeColor: 'bg-lime-100 dark:bg-lime-900/50 text-lime-700 dark:text-lime-300',
    chartType: 'Barres empilées horizontales',
    norme: 'STROBE · ISO 13666:2019',
    description: 'Croisement des types d\'amétropie avec le sexe du patient. Stratification démographique conforme aux lignes directrices STROBE pour les études observationnelles. Terminologie des amétropies selon ISO 13666:2019.',
    interpretation: 'Révèle les différences de prévalence des amétropies entre hommes et femmes. Selon l\'OMS, les femmes sont davantage touchées par les erreurs réfractives non corrigées.',
    utilite: 'Analyse genrée des amétropies pour adapter les stratégies de dépistage et respecter les exigences de publication épidémiologique STROBE.',
  },
  {
    id: 's-anomalies-age',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Anomalies par tranche d\'âge',
    icon: AlertTriangle,
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    badgeColor: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    chartType: 'Barres empilées verticales',
    norme: 'AAO PPP · ICD-11 (CIM-11)',
    description: 'Distribution des anomalies visuelles par tranche d\'âge. Classification ICD-11 : strabisme (9A00), amblyopie (9A01), glaucome (9A61), cataracte (9B10). Tranches d\'âge conformes aux recommandations AAO Preferred Practice Patterns.',
    interpretation: 'L\'AAO recommande un dépistage ciblé par âge : strabisme/amblyopie chez l\'enfant (3-5 ans), glaucome à partir de 40 ans. Un pic d\'anomalies dans une tranche spécifique oriente les priorités de dépistage.',
    utilite: 'Identification des pathologies prédominantes par groupe d\'âge pour planifier les campagnes de dépistage selon les critères AAO PPP.',
  },
  {
    id: 's-emmetropie-age',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Taux de non-emmétropie par tranche d\'âge',
    icon: TrendingUp,
    color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    badgeColor: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    chartType: 'Barres verticales (%)',
    norme: 'OMS VISION 2020 · ISO 13666:2019',
    description: 'Pourcentage de patients non emmétropes par tranche d\'âge. Emmétrope = vision normale sans correction (ES ≈ 0 D, ISO 13666:2019). Indicateur clé de l\'initiative OMS VISION 2020 pour l\'élimination de la cécité évitable.',
    interpretation: 'Un taux élevé de non-emmétropie dans les tranches jeunes peut signaler une épidémie de myopie. Selon l\'OMS, 2,7 milliards de personnes nécessitent une correction optique mondiale.',
    utilite: 'Suivi de la prévalence des erreurs réfractives par âge, aligné sur les objectifs OMS VISION 2020 d\'accès universel à la correction optique.',
  },
  {
    id: 's-anomalies-sexe',
    page: 'bilans-simplifies',
    pageName: 'Bilans simplifiés',
    titre: 'Anomalies par sexe',
    icon: Activity,
    color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
    chartType: 'Barres empilées horizontales',
    norme: 'STROBE · ICD-11 (CIM-11)',
    description: 'Croisement des anomalies visuelles détectées avec le sexe du patient. Stratification conforme aux lignes directrices STROBE. Classification des anomalies selon la CIM-11 (Classification Internationale des Maladies).',
    interpretation: 'Identifie les différences de prévalence des anomalies entre hommes et femmes. Certaines pathologies comme le daltonisme (8% hommes vs 0.5% femmes) ont une forte composante génétique liée au sexe.',
    utilite: 'Analyse genrée des pathologies pour une stratification épidémiologique rigoureuse conforme aux normes STROBE et à la Déclaration d\'Helsinki.',
  },
];

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function GuideStatistiques() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [chartVisibleId, setChartVisibleId] = useState(null);
  const [filterPage, setFilterPage] = useState('all');

  // ─── Data: bilans (statistical analysis charts) ────────
  const [bilans, setBilans] = useState([]);
  const [loadingBilans, setLoadingBilans] = useState(true);

  // ─── Data: bilans simplifiés ───────────────────────────
  const [bilansSimples, setBilansSimples] = useState([]);
  const [loadingSimples, setLoadingSimples] = useState(true);

  // ─── Data: epidemiological dashboard ───────────────────
  const [anomalies, setAnomalies] = useState([]);
  const [pioData, setPioData] = useState([]);
  const [epiDemographics, setEpiDemographics] = useState([]);
  const [alertsData, setAlertsData] = useState([]);

  const loadBilans = useCallback(async () => {
    setLoadingBilans(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans?limit=1000');
      if (res.ok) setBilans(await res.json());
    } catch { /* backend offline */ }
    setLoadingBilans(false);
  }, []);

  const loadBilansSimples = useCallback(async () => {
    setLoadingSimples(true);
    try {
      const res = await fetch('http://localhost:8000/api/bilans-simples?limit=1000');
      if (res.ok) setBilansSimples(await res.json());
    } catch { /* backend offline */ }
    setLoadingSimples(false);
  }, []);

  const loadEpiData = useCallback(async () => {
    try {
      const [a, p, d, al] = await Promise.all([
        getAnomalies(), getPioHistory(), getDemographics(), getActiveAlerts(),
      ]);
      setAnomalies(a); setPioData(p); setEpiDemographics(d); setAlertsData(al);
    } catch { /* backend offline */ }
  }, []);

  useEffect(() => { loadBilans(); loadBilansSimples(); loadEpiData(); }, [loadBilans, loadBilansSimples, loadEpiData]);

  // ─── Computed statistics from bilans ───────────────────
  const totalBilans = bilans.length;

  const prevalence = {};
  const astigmatismeCount = { 'Léger': 0, 'Modéré': 0, 'Fort': 0 };
  let presbyCount = 0;
  let pioAlertCount = 0;
  let totalES_OD = 0, totalES_OG = 0, countES = 0;
  let totalSPH_OD = 0, totalSPH_OG = 0, totalCYL_OD = 0, totalCYL_OG = 0, countRx = 0;

  for (const b of bilans) {
    const esOd = calcES(b.rx_od_sphere, b.rx_od_cylindre);
    const esOg = calcES(b.rx_og_sphere, b.rx_og_cylindre);
    const es = esOd !== null ? esOd : esOg;
    const cls = classifyAmetropie(es);
    prevalence[cls] = (prevalence[cls] || 0) + 1;
    const astOd = classifyAstigmatisme(b.rx_od_cylindre);
    const astOg = classifyAstigmatisme(b.rx_og_cylindre);
    if (astOd) astigmatismeCount[astOd]++;
    if (astOg) astigmatismeCount[astOg]++;
    if (parseFloat(b.rx_od_addition) > 0 || parseFloat(b.rx_og_addition) > 0) presbyCount++;
    if (parseFloat(b.pio_od) > 21 || parseFloat(b.pio_og) > 21) pioAlertCount++;
    if (esOd !== null && esOg !== null) { totalES_OD += esOd; totalES_OG += esOg; countES++; }
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

  const prevalenceData = Object.entries(prevalence)
    .map(([name, value]) => ({ name, value, pct: totalBilans ? ((value / totalBilans) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);

  const demoMap = {};
  for (const b of bilans) { const t = getTrancheAge(b.date_naissance); demoMap[t] = (demoMap[t] || 0) + 1; }
  const demoData = Object.entries(demoMap).map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  const genderMap = {};
  for (const b of bilans) { const s = b.sexe || 'Inconnu'; genderMap[s] = (genderMap[s] || 0) + 1; }
  const genderData = Object.entries(genderMap).map(([name, value]) => ({ name, value }));

  const motifMap = {};
  for (const b of bilans) { const m = b.motif_consultation || 'Non spécifié'; motifMap[m] = (motifMap[m] || 0) + 1; }
  const motifData = Object.entries(motifMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

  const astigTotal = Object.values(astigmatismeCount).reduce((a, b) => a + b, 0);
  const astigPieData = Object.entries(astigmatismeCount).filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, pct: astigTotal ? ((value / astigTotal) * 100).toFixed(1) : 0 }));

  const pioBuckets = { '< 10': 0, '10-15': 0, '15-18': 0, '18-21': 0, '21-25': 0, '25-30': 0, '> 30': 0 };
  for (const b of bilans) {
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
  const pioDistData = Object.entries(pioBuckets).map(([name, value]) => ({ name: `${name} mmHg`, value })).filter((d) => d.value > 0);

  let sumAvOdSc = 0, sumAvOgSc = 0, sumAvOdAc = 0, sumAvOgAc = 0, countAvSc = 0, countAvAc = 0;
  for (const b of bilans) {
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

  const anisoData = { 'Normal (< 1D)': 0, 'Légère (1-2D)': 0, 'Significative (> 2D)': 0 };
  for (const b of bilans) {
    const esOd = calcES(b.rx_od_sphere, b.rx_od_cylindre);
    const esOg = calcES(b.rx_og_sphere, b.rx_og_cylindre);
    if (esOd !== null && esOg !== null) {
      const diff = Math.abs(esOd - esOg);
      if (diff < 1) anisoData['Normal (< 1D)']++;
      else if (diff <= 2) anisoData['Légère (1-2D)']++;
      else anisoData['Significative (> 2D)']++;
    }
  }
  const anisoChartData = Object.entries(anisoData).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);

  const presbyByAge = {};
  for (const b of bilans) {
    const t = getTrancheAge(b.date_naissance);
    if (!presbyByAge[t]) presbyByAge[t] = { tranche: t, presbyte: 0, nonPresbye: 0 };
    if (parseFloat(b.rx_od_addition) > 0 || parseFloat(b.rx_og_addition) > 0) presbyByAge[t].presbyte++;
    else presbyByAge[t].nonPresbye++;
  }
  const presbyByAgeData = Object.values(presbyByAge).sort((a, b) => {
    const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
    return order.indexOf(a.tranche) - order.indexOf(b.tranche);
  });

  const axeBuckets = { '0-30°': 0, '31-60°': 0, '61-90°': 0, '91-120°': 0, '121-150°': 0, '151-180°': 0 };
  for (const b of bilans) {
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

  const pieData = epiDemographics.map((d) => ({ name: d.tranche || d.name, value: d.count || d.value }));

  // ═══ Bilans Simplifiés – Computed statistics ═══════════
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

  const totalSimple = bilansSimples.length;

  const sAmetropieMap = {};
  for (const b of bilansSimples) {
    for (const v of parseSimpleValues(b.ametropie, SIMPLE_AMETROPIE_ALIASES)) {
      sAmetropieMap[v] = (sAmetropieMap[v] || 0) + 1;
    }
  }
  const sAmetropieData = Object.entries(sAmetropieMap)
    .map(([name, value]) => ({ name, value, pct: totalSimple ? ((value / totalSimple) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.value - a.value);

  const sAnomaliesMap = {};
  for (const b of bilansSimples) {
    for (const v of parseSimpleValues(b.anomalies, SIMPLE_ANOMALIE_ALIASES)) {
      if (v !== SIMPLE_NO_ANOMALY_LABEL) sAnomaliesMap[v] = (sAnomaliesMap[v] || 0) + 1;
    }
  }
  const sAnomaliesData = Object.entries(sAnomaliesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const sAcuiteMap = {};
  for (const b of bilansSimples) {
    if (b.acuite_visuelle) sAcuiteMap[b.acuite_visuelle] = (sAcuiteMap[b.acuite_visuelle] || 0) + 1;
  }
  const acuiteOrder = ['PL-', 'PL+', 'VBLM', 'CLD', '<1/10', '1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10'];
  const sAcuiteData = Object.entries(sAcuiteMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => acuiteOrder.indexOf(a.name) - acuiteOrder.indexOf(b.name));

  const sStatutMap = {};
  for (const b of bilansSimples) {
    if (b.statut_refractif) sStatutMap[b.statut_refractif] = (sStatutMap[b.statut_refractif] || 0) + 1;
  }
  const sStatutData = Object.entries(sStatutMap).map(([name, value]) => ({ name, value }));

  const sSexeMap = {};
  for (const b of bilansSimples) {
    const s = b.sexe || 'Inconnu';
    sSexeMap[s] = (sSexeMap[s] || 0) + 1;
  }
  const sSexeData = Object.entries(sSexeMap).map(([name, value]) => ({ name, value }));

  const sDemoMap = {};
  for (const b of bilansSimples) {
    const t = getTrancheFromAge(b.age);
    sDemoMap[t] = (sDemoMap[t] || 0) + 1;
  }
  const sDemoData = Object.entries(sDemoMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => {
      const order = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });

  // ═══ Bilans Simplifiés – Statistiques basées sur les normes ═══
  function acuiteToDecimal(av) {
    if (!av) return null;
    const special = { 'PL-': 0, 'PL+': 0.01, 'VBLM': 0.02, 'CLD': 0.04, '<1/10': 0.05 };
    if (special[av] !== undefined) return special[av];
    const parts = av.split('/');
    if (parts.length === 2) {
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
  for (const b of bilansSimples) {
    const dec = acuiteToDecimal(b.acuite_visuelle);
    const cat = classifierDeficienceOMS(dec);
    sDeficienceMap[cat] = (sDeficienceMap[cat] || 0) + 1;
  }
  const deficienceOrder = ['Normal (≥ 8/10)', 'Déficience légère', 'Déficience modérée', 'Déficience sévère', 'Cécité légale', 'Cécité', 'Non classifié'];
  const sDeficienceData = Object.entries(sDeficienceMap)
    .map(([name, value]) => ({ name, value, pct: totalSimple ? ((value / totalSimple) * 100).toFixed(1) : 0 }))
    .sort((a, b) => deficienceOrder.indexOf(a.name) - deficienceOrder.indexOf(b.name));
  const deficienceColors = { 'Normal (≥ 8/10)': '#10b981', 'Déficience légère': '#f59e0b', 'Déficience modérée': '#f97316', 'Déficience sévère': '#ef4444', 'Cécité légale': '#dc2626', 'Cécité': '#991b1b', 'Non classifié': '#6b7280' };

  const sAmetropieBySexe = {};
  for (const b of bilansSimples) {
    const s = b.sexe || 'Inconnu';
    for (const v of parseSimpleValues(b.ametropie, SIMPLE_AMETROPIE_ALIASES)) {
      if (!sAmetropieBySexe[v]) sAmetropieBySexe[v] = {};
      sAmetropieBySexe[v][s] = (sAmetropieBySexe[v][s] || 0) + 1;
    }
  }
  const allSexesSimple = [...new Set(bilansSimples.map(b => b.sexe || 'Inconnu'))];
  const sAmetropieBySexeData = Object.entries(sAmetropieBySexe)
    .map(([name, sexes]) => ({ name, ...sexes }))
    .sort((a, b) => {
      const totalA = allSexesSimple.reduce((s, k) => s + (a[k] || 0), 0);
      const totalB = allSexesSimple.reduce((s, k) => s + (b[k] || 0), 0);
      return totalB - totalA;
    });

  const sAnomaliesByAge = {};
  for (const b of bilansSimples) {
    const t = getTrancheFromAge(b.age);
    for (const v of parseSimpleValues(b.anomalies, SIMPLE_ANOMALIE_ALIASES)) {
      if (v !== SIMPLE_NO_ANOMALY_LABEL) {
        if (!sAnomaliesByAge[t]) sAnomaliesByAge[t] = {};
        sAnomaliesByAge[t][v] = (sAnomaliesByAge[t][v] || 0) + 1;
      }
    }
  }
  const allAnomaliesNames = [
    ...new Set(
      bilansSimples.flatMap((b) =>
        parseSimpleValues(b.anomalies, SIMPLE_ANOMALIE_ALIASES).filter((a) => a !== SIMPLE_NO_ANOMALY_LABEL)
      )
    ),
  ];
  const ageOrderSimple = ['0-9 ans', '10-19 ans', '20-29 ans', '30-39 ans', '40-49 ans', '50-59 ans', '60+ ans', 'Inconnu'];
  const sAnomaliesByAgeData = Object.entries(sAnomaliesByAge)
    .map(([tranche, anomalies]) => ({ tranche, ...anomalies }))
    .sort((a, b) => ageOrderSimple.indexOf(a.tranche) - ageOrderSimple.indexOf(b.tranche));

  const sEmmetropieByAge = {};
  for (const b of bilansSimples) {
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
    .sort((a, b) => ageOrderSimple.indexOf(a.tranche) - ageOrderSimple.indexOf(b.tranche));

  const sAnomaliesBySexe = {};
  for (const b of bilansSimples) {
    const s = b.sexe || 'Inconnu';
    for (const v of parseSimpleValues(b.anomalies, SIMPLE_ANOMALIE_ALIASES)) {
      if (v !== SIMPLE_NO_ANOMALY_LABEL) {
        if (!sAnomaliesBySexe[v]) sAnomaliesBySexe[v] = {};
        sAnomaliesBySexe[v][s] = (sAnomaliesBySexe[v][s] || 0) + 1;
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

  // ─── Filter guide cards ────────────────────────────────
  const filtered = STAT_CARDS.filter((s) => {
    if (filterPage !== 'all' && s.page !== filterPage) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.titre.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.norme.toLowerCase().includes(q) ||
        s.chartType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statsPages = [
    { id: 'all', label: 'Tout' },
    { id: 'statistical-analysis', label: 'Analyse statistique' },
    { id: 'medical-dashboard', label: 'Dashboard épidémiologique' },
    { id: 'bilans-simplifies', label: 'Bilans simplifiés' },
  ];

  const toggleChart = (id) => {
    setChartVisibleId((prev) => (prev === id ? null : id));
  };

  // ─── Render chart by ID ────────────────────────────────
  const renderChart = (id) => {
    const isEpiChart = ['anomalies', 'pio', 'epi-demographics', 'alerts'].includes(id);
    const isSimpleChart = id.startsWith('s-');

    if (isSimpleChart && loadingSimples) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-emerald-500" size={20} />
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">Chargement des bilans simplifiés...</span>
        </div>
      );
    }

    if (isSimpleChart && totalSimple === 0) {
      return (
        <div className="text-center py-8">
          <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune donnée de bilans simplifiés. Importez des bilans simplifiés pour voir ce graphique.</p>
        </div>
      );
    }

    if (!isEpiChart && !isSimpleChart && loadingBilans) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-blue-500" size={20} />
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">Chargement des données...</span>
        </div>
      );
    }

    if (!isEpiChart && !isSimpleChart && totalBilans === 0) {
      return (
        <div className="text-center py-8">
          <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune donnée disponible. Importez des bilans pour voir ce graphique.</p>
        </div>
      );
    }

    switch (id) {
      case 'prevalence':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={prevalenceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Nombre de cas" radius={[0, 6, 6, 0]}>
                  {prevalenceData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {prevalenceData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-neutral-100 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                </div>
              ))}
            </div>
          </>
        );

      case 'demographics':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={demoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Patients" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'gender':
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPie>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name === 'M' ? 'Masculin' : name === 'F' ? 'Féminin' : name} (${(percent * 100).toFixed(0)}%)`}
                  className="dark:[&_text]:fill-neutral-400">
                  {genderData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      case 'motifs':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={motifData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Nb consultations" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'refraction':
        return (
          <>
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
                    <td className="py-2 px-3 text-center font-mono text-lg text-neutral-800 dark:text-neutral-100">{row.od}</td>
                    <td className="py-2 px-3 text-center font-mono text-lg text-neutral-800 dark:text-neutral-100">{row.og}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase">Presbytie</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{presbyCount}</p>
                <p className="text-[10px] text-amber-500 dark:text-amber-400">{totalBilans ? ((presbyCount / totalBilans) * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
                <p className="text-[10px] font-medium text-cyan-600 dark:text-cyan-400 uppercase">Astigmatisme</p>
                <p className="text-xl font-bold text-cyan-700 dark:text-cyan-300">{astigTotal}</p>
                <p className="text-[10px] text-cyan-500 dark:text-cyan-400">yeux CYL ≥ 0.5 D</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <p className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase">PIO &gt; 21</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">{pioAlertCount}</p>
                <p className="text-[10px] text-red-500 dark:text-red-400">Réf. ophtalmo</p>
              </div>
            </div>
          </>
        );

      case 'astigmatisme':
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPie>
                <Pie data={astigPieData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  label={({ name, pct }) => `${name} (${pct}%)`} className="dark:[&_text]:fill-neutral-400">
                  {astigPieData.map((_, i) => (<Cell key={i} fill={['#06b6d4', '#f59e0b', '#ef4444'][i % 3]} stroke="transparent" />))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      case 'pio-dist':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={pioDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Nb yeux" radius={[6, 6, 0, 0]}>
                {pioDistData.map((d, i) => (
                  <Cell key={i} fill={d.name.includes('21') || d.name.includes('25') || d.name.includes('30') ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'acuite':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={avData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis domain={[0, 1.5]} tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="AV moyenne (décimal)" radius={[6, 6, 0, 0]}>
                  {avData.map((d, i) => (<Cell key={i} fill={d.name.includes('SC') ? '#f59e0b' : '#10b981'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
          </>
        );

      case 'anisometropie':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={anisoChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                {anisoChartData.map((d, i) => (
                  <Cell key={i} fill={d.name.includes('Normal') ? '#10b981' : d.name.includes('Légère') ? '#f59e0b' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'presbytie-age':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={presbyByAgeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="presbyte" name="Presbyte" fill="#f59e0b" stackId="a" />
              <Bar dataKey="nonPresbye" name="Non presbyte" fill="#3b82f6" stackId="a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'axes':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={axeData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Radar name="Nb yeux" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      // ═══ Epidemiological Dashboard Charts ═════════════════
      case 'anomalies':
        return anomalies.length === 0 ? (
          <div className="text-center py-8">
            <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune donnée d'anomalies disponible.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={anomalies} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
              <PolarAngleAxis dataKey="anomalie" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} domain={[0, 'auto']} className="dark:[&_text]:fill-neutral-500" />
              <Radar name="Cas détectés" dataKey="count" stroke={EPI_COLORS.blue} fill={EPI_COLORS.blue} fillOpacity={0.2} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'pio':
        return pioData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune donnée PIO disponible.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={pioData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="patient" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-20} textAnchor="end" height={55} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[8, 30]} label={{ value: 'mmHg', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={21} stroke={EPI_COLORS.red} strokeDasharray="4 4" label={{ value: 'Seuil 21 mmHg', position: 'right', style: { fontSize: 10, fill: EPI_COLORS.red } }} />
              <Line type="monotone" dataKey="pio_od" name="PIO OD" stroke={EPI_COLORS.blue} strokeWidth={2} dot={{ r: 4, fill: EPI_COLORS.blue }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="pio_og" name="PIO OG" stroke={EPI_COLORS.emerald} strokeWidth={2} dot={{ r: 4, fill: EPI_COLORS.emerald }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'epi-demographics':
        return pieData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune donnée démographique disponible.</p>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPie>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#d1d5db', strokeWidth: 1 }} className="dark:[&_text]:fill-neutral-400">
                  {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" strokeWidth={2} />))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      case 'alerts':
        return alertsData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune alerte clinique active.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <ClinicalAlerts alerts={alertsData} />
          </div>
        );

      // ═══ Bilans Simplifiés Charts ═════════════════════
      case 's-ametropie':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sAmetropieData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Cas" radius={[0, 6, 6, 0]}>
                  {sAmetropieData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sAmetropieData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-neutral-100 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                </div>
              ))}
            </div>
          </>
        );

      case 's-anomalies':
        return sAnomaliesData.length === 0 ? (
          <div className="text-center py-8">
            <BarChart2 size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Aucune anomalie détectée.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={sAnomaliesData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700 dark:[&>circle]:stroke-neutral-700" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <PolarRadiusAxis tick={{ fontSize: 10, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Radar name="Cas" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 's-acuite':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sAcuiteData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Patients" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 's-statut':
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPie>
                <Pie data={sStatutData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  className="dark:[&_text]:fill-neutral-400">
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      case 's-sexe':
        return (
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPie>
                <Pie data={sSexeData} cx="50%" cy="50%" innerRadius={70} outerRadius={130} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  className="dark:[&_text]:fill-neutral-400">
                  {sSexeData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        );

      case 's-demo':
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sDemoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" name="Patients" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 's-deficience':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sDeficienceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                  {sDeficienceData.map((d, i) => (
                    <Cell key={i} fill={deficienceColors[d.name] || '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sDeficienceData.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-neutral-100 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: deficienceColors[p.name] || '#6b7280' }} />
                    <span className="text-neutral-600 dark:text-neutral-300">{p.name}</span>
                  </div>
                  <span className="font-mono font-semibold text-neutral-700 dark:text-neutral-200">{p.pct}%</span>
                </div>
              ))}
            </div>
          </>
        );

      case 's-ametropie-sexe':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sAmetropieBySexeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allSexesSimple.map((s, i) => (
                  <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-lime-50 dark:bg-lime-900/20 rounded-lg text-xs text-lime-700 dark:text-lime-300">
              <strong>Norme STROBE :</strong> Stratification démographique par sexe – Transparence des caractéristiques de la population étudiée (ISO 13666:2019)
            </div>
          </>
        );

      case 's-anomalies-age':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sAnomaliesByAgeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allAnomaliesNames.map((a, i) => (
                  <Bar key={a} dataKey={a} name={a} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allAnomaliesNames.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300">
              <strong>Normes :</strong> Dépistage AAO PPP par tranche d'âge · Classification ICD-11 : 9A00 (strabisme), 9A01 (amblyopie), 9A61 (glaucome), 9B10 (cataracte)
            </div>
          </>
        );

      case 's-emmetropie-age':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sEmmetropieByAgeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis dataKey="tranche" tick={{ fontSize: 10, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} className="dark:[&_text]:fill-neutral-500" unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="taux" name="% Non emmétrope" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sEmmetropieByAgeData.map((d, i) => (
                <div key={i} className="text-center bg-neutral-100 dark:bg-neutral-700/50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{d.tranche}</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{d.taux}%</p>
                  <p className="text-[10px] text-neutral-400">{d.nonEmmetrope}/{d.total} patients</p>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-xs text-cyan-700 dark:text-cyan-300">
              <strong>Norme OMS VISION 2020 :</strong> Prévalence mondiale amétropies non corrigées ~2,7 milliards · Segmentation par âge (ISO 13666:2019)
            </div>
          </>
        );

      case 's-anomalies-sexe':
        return (
          <>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={sAnomaliesBySexeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:[&>line]:stroke-neutral-700" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: '#6b7280' }} className="dark:[&_text]:fill-neutral-400" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {allSexesSimple.map((s, i) => (
                  <Bar key={s} dataKey={s} name={s} fill={COLORS[i % COLORS.length]} stackId="a" radius={i === allSexesSimple.length - 1 ? [0, 6, 6, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-xs text-purple-700 dark:text-purple-300">
              <strong>Normes :</strong> Stratification STROBE · Classification ICD-11 (CIM-11) · Déclaration d'Helsinki
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
          <BookOpen size={22} className="text-blue-500" />
          Guide des Statistiques
        </h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          Explication détaillée de chaque indicateur statistique · Cliquez sur « Voir le graphique » pour afficher le graphique directement
        </p>
      </div>

      {/* ─── Info Banner ──────────────────────────────────── */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <Info size={18} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Comment utiliser ce guide ?</p>
          <p className="mt-1 text-blue-600 dark:text-blue-400">
            Chaque carte ci-dessous explique un indicateur statistique utilisé dans l'application.
            Cliquez sur une carte pour voir l'explication complète, puis utilisez le bouton
            <strong> « Voir le graphique »</strong> pour afficher le graphique correspondant directement dans cette page.
          </p>
        </div>
      </div>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher un indicateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-700 dark:text-neutral-200 focus:ring-2 focus:ring-blue-500/40 outline-none"
          />
        </div>
        <div className="flex gap-1">
          {statsPages.map((sp) => (
            <button
              key={sp.id}
              onClick={() => setFilterPage(sp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterPage === sp.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Count ────────────────────────────────────────── */}
      <p className="text-xs text-neutral-400 dark:text-neutral-500">
        {filtered.length} indicateur{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
      </p>

      {/* ─── Cards ────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((stat) => {
          const Icon = stat.icon;
          const isOpen = expandedId === stat.id;
          const isChartVisible = chartVisibleId === stat.id;

          return (
            <div
              key={stat.id}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* ── Header (click to expand) ── */}
              <button
                onClick={() => {
                  setExpandedId(isOpen ? null : stat.id);
                  if (isOpen && chartVisibleId === stat.id) setChartVisibleId(null);
                }}
                className="w-full flex items-center gap-4 p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/50"
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${stat.color}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {stat.titre}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${stat.badgeColor}`}>
                      {stat.pageName}
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {stat.chartType}
                    </span>
                    {stat.norme !== '—' && (
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        · {stat.norme}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-neutral-400 dark:text-neutral-500 shrink-0">
                  {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* ── Expanded Content ── */}
              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-neutral-100 dark:border-neutral-700 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {/* Description */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {stat.description}
                      </p>
                    </div>

                    {/* Interprétation */}
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                        Comment interpréter
                      </h4>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {stat.interpretation}
                      </p>
                    </div>

                    {/* Utilité & Actions */}
                    <div className="flex flex-col gap-3">
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 flex-1">
                        <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                          Utilité clinique
                        </h4>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          {stat.utilite}
                        </p>
                      </div>

                      {/* ── Technical Info ── */}
                      <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Détails techniques</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-neutral-400">Type : </span>
                            <span className="text-neutral-700 dark:text-neutral-300 font-medium">{stat.chartType}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400">Norme : </span>
                            <span className="text-neutral-700 dark:text-neutral-300 font-medium">{stat.norme}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Toggle Chart Button ── */}
                      <button
                        onClick={() => toggleChart(stat.id)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                          isChartVisible
                            ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {isChartVisible ? (
                          <>
                            <X size={14} />
                            Masquer le graphique
                          </>
                        ) : (
                          <>
                            <BarChart2 size={14} />
                            Voir le graphique
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ── Inline Chart ── */}
                  {isChartVisible && (
                    <div className="mt-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 animate-fade-in">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 flex items-center gap-2">
                          <BarChart2 size={16} className="text-blue-500" />
                          {stat.titre}
                        </h4>
                        <button
                          onClick={() => toggleChart(stat.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {renderChart(stat.id)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Empty State ──────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Search size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Aucun indicateur ne correspond à votre recherche.
          </p>
        </div>
      )}

      {/* ─── Footer ───────────────────────────────────────── */}
      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 text-xs text-neutral-400 dark:text-neutral-500">
        <p>
          <strong>Note :</strong> Toutes les données sont traitées de manière anonymisée conformément au RGPD et
          à la Déclaration d'Helsinki. Les seuils utilisés sont basés sur les normes ISO et AAO Preferred Practice Patterns.
        </p>
      </div>
    </div>
  );
}
