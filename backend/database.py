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

SCHEMA_VERSION = 3

EXAMENS_EXTRA_COLUMNS = {
    "groupe": "TEXT",
    # Anamnese
    "motif_consultation": "TEXT",
    "dernier_examen_ophtalmo": "TEXT",
    "fonction_patient": "TEXT",
    "loisir_patient": "TEXT",
    "symptomes_visuels": "TEXT",
    "symptomes_oculaires": "TEXT",
    "traitement_actuel": "TEXT",
    "port_lunettes": "INTEGER",
    "port_lentilles": "INTEGER",
    "port_reeducation": "INTEGER",
    "comp_actuelle_od_sph": "REAL",
    "comp_actuelle_od_cyl": "REAL",
    "comp_actuelle_od_axe": "INTEGER",
    "comp_actuelle_od_add": "REAL",
    "comp_actuelle_od_prisme": "REAL",
    "comp_actuelle_od_base": "TEXT",
    "comp_actuelle_og_sph": "REAL",
    "comp_actuelle_og_cyl": "REAL",
    "comp_actuelle_og_axe": "INTEGER",
    "comp_actuelle_og_add": "REAL",
    "comp_actuelle_og_prisme": "REAL",
    "comp_actuelle_og_base": "TEXT",
    "pathologie_oculaire_presence": "TEXT",
    "pathologie_oculaire_description": "TEXT",
    "sante_maladie_presence": "TEXT",
    "sante_maladie_detail": "TEXT",
    "sante_medicament_presence": "TEXT",
    "sante_medicament_detail": "TEXT",
    "sante_allergie_presence": "TEXT",
    "sante_allergie_detail": "TEXT",
    "hypothese_clinique": "TEXT",
    # Examen preliminaire
    "harmon_cm": "REAL",
    "revip_cm": "REAL",
    "ppc_pb_cm": "REAL",
    "ppc_pr_cm": "REAL",
    "reflexe_lumiere_mm": "REAL",
    "reflexe_penombre_mm": "REAL",
    "perrla": "TEXT",
    "perrla_remarque": "TEXT",
    "champ_vision_preliminaire": "TEXT",
    "vision_couleurs_methode": "TEXT",
    "vision_couleurs_od": "INTEGER",
    "vision_couleurs_og": "INTEGER",
    "vision_couleurs_odg": "INTEGER",
    # Cover test et AV brute
    "cover_uni_vl": "TEXT",
    "cover_uni_vp": "TEXT",
    "cover_alt_vl": "TEXT",
    "cover_alt_vp": "TEXT",
    "av_brute_vl_od": "TEXT",
    "av_brute_vl_og": "TEXT",
    "av_brute_vl_odg": "TEXT",
    "av_brute_vp_od": "TEXT",
    "av_brute_vp_og": "TEXT",
    "av_brute_vp_odg": "TEXT",
    "ancien_od_sph": "REAL",
    "ancien_od_cyl": "REAL",
    "ancien_od_axe": "INTEGER",
    "ancien_og_sph": "REAL",
    "ancien_og_cyl": "REAL",
    "ancien_og_axe": "INTEGER",
    "ecart_pupillaire_vl_mm": "REAL",
    "ecart_pupillaire_vp_mm": "REAL",
    "methode_equilibre": "TEXT",
    "equilibre_bio_bino": "TEXT",
    "test_equilibre": "TEXT",
    "controle_vb": "INTEGER",
    "essai_compensation": "INTEGER",
    # Vision binoculaire detaillee
    "addition_distance_cm": "REAL",
    "addition_delta": "REAL",
    "phorie_vl_h": "REAL",
    "phorie_vl_v": "REAL",
    "phorie_vp_h": "REAL",
    "phorie_vp_v": "REAL",
    "phorie_associee_vl": "TEXT",
    "phorie_associee_vp": "TEXT",
    "lead_lag_valeur": "REAL",
    "lead_lag_reference": "TEXT",
    "arn_valeur": "REAL",
    "arp_valeur": "REAL",
    "ppa_od_cm": "REAL",
    "ppa_od_amax": "REAL",
    "ppa_og_cm": "REAL",
    "ppa_og_amax": "REAL",
    "ppa_odg_cm": "REAL",
    "ppa_odg_amax": "REAL",
    "aca_calcule": "REAL",
    "aca_gradient": "REAL",
    "flex_bino_cpm": "REAL",
    "flex_mono_od_cpm": "REAL",
    "flex_mono_og_cpm": "REAL",
    "rfn_vl_flou": "REAL",
    "rfn_vl_rupture": "REAL",
    "rfn_vl_reprise": "REAL",
    "rfn_vp_flou": "REAL",
    "rfn_vp_rupture": "REAL",
    "rfn_vp_reprise": "REAL",
    "rfp_vl_flou": "REAL",
    "rfp_vl_rupture": "REAL",
    "rfp_vl_reprise": "REAL",
    "rfp_vp_flou": "REAL",
    "rfp_vp_rupture": "REAL",
    "rfp_vp_reprise": "REAL",
    "zone_vl_points": "TEXT",
    "zone_vp_points": "TEXT",
    "critere_sheard": "TEXT",
    "critere_percival": "TEXT",
    # Prescription finale
    "prescription_finale_od_sph": "REAL",
    "prescription_finale_od_cyl": "REAL",
    "prescription_finale_od_axe": "INTEGER",
    "prescription_finale_od_prisme": "REAL",
    "prescription_finale_od_base": "TEXT",
    "prescription_finale_og_sph": "REAL",
    "prescription_finale_og_cyl": "REAL",
    "prescription_finale_og_axe": "INTEGER",
    "prescription_finale_og_prisme": "REAL",
    "prescription_finale_og_base": "TEXT",
    "prescription_finale_addition": "REAL",
    "prescription_finale_distance_lecture_cm": "REAL",
    # Interpretation
    "interpretation_ppc_statut": "TEXT",
    "interpretation_ppc_valeur": "TEXT",
    "interpretation_phories_statut": "TEXT",
    "interpretation_phories_valeur": "TEXT",
    "interpretation_lead_lag_statut": "TEXT",
    "interpretation_lead_lag_valeur": "TEXT",
    "interpretation_arn_arp_statut": "TEXT",
    "interpretation_arn_arp_valeur": "TEXT",
    "interpretation_ppa_statut": "TEXT",
    "interpretation_ppa_valeur": "TEXT",
    "interpretation_aca_statut": "TEXT",
    "interpretation_aca_valeur": "TEXT",
    "interpretation_flex_statut": "TEXT",
    "interpretation_flex_valeur": "TEXT",
    "interpretation_rf_statut": "TEXT",
    "interpretation_rf_valeur": "TEXT",
}


def _ensure_examens_extra_columns(conn: sqlite3.Connection):
    """Ajoute les nouvelles colonnes de bilan étendu si elles manquent."""
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(examens)").fetchall()}
    added = 0

    for column_name, column_type in EXAMENS_EXTRA_COLUMNS.items():
        if column_name not in existing:
            conn.execute(f"ALTER TABLE examens ADD COLUMN {column_name} {column_type}")
            added += 1

    if added:
        conn.commit()
        logger.info(f"Migration examens: {added} colonnes étendues ajoutées")

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

-- ═══════════════════════════════════════════════════════════════
-- TABLE: bilans_simples – Bilan simplifié (dépistage rapide)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bilans_simples (
    bilan_simple_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    age                 INTEGER NOT NULL,
    sexe                TEXT CHECK(sexe IN ('Homme','Femme')) NOT NULL,
    ametropie           TEXT NOT NULL,           -- Valeurs séparées par virgule
    anomalies           TEXT,           -- Valeurs séparées par virgule
    acuite_visuelle     TEXT,           -- ex: "10/10"
    statut_refractif    TEXT CHECK(statut_refractif IN ('Emmetrope','Non emmetrope')) NOT NULL,
    date_creation       TEXT DEFAULT (datetime('now'))
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
    _ensure_examens_extra_columns(conn)

    # Marquer la version du schéma
    existing = conn.execute("SELECT MAX(version) FROM schema_version").fetchone()[0]
    if not existing or existing < SCHEMA_VERSION:
        conn.execute(
            "INSERT INTO schema_version (version, description) VALUES (?, ?)",
            (SCHEMA_VERSION, "Mise à jour schéma examens – alignement formulaire et import CSV"),
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
