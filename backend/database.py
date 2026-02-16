# ─────────────────────────────────────────────────────────────────
# BBA-Data – Schéma SQLite conforme ISO 13666 / ISO 8596
# Base de données sécurisée pour bilans optométriques (45+ champs)
# ─────────────────────────────────────────────────────────────────

import sqlite3
import os
import hashlib
import logging
from datetime import datetime

logger = logging.getLogger("bbadata.db")

SCHEMA_VERSION = 1

# ─── Schéma principal (terminologie ISO 13666) ─────────────────
SCHEMA_SQL = """
-- ═══════════════════════════════════════════════════════════════
-- TABLE: patients – Données démographiques (RGPD sensible)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS patients (
    patient_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Identité (chiffrement recommandé)
    nom                 TEXT NOT NULL,
    prenom              TEXT NOT NULL,
    date_naissance      TEXT NOT NULL,          -- ISO 8601: YYYY-MM-DD
    sexe                TEXT CHECK(sexe IN ('M','F','Autre')) NOT NULL,
    -- Coordonnées
    adresse             TEXT,
    code_postal         TEXT,
    ville               TEXT,
    telephone           TEXT,
    email               TEXT,
    -- Sécurité sociale / Assurance
    numero_securite_sociale TEXT,
    mutuelle            TEXT,
    numero_adherent     TEXT,
    -- Métadonnées
    date_creation       TEXT DEFAULT (datetime('now')),
    date_modification   TEXT DEFAULT (datetime('now')),
    consentement_rgpd   INTEGER DEFAULT 0,      -- 0=non, 1=oui
    est_archive         INTEGER DEFAULT 0       -- Soft delete (RGPD)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: examens – Consultation optométrique complète
-- Terminologie ISO 13666 (Ophthalmic optics – Vocabulary)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS examens (
    examen_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id          INTEGER NOT NULL,
    date_examen         TEXT NOT NULL DEFAULT (datetime('now')),
    praticien           TEXT NOT NULL,

    -- ─── Acuité Visuelle (ISO 8596 / Échelle décimale) ────────
    -- AV = acuité visuelle; SC = sans correction; AC = avec correction
    av_od_sc            REAL,   -- Acuité OD sans correction (ex: 0.5 = 5/10)
    av_og_sc            REAL,   -- Acuité OG sans correction
    av_od_ac            REAL,   -- Acuité OD avec correction
    av_og_ac            REAL,   -- Acuité OG avec correction
    av_binoculaire      REAL,   -- Acuité binoculaire

    -- ─── Réfraction Objective (Autoréfractomètre) ─────────────
    -- ISO 13666: Sphère (SPH), Cylindre (CYL), Axe (AXE)
    auto_od_sphere      REAL,   -- Sphère OD (dioptries, ex: -2.50)
    auto_od_cylindre    REAL,   -- Cylindre OD (dioptries, ex: -0.75)
    auto_od_axe         INTEGER CHECK(auto_od_axe BETWEEN 0 AND 180),
    auto_og_sphere      REAL,
    auto_og_cylindre    REAL,
    auto_og_axe         INTEGER CHECK(auto_og_axe BETWEEN 0 AND 180),

    -- ─── Réfraction Subjective (Prescription finale) ──────────
    rx_od_sphere        REAL,
    rx_od_cylindre      REAL,
    rx_od_axe           INTEGER CHECK(rx_od_axe BETWEEN 0 AND 180),
    rx_od_addition      REAL,   -- Addition pour presbytie (ex: +2.00)
    rx_od_prisme        REAL,   -- Prisme (dioptries prismatiques)
    rx_od_base_prisme   TEXT CHECK(rx_od_base_prisme IN ('BH','BB','BN','BT',NULL)),

    rx_og_sphere        REAL,
    rx_og_cylindre      REAL,
    rx_og_axe           INTEGER CHECK(rx_og_axe BETWEEN 0 AND 180),
    rx_og_addition      REAL,
    rx_og_prisme        REAL,
    rx_og_base_prisme   TEXT CHECK(rx_og_base_prisme IN ('BH','BB','BN','BT',NULL)),

    -- ─── Distance pupillaire (DP) ─────────────────────────────
    dp_od               REAL,   -- DP monoculaire OD (mm)
    dp_og               REAL,   -- DP monoculaire OG (mm)
    dp_binoculaire      REAL,   -- DP binoculaire totale (mm)

    -- ─── Pression Intraoculaire (PIO) ─────────────────────────
    -- ISO 14971: Alerte si > 21 mmHg
    pio_od              REAL,   -- PIO OD (mmHg)
    pio_og              REAL,   -- PIO OG (mmHg)
    methode_pio         TEXT DEFAULT 'tonometre_air',  -- air, applanation, icare

    -- ─── Examen Complémentaire ────────────────────────────────
    motilite_oculaire   TEXT CHECK(motilite_oculaire IN ('Normale','Anormale',NULL)),
    cover_test          TEXT,
    test_couleurs       TEXT CHECK(test_couleurs IN ('Normal','Déficient',NULL)),
    fond_oeil           TEXT,
    biomicroscopie      TEXT,
    champ_visuel        TEXT CHECK(champ_visuel IN ('Normal','Réduit','Scotome',NULL)),

    -- ─── Observations / Alertes ───────────────────────────────
    diagnostic          TEXT,
    observations        TEXT,
    alerte_clinique     TEXT,       -- Alerte auto-générée par le moteur clinique
    niveau_urgence      INTEGER DEFAULT 0 CHECK(niveau_urgence BETWEEN 0 AND 3),
    -- 0=routine, 1=surveillance, 2=référé, 3=urgence

    -- ─── Métadonnées ──────────────────────────────────────────
    date_creation       TEXT DEFAULT (datetime('now')),
    date_modification   TEXT DEFAULT (datetime('now')),
    signature_hash      TEXT,       -- Intégrité CEI 62304

    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: prescriptions – Ordonnances de verres / lentilles
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    examen_id           INTEGER NOT NULL,
    patient_id          INTEGER NOT NULL,
    date_prescription   TEXT NOT NULL DEFAULT (datetime('now')),

    type_equipement     TEXT CHECK(type_equipement IN (
        'Verres unifocaux','Verres progressifs','Verres bifocaux',
        'Lentilles souples','Lentilles rigides','Lentilles jetables'
    )) NOT NULL,

    -- Prescription OD
    p_od_sphere         REAL,
    p_od_cylindre       REAL,
    p_od_axe            INTEGER,
    p_od_addition       REAL,

    -- Prescription OG
    p_og_sphere         REAL,
    p_og_cylindre       REAL,
    p_og_axe            INTEGER,
    p_og_addition       REAL,

    -- Verres
    type_verre          TEXT,       -- Organique, Minéral, Polycarbonate, Trivex
    indice_refraction   REAL,      -- 1.5, 1.6, 1.67, 1.74
    traitement          TEXT,       -- Anti-reflet, Photochromique, Filtrant bleu
    teinte              TEXT,

    -- Validité
    date_expiration     TEXT,
    est_delivree        INTEGER DEFAULT 0,

    observations        TEXT,
    date_creation       TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (examen_id) REFERENCES examens(examen_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: audit_log – Traçabilité CEI 62304 / RGPD
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    log_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp           TEXT DEFAULT (datetime('now')),
    utilisateur         TEXT NOT NULL,
    action              TEXT NOT NULL,  -- CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN
    table_cible         TEXT,
    enregistrement_id   INTEGER,
    details             TEXT,
    adresse_ip          TEXT,
    niveau              TEXT DEFAULT 'INFO' CHECK(niveau IN ('INFO','WARN','ERROR','CRITICAL'))
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE: schema_version – Migration tracking
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT DEFAULT (datetime('now')),
    description TEXT
);

-- ─── Index pour performances ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_nom ON patients(nom, prenom);
CREATE INDEX IF NOT EXISTS idx_examens_patient ON examens(patient_id, date_examen);
CREATE INDEX IF NOT EXISTS idx_examens_date ON examens(date_examen);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
"""


def init_database(db_path: str = "data/bbadata.db") -> sqlite3.Connection:
    """
    Initialise la base de données SQLite avec le schéma clinique complet.
    Crée le répertoire data/ si inexistant.
    """
    os.makedirs(os.path.dirname(db_path) or ".", exist_ok=True)

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")      # Write-Ahead Logging
    conn.execute("PRAGMA foreign_keys=ON")        # Intégrité référentielle
    conn.execute("PRAGMA busy_timeout=5000")      # Timeout 5s

    conn.executescript(SCHEMA_SQL)

    # Marquer la version du schéma
    existing = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
    if not existing or existing < SCHEMA_VERSION:
        conn.execute(
            "INSERT INTO schema_version (version, description) VALUES (?, ?)",
            (SCHEMA_VERSION, "Schéma initial – ISO 13666 / 45 champs cliniques"),
        )
        conn.commit()

    logger.info(f"Base de données initialisée: {db_path} (v{SCHEMA_VERSION})")
    return conn


def compute_record_hash(record: dict) -> str:
    """
    Calcule un hash SHA-256 d'un enregistrement pour vérification d'intégrité
    (conformité CEI 62304 – traçabilité des données cliniques).
    """
    payload = "|".join(str(v) for v in sorted(record.items()))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def log_audit(
    conn: sqlite3.Connection,
    utilisateur: str,
    action: str,
    table_cible: str = None,
    enregistrement_id: int = None,
    details: str = None,
    niveau: str = "INFO",
):
    """Enregistre une entrée de traçabilité dans audit_log."""
    conn.execute(
        """INSERT INTO audit_log (utilisateur, action, table_cible, enregistrement_id, details, niveau)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (utilisateur, action, table_cible, enregistrement_id, details, niveau),
    )
    conn.commit()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    conn = init_database()
    print("✔ Base de données créée avec succès.")
    conn.close()
