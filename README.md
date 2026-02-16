# BBA-Data – Système Digital d'Analyse Statistique des Bilans Optométriques

**Mémoire de fin d'études – Institut BBA – Optique et Optométrie**

## Description

BBA-Data est un logiciel desktop conçu pour la collecte, le transfert et l'analyse statistique des bilans optométriques. Il s'inscrit dans le cadre d'un mémoire de fin d'études portant sur l'analyse épidémiologique des troubles visuels.

Le système repose sur une architecture à **3 modules** :

| Module | Fonction |
|--------|----------|
| **Collecte** | Saisie des bilans via formulaire clinique (45+ champs) |
| **Transfert** | Import/export de données au format CSV |
| **Analyse** | Statistiques de prévalence, segmentation démographique, moyennes de réfraction |

## Technologies

- **Frontend** : React 19 · Vite 7 · Tailwind CSS 4 · Recharts · Lucide Icons
- **Backend** : Python 3.13 · FastAPI · Uvicorn · SQLite3
- **Desktop** : Electron 40 · electron-builder (NSIS)
- **Formulaires** : react-hook-form (validation ISO)

## Normes et conformité

- **ISO 13666:2019** – Terminologie ophtalmique, équivalent sphérique (ES = SPH + CYL/2)
- **ISO 8596** – Acuité visuelle (notation décimale)
- **ISO 14971** – Gestion des risques, alertes cliniques automatiques
- **AAO Preferred Practice Patterns** – Seuil PIO > 21 mmHg
- **RGPD (UE 2016/679)** – Protection des données personnelles
- **Déclaration d'Helsinki (AMM 2013)** – Anonymisation des données pour export statistique

## Installation

### Prérequis

- Node.js ≥ 18
- Python ≥ 3.10
- Git

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/MohammedBetkaoui/logiciel.git
cd logiciel

# 2. Installer les dépendances frontend
npm install

# 3. Installer les dépendances backend
pip install -r backend/requirements.txt

# 4. Lancer en mode développement
npm run dev
```

Le backend FastAPI démarre automatiquement sur `http://localhost:8000`.

### Construire l'exécutable (.exe)

```bash
npm run build
npx electron-builder --win
```

Le fichier `BBA-Data Setup 1.0.0.exe` sera généré dans le dossier `release/`.

## Structure du projet

```
logiciel/
├── backend/
│   ├── server.py              # API FastAPI (25+ endpoints)
│   ├── database.py            # Schéma SQLite (patients, examens, prescriptions)
│   ├── clinical_engine.py     # Moteur d'analyse clinique
│   ├── analytics_engine.py    # Moteur statistique (prévalence, classification)
│   ├── rgpd.py                # Anonymisation RGPD / Helsinki
│   └── requirements.txt
├── electron/
│   ├── main.cjs               # Process principal Electron
│   └── preload.cjs            # Bridge IPC (16 canaux)
├── src/
│   ├── pages/
│   │   ├── MedicalDashboard.jsx   # Dashboard épidémiologique
│   │   ├── Patients.jsx           # Gestion des patients
│   │   ├── Bilans.jsx             # Bilans optométriques
│   │   ├── ImportCSV.jsx          # Import CSV (37 colonnes)
│   │   ├── StatisticalAnalysis.jsx # Analyse statistique
│   │   ├── Dashboard.jsx          # Tableau de bord système
│   │   ├── Database.jsx           # Gestion base de données
│   │   ├── Analysis.jsx           # Analyse Python
│   │   └── Settings.jsx           # Paramètres
│   ├── components/
│   │   ├── medical/               # BilanForm, BilanList, BilanDetails
│   │   ├── layout/                # Sidebar, TitleBar, MainLayout
│   │   └── ui/                    # Card, Button, DataTable
│   ├── services/api.js
│   ├── context/ThemeContext.jsx
│   └── hooks/useApi.js
├── image/icon.ico
├── test_import_bilans.csv         # Fichier CSV de test (15 patients)
├── package.json
├── vite.config.js
└── index.html
```

## Fonctionnalités principales

### Collecte
- Formulaire de bilan optométrique complet (45+ champs)
- Acuité visuelle SC/AC (ISO 8596)
- Réfraction objective (autoréfractomètre) et subjective (prescription)
- PIO, distances pupillaires, vision binoculaire
- Alertes cliniques automatiques (PIO > 21 mmHg, anisométropie)

### Transfert
- Import CSV avec validation automatique (37 colonnes attendues)
- Détection du séparateur (virgule / point-virgule)
- Validation des plages : PIO (0–60), AV (0–2.0), SPH (±25), AXE (0–180°)
- Export CSV anonymisé (RGPD + Helsinki)
- Téléchargement de template CSV

### Analyse statistique
- Prévalence des amétropies (myopie, hypermétropie, astigmatisme, emmétrope)
- Classification par équivalent sphérique (ES = SPH + CYL/2)
- Segmentation démographique (âge, sexe, motif de consultation)
- Moyennes de réfraction OD/OG (SPH, CYL, ES)
- Détection presbytie (ADD > 0) et alertes PIO
- Filtres dynamiques (sexe, tranche d'âge)
- Export rapport statistique (.txt)

### Interface
- Mode sombre / clair
- Sidebar 3 modules : Collecte → Transfert → Analyse
- Graphiques Recharts (BarChart, PieChart, RadarChart, LineChart)
- Téléchargement PDF des bilans

## Base de données

SQLite avec 4 tables principales :

| Table | Description |
|-------|-------------|
| `patients` | 17 colonnes (identité, contact, antécédents) |
| `examens` | 45+ colonnes (AV, réfraction, PIO, vision binoculaire) |
| `prescriptions` | Ordonnances liées aux examens |
| `audit_log` | Traçabilité des actions (RGPD) |

## Auteur

**Mohammed Betkaoui** – Institut BBA  
Mémoire de fin d'études en Optique et Optométrie

## Licence

Projet académique – Institut BBA – 2025/2026
