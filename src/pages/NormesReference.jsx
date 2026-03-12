// ─────────────────────────────────────────────────────────────────
// BBA-Data – Référentiel Normatif
// Liste exhaustive des normes, standards et réglementations
// appliqués dans l'application
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  BookOpen,
  Shield,
  Eye,
  AlertTriangle,
  Calendar,
  FileText,
  Scale,
  Heart,
  MonitorCheck,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Stethoscope,
  Activity,
  Globe,
} from 'lucide-react';
import Card from '../components/ui/Card';

// ─── Données des normes ──────────────────────────────────────
const normes = [
  {
    id: 'iso-13666',
    titre: 'ISO 13666:2019',
    nom: 'Optique ophtalmique — Vocabulaire',
    icon: Eye,
    color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    categorie: 'Optique',
    description:
      'Norme internationale définissant la terminologie normalisée de l\'optique ophtalmique, incluant les paramètres de réfraction (Sphère, Cylindre, Axe) et le calcul de la Sphère Équivalente.',
    applicationDansLogiciel: [
      'Terminologie des champs de réfraction : SPH (Sphère), CYL (Cylindre), AXE (Axe)',
      'Calcul de l\'Équivalent Sphérique (ES) : ES = SPH + CYL/2',
      'Classification automatique des amétropies (myopie, hypermétropie, emmétropie, astigmatisme)',
      'Schéma de la base de données – nommage conforme des colonnes cliniques',
      'Analyses statistiques de prévalence des amétropies',
      'Bilans simplifiés – Classification du statut réfractif : Emmétrope / Non emmétrope',
      'Bilans simplifiés – Définition normalisée de l\'emmétropie (absence d\'amétropie significative)',
      'Statistiques normées – Graphique « Taux de non-emmétropie par âge » : définition emmétropie/non-emmétropie selon ISO 13666',
      'Statistiques normées – Graphique « Amétropies par sexe » : classification des types d\'amétropie conforme à la nomenclature ISO 13666',
    ],
    seuils: [
      { label: 'Myopie forte', valeur: 'ES ≤ −6.00 D' },
      { label: 'Myopie modérée', valeur: '−6.00 < ES ≤ −3.00 D' },
      { label: 'Myopie faible', valeur: '−3.00 < ES < −0.50 D' },
      { label: 'Emmétropie', valeur: '−0.50 ≤ ES ≤ +0.50 D' },
      { label: 'Hypermétropie faible', valeur: '+0.50 < ES ≤ +2.00 D' },
      { label: 'Hypermétropie modérée', valeur: '+2.00 < ES ≤ +5.00 D' },
      { label: 'Hypermétropie forte', valeur: 'ES > +5.00 D' },
      { label: 'Statut réfractif (simplifié)', valeur: 'Emmétrope / Non emmétrope' },
    ],
  },
  {
    id: 'iso-8596',
    titre: 'ISO 8596',
    nom: 'Optique ophtalmique — Tests d\'acuité visuelle',
    icon: Eye,
    color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    categorie: 'Optique',
    description:
      'Norme définissant les tests d\'acuité visuelle utilisant l\'anneau de Landolt comme optotype de référence. Spécifie les conditions de mesure, l\'échelle décimale et la taille de référence de l\'optotype (5 minutes d\'arc).',
    applicationDansLogiciel: [
      'Champs d\'acuité visuelle OD/OG : échelle décimale (0.1 à 2.0)',
      'Mesures Sans Correction (SC) et Avec Correction (AC)',
      'Calcul de la taille de l\'optotype en mm à l\'écran',
      'Validation de la cohérence des valeurs d\'acuité saisies',
      'Formulaire de bilan – conformité ISO 8596 sur les champs AV',
      'Bilans simplifiés – Échelle étendue : PL−, PL+, VBLM, CLD, <1/10 … 10/10',
      'Bilans simplifiés – Seuils OMS ICD-11 9D90 pour classification de la déficience visuelle',
      'Statistiques normées – Graphique « Classification déficience visuelle OMS » : conversion AV décimale → catégories OMS (Normal ≥ 8/10, Déficience légère, modérée, sévère, Cécité)',
      'Statistiques normées – KPI « Déficience visuelle » : pourcentage de patients sous seuil normal OMS',
    ],
    seuils: [
      { label: 'Optotype de référence', valeur: '5 arcmin (1.454 mm à 5 m)' },
      { label: 'AV normale', valeur: '≥ 1.0 (10/10)' },
      { label: 'Déficience légère (OMS)', valeur: '< 6/12 (< 5/10)' },
      { label: 'Déficience modérée (OMS)', valeur: '< 6/18 (< 3/10)' },
      { label: 'Déficience sévère (OMS)', valeur: '< 6/60 (< 1/10)' },
      { label: 'Cécité (OMS ICD-11)', valeur: '< 3/60 (< 0.5/10)' },
      { label: 'Basse vision (OMS)', valeur: '< 0.3 (3/10)' },
      { label: 'Cécité légale', valeur: '< 0.05 (1/20)' },
    ],
  },
  {
    id: 'iso-14971',
    titre: 'ISO 14971',
    nom: 'Dispositifs médicaux — Application de la gestion des risques',
    icon: AlertTriangle,
    color: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    categorie: 'Sécurité',
    description:
      'Norme de gestion des risques pour les dispositifs médicaux. Définit le processus d\'identification, d\'évaluation et de contrôle des risques liés à l\'utilisation du logiciel dans un contexte clinique.',
    applicationDansLogiciel: [
      'Système d\'alertes cliniques automatiques à 4 niveaux d\'urgence (0–3)',
      'Seuil PIO > 21 mmHg : alerte normale – suspicion de glaucome',
      'Seuil PIO > 30 mmHg : alerte critique – référé ophtalmo urgent',
      'Détection d\'anisométropie (différence ES OD/OG > 2.00 D)',
      'Validation des données saisies avec messages d\'erreur normalisés',
      'Traçabilité complète des alertes générées dans le pipeline clinique',
    ],
    seuils: [
      { label: 'PIO normale', valeur: '≤ 21 mmHg' },
      { label: 'PIO suspecte (alerte)', valeur: '> 21 mmHg' },
      { label: 'PIO critique (urgent)', valeur: '> 30 mmHg' },
      { label: 'Anisométropie', valeur: 'Δ ES > 2.00 D entre OD et OG' },
    ],
  },
  {
    id: 'iso-10938',
    titre: 'ISO 10938',
    nom: 'Optique ophtalmique — Projecteurs de chartes',
    icon: MonitorCheck,
    color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
    badgeColor: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    categorie: 'Optique',
    description:
      'Norme spécifiant les exigences pour les projecteurs de chartes oculaires utilisés en optométrie. Utilisée conjointement avec l\'ISO 8596 pour le calcul de la taille des optotypes affichés à l\'écran.',
    applicationDansLogiciel: [
      'Calcul de la taille de l\'optotype en mm à distance donnée',
      'Référence pour la calibration des tests d\'acuité visuelle à l\'écran',
    ],
    seuils: [],
  },
  {
    id: 'iso-8601',
    titre: 'ISO 8601',
    nom: 'Représentation des dates et heures',
    icon: Calendar,
    color: 'bg-slate-50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
    categorie: 'Données',
    description:
      'Norme internationale pour la représentation numérique des dates et heures. Garantit l\'interopérabilité des données temporelles dans la base de données et les exports.',
    applicationDansLogiciel: [
      'Format de stockage des dates de naissance : YYYY-MM-DD',
      'Format des dates d\'examen dans la base SQLite',
      'Format des horodatages dans les logs d\'audit (YYYY-MM-DDTHH:MM:SS)',
      'Nommage des fichiers d\'export avec date ISO 8601',
    ],
    seuils: [],
  },
  {
    id: 'aao-ppp',
    titre: 'AAO PPP',
    nom: 'Preferred Practice Patterns — American Academy of Ophthalmology',
    icon: Eye,
    color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    categorie: 'Clinique',
    description:
      'Recommandations cliniques de l\'Académie Américaine d\'Ophtalmologie (AAO) définissant les pratiques préférées pour le dépistage et la prise en charge du glaucome. Référence pour le seuil de pression intraoculaire.',
    applicationDansLogiciel: [
      'Seuil PIO > 21 mmHg pour le dépistage du glaucome',
      'Déclenchement automatique d\'alertes pour référé ophtalmologique',
      'Statistiques du nombre d\'alertes PIO dans l\'analyse statistique',
      'Indicateur « Alertes PIO » sur le tableau de bord',
      'Bilans simplifiés – Dépistage des anomalies visuelles (strabisme, amblyopie, cataracte, glaucome, etc.)',
      'Bilans simplifiés – Recommandations de dépistage par tranche d\'âge selon AAO PPP',
      'Statistiques normées – Graphique « Anomalies par tranche d\'âge » : répartition conforme aux recommandations AAO PPP de dépistage par groupe d\'âge',
    ],
    seuils: [
      { label: 'PIO normale', valeur: '10 – 21 mmHg' },
      { label: 'Hypertonie oculaire', valeur: '> 21 mmHg → Référé ophtalmo' },
    ],
  },
  {
    id: 'rgpd',
    titre: 'RGPD (UE 2016/679)',
    nom: 'Règlement Général sur la Protection des Données',
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    categorie: 'Réglementation',
    description:
      'Règlement européen régissant la protection des données personnelles. Impose des obligations strictes pour le traitement des données de santé : consentement explicite, droit à l\'effacement, pseudonymisation et traçabilité.',
    applicationDansLogiciel: [
      'Champ « consentement_rgpd » obligatoire pour chaque patient',
      'Suppression logique (soft delete) via le champ « est_archive » — droit à l\'oubli',
      'Pseudonymisation des données par hachage SHA-256 lors de l\'export',
      'Export CSV anonymisé : aucune donnée nominative (nom, prénom, date naissance supprimés)',
      'Journal d\'audit traçant toutes les consultations et modifications de données',
      'Module dédié rgpd.py pour la conformité automatique',
    ],
    seuils: [],
  },
  {
    id: 'helsinki',
    titre: 'Déclaration d\'Helsinki (AMM 2013)',
    nom: 'Principes éthiques — Recherche médicale impliquant des êtres humains',
    icon: Heart,
    color: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    categorie: 'Éthique',
    description:
      'Déclaration de l\'Association Médicale Mondiale (AMM) définissant les principes éthiques applicables à la recherche médicale impliquant des êtres humains. Exige l\'anonymisation complète des données avant toute analyse statistique ou épidémiologique.',
    applicationDansLogiciel: [
      'Anonymisation complète des données avant export statistique',
      'Mention systématique sur tous les rapports exportés',
      'Séparation stricte entre données cliniques et données identifiantes',
      'Pied de page de conformité sur les écrans d\'analyse',
      'Bilans simplifiés – Principes éthiques pour l\'analyse par sexe (conformité STROBE)',
      'Bilans simplifiés – Anonymisation des données de dépistage avant analyse statistique',
    ],
    seuils: [],
  },
  {
    id: 'cei-62304',
    titre: 'CEI 62304 (IEC 62304)',
    nom: 'Logiciels de dispositifs médicaux — Processus du cycle de vie',
    icon: FileText,
    color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    categorie: 'Sécurité',
    description:
      'Norme internationale pour le cycle de vie des logiciels de dispositifs médicaux. Définit les exigences de traçabilité, d\'intégrité des données et de gestion de la qualité logicielle.',
    applicationDansLogiciel: [
      'Hash d\'intégrité SHA-256 (signature_hash) sur chaque enregistrement de bilan',
      'Table audit_log : traçabilité de toutes les opérations (création, modification, consultation)',
      'Versioning du schéma de base de données avec historique des migrations',
      'Architecture modulaire du backend (database, clinical_engine, analytics_engine, rgpd)',
    ],
    seuils: [],
  },
  {
    id: 'oms-vision-2020',
    titre: 'OMS VISION 2020 / Bulletin santé visuelle',
    nom: 'Organisation Mondiale de la Santé — Initiative mondiale pour l\'élimination de la cécité évitable',
    icon: Globe,
    color: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    categorie: 'Clinique',
    description:
      'Initiative conjointe OMS / IAPB (VISION 2020) visant l\'élimination de la cécité évitable d\'ici 2020 et au-delà. Le Bulletin de la santé visuelle mondiale de l\'OMS fournit les données épidémiologiques de référence sur la prévalence des amétropies non corrigées (estimées à 2,7 milliards de personnes) et les seuils de déficience visuelle.',
    applicationDansLogiciel: [
      'Bilans simplifiés – Classification des amétropies selon la nomenclature OMS',
      'Bilans simplifiés – Données de prévalence mondiale pour contextualiser les statistiques locales',
      'Bilans simplifiés – Segmentation démographique par tranche d\'âge conforme aux recommandations OMS',
      'Bilans simplifiés – Seuils de déficience visuelle OMS ICD-11 9D90 pour l\'acuité visuelle',
      'Référence épidémiologique sur les écrans de statistiques et guide statistique',
      'Statistiques normées – Graphique « Taux de non-emmétropie par âge » : prévalence des amétropies par tranche d\'âge (réf. ~2,7 milliards de personnes dans le monde)',
      'Statistiques normées – Graphique « Classification déficience visuelle OMS » : seuils OMS (Normal, Déf. légère/modérée/sévère, Cécité)',
    ],
    seuils: [
      { label: 'Amétropies non corrigées (mondial)', valeur: '~2,7 milliards de personnes' },
      { label: 'Déficience visuelle légère', valeur: 'AV < 6/12' },
      { label: 'Déficience visuelle modérée', valeur: 'AV < 6/18' },
      { label: 'Déficience visuelle sévère', valeur: 'AV < 6/60' },
      { label: 'Cécité', valeur: 'AV < 3/60' },
    ],
  },
  {
    id: 'icd-11',
    titre: 'ICD-11 (CIM-11)',
    nom: 'Classification Internationale des Maladies — 11e révision (OMS)',
    icon: Stethoscope,
    color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    categorie: 'Clinique',
    description:
      'Classification internationale de l\'Organisation Mondiale de la Santé pour le codage des maladies, troubles et anomalies. La section 9D (maladies de l\'œil) définit les codes pour les anomalies visuelles détectées lors du dépistage : strabisme, amblyopie, nystagmus, daltonisme, ptosis, cataracte, glaucome, kératocône.',
    applicationDansLogiciel: [
      'Bilans simplifiés – Classification normalisée des 9 anomalies visuelles détectables',
      'Bilans simplifiés – Codage ICD-11 : 9A00 (strabisme), 9D90 (déficience visuelle), 9A01 (amblyopie)',
      'Bilans simplifiés – Statistiques de prévalence des anomalies conformes à la nomenclature CIM-11',
      'Bilans simplifiés – Radar chart des anomalies dans le guide statistique et l\'analyse',
      'Référence croisée avec AAO PPP pour les recommandations de dépistage',
      'Statistiques normées – Graphique « Anomalies par tranche d\'âge » : codage ICD-11 (9A00, 9A01, 9A61, 9B10) pour chaque anomalie par groupe d\'âge',
      'Statistiques normées – Graphique « Anomalies par sexe » : prévalence des anomalies ICD-11 stratifiée par sexe',
      'Statistiques normées – Classification déficience visuelle OMS : seuils ICD-11 9D90 appliqués à l\'acuité visuelle',
    ],
    seuils: [
      { label: 'Strabisme (ICD-11 9A00)', valeur: 'Déviation oculaire mesurable' },
      { label: 'Amblyopie (ICD-11 9A01)', valeur: 'AV < 2 lignes vs œil sain' },
      { label: 'Déficience visuelle (ICD-11 9D90)', valeur: 'AV < 6/12' },
      { label: 'Cataracte (ICD-11 9B10)', valeur: 'Opacification du cristallin' },
      { label: 'Glaucome (ICD-11 9A61)', valeur: 'PIO > 21 mmHg + atteinte NO' },
    ],
  },
  {
    id: 'strobe',
    titre: 'STROBE',
    nom: 'Strengthening the Reporting of Observational Studies in Epidemiology',
    icon: Activity,
    color: 'bg-lime-50 text-lime-600 dark:bg-lime-900/30 dark:text-lime-400',
    badgeColor: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300',
    categorie: 'Épidémiologie',
    description:
      'Recommandations internationales pour le rapport des études observationnelles en épidémiologie. STROBE exige la description systématique des caractéristiques démographiques de la population étudiée, incluant la répartition par sexe et par âge, pour garantir la transparence et la reproductibilité des analyses.',
    applicationDansLogiciel: [
      'Bilans simplifiés – Répartition par sexe (Homme / Femme) conforme aux exigences STROBE',
      'Bilans simplifiés – Segmentation démographique par tranches d\'âge dans les analyses',
      'Bilans simplifiés – Transparence des caractéristiques de la population dans les statistiques',
      'Mention de conformité STROBE dans le guide statistique et les pieds de page d\'analyse',
      'Complément de la Déclaration d\'Helsinki pour l\'éthique des études épidémiologiques',
      'Statistiques normées – Graphique « Amétropies par sexe » : stratification STROBE des amétropies par sexe (Homme / Femme)',
      'Statistiques normées – Graphique « Anomalies par sexe » : stratification STROBE des anomalies visuelles par sexe',
      'Statistiques normées – Export rapport TXT : données stratifiées par sexe conformes aux exigences STROBE',
    ],
    seuils: [],
  },
  {
    id: 'secret-medical',
    titre: 'Secret Médical',
    nom: 'Obligation légale de confidentialité médicale (droit français)',
    icon: Scale,
    color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    categorie: 'Réglementation',
    description:
      'Obligation légale française imposant aux professionnels de santé de préserver la confidentialité des informations relatives aux patients. Appliqué conjointement avec le RGPD pour assurer la protection des données médicales.',
    applicationDansLogiciel: [
      'Module de pseudonymisation intégré (rgpd.py)',
      'Aucune donnée nominative dans les exports statistiques',
      'Architecture empêchant l\'accès direct aux données brutes depuis l\'interface',
      'Séparation des rôles : collecte ≠ analyse ≠ export',
    ],
    seuils: [],
  },
];

const categories = ['Toutes', 'Optique', 'Clinique', 'Sécurité', 'Réglementation', 'Éthique', 'Épidémiologie', 'Données'];

// ─── Composant carte de norme ────────────────────────────────
function NormeCard({ norme, isExpanded, onToggle }) {
  const Icon = norme.icon;

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-xl border transition-all duration-300 ${
        isExpanded
          ? 'border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-500/10'
          : 'border-neutral-200/80 dark:border-neutral-700 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header cliquable */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-5 text-left"
      >
        <div className={`p-2.5 rounded-lg shrink-0 ${norme.color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {norme.titre}
            </h3>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${norme.badgeColor}`}>
              {norme.categorie}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {norme.nom}
          </p>
          {!isExpanded && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 line-clamp-2">
              {norme.description}
            </p>
          )}
        </div>
        <div className="shrink-0 mt-1">
          {isExpanded ? (
            <ChevronUp size={16} className="text-blue-500" />
          ) : (
            <ChevronDown size={16} className="text-neutral-400" />
          )}
        </div>
      </button>

      {/* Contenu déplié */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 animate-[fadeIn_0.2s_ease-out]">
          {/* Description */}
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {norme.description}
          </p>

          {/* Application dans le logiciel */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
              Application dans BBA-Data
            </h4>
            <ul className="space-y-1.5">
              {norme.applicationDansLogiciel.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Seuils et valeurs de référence */}
          {norme.seuils.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Seuils et valeurs de référence
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {norme.seuils.map((seuil, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-700/50 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs text-neutral-600 dark:text-neutral-300">{seuil.label}</span>
                    <span className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-100">
                      {seuil.valeur}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function NormesReference() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const expandAll = () => setExpandedIds(normes.map((n) => n.id));
  const collapseAll = () => setExpandedIds([]);

  // Filtrage
  const filtered = normes.filter((n) => {
    const matchCategory = categoryFilter === 'Toutes' || n.categorie === categoryFilter;
    const matchSearch =
      !search ||
      n.titre.toLowerCase().includes(search.toLowerCase()) ||
      n.nom.toLowerCase().includes(search.toLowerCase()) ||
      n.description.toLowerCase().includes(search.toLowerCase()) ||
      n.applicationDansLogiciel.some((a) => a.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
          Référentiel Normatif
        </h1>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          Normes, standards et réglementations appliqués dans BBA-Data — {normes.length} références
        </p>
      </div>

      {/* ─── Résumé statistique ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Normes ISO', value: normes.filter((n) => n.titre.startsWith('ISO')).length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Clinique', value: normes.filter((n) => n.categorie === 'Clinique').length, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Sécurité', value: normes.filter((n) => n.categorie === 'Sécurité').length, color: 'text-red-600 dark:text-red-400' },
          { label: 'Réglementation', value: normes.filter((n) => n.categorie === 'Réglementation').length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Éthique', value: normes.filter((n) => n.categorie === 'Éthique').length, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Épidémiologie', value: normes.filter((n) => n.categorie === 'Épidémiologie').length, color: 'text-lime-600 dark:text-lime-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 p-4 text-center">
            <p className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Recherche et filtres ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Barre de recherche */}
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Rechercher une norme..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {/* Filtre par catégorie */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tout déplier / replier */}
        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            Tout déplier
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-[11px] font-medium rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* ─── Liste des normes ─────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((norme) => (
            <NormeCard
              key={norme.id}
              norme={norme}
              isExpanded={expandedIds.includes(norme.id)}
              onToggle={() => toggleExpand(norme.id)}
            />
          ))
        ) : (
          <div className="text-center py-12">
            <Search size={32} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Aucune norme ne correspond à votre recherche.
            </p>
          </div>
        )}
      </div>

      {/* ─── Footer ───────────────────────────────────────── */}
      <div className="text-center py-4 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          BBA-Data — Institut BBA · Ce référentiel répertorie les {normes.length} normes et
          réglementations appliquées dans le logiciel · Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  );
}
