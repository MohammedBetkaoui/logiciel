# ─────────────────────────────────────────────────────────────────
# OptiSanté – Serveur FastAPI (server.py)
# API REST pour le frontend Electron/React
# ─────────────────────────────────────────────────────────────────

import logging
import sqlite3
import unicodedata
from contextlib import asynccontextmanager
from datetime import datetime, date
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel, Field, ConfigDict

from database import init_database, log_audit, compute_record_hash
from clinical_engine import (
    ExamenComplet,
    RefractionData,
    analyser_examen,
    analyser_tendances,
    calculer_sphere_equivalente,
    calculer_tranche_age,
    calculer_taille_optotype_mm,
)
from analytics_engine import analyser_bilan_complet, generer_statistiques_bilans
from rgpd import exporter_csv_anonymise, verifier_consentement, droit_a_loubli
from pdf_generator import generate_bilan_pdf_bytes

# ─── Resolve base directory ─────────────────────────────────
import sys as _sys
import os as _os

if getattr(_sys, 'frozen', False):
    # PyInstaller: exe directory
    BASE_DIR = _os.path.dirname(_sys.executable)
else:
    BASE_DIR = _os.path.dirname(_os.path.abspath(__file__))

# Allow override via env var (Electron passes this)
DATA_DIR = _os.environ.get('BBA_DATA_DIR', _os.path.join(BASE_DIR, "data"))
_os.makedirs(DATA_DIR, exist_ok=True)

# ─── Logging ──────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(_os.path.join(DATA_DIR, "optisante.log"), encoding="utf-8"),
    ],
)
logger = logging.getLogger("optisante.api")

# ─── Database connection ─────────────────────────────────────
DB_PATH = _os.path.join(DATA_DIR, "optisante.db")
db_conn: sqlite3.Connection = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_conn
    _os.makedirs(DATA_DIR, exist_ok=True)
    db_conn = init_database(DB_PATH)
    logger.info("Serveur OptiSanté démarré.")
    yield
    db_conn.close()
    logger.info("Serveur OptiSanté arrêté.")


app = FastAPI(
    title="OptiSanté API",
    description="API clinique pour logiciel opticien – ISO 13666 / ISO 14971",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════
# MODÈLES PYDANTIC
# ═══════════════════════════════════════════════════════════════

class PatientCreate(BaseModel):
    nom: str
    prenom: str
    date_naissance: str
    sexe: str = Field(pattern=r"^(M|F|Autre)$")
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    numero_securite_sociale: Optional[str] = None
    mutuelle: Optional[str] = None
    numero_adherent: Optional[str] = None
    consentement_rgpd: int = 0


class ExamenCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    patient_id: int
    praticien: str
    groupe: Optional[str] = None
    date_examen: Optional[str] = None
    av_od_sc: Optional[float] = None
    av_og_sc: Optional[float] = None
    av_od_ac: Optional[float] = None
    av_og_ac: Optional[float] = None
    av_binoculaire: Optional[float] = None
    auto_od_sphere: Optional[float] = None
    auto_od_cylindre: Optional[float] = None
    auto_od_axe: Optional[int] = None
    auto_og_sphere: Optional[float] = None
    auto_og_cylindre: Optional[float] = None
    auto_og_axe: Optional[int] = None
    rx_od_sphere: Optional[float] = None
    rx_od_cylindre: Optional[float] = None
    rx_od_axe: Optional[int] = None
    rx_od_addition: Optional[float] = None
    rx_od_prisme: Optional[float] = None
    rx_od_base_prisme: Optional[str] = None
    rx_og_sphere: Optional[float] = None
    rx_og_cylindre: Optional[float] = None
    rx_og_axe: Optional[int] = None
    rx_og_addition: Optional[float] = None
    rx_og_prisme: Optional[float] = None
    rx_og_base_prisme: Optional[str] = None
    dp_od: Optional[float] = None
    dp_og: Optional[float] = None
    dp_binoculaire: Optional[float] = None
    pio_od: Optional[float] = None
    pio_og: Optional[float] = None
    methode_pio: Optional[str] = None
    motilite_oculaire: Optional[str] = None
    cover_test: Optional[str] = None
    test_couleurs: Optional[str] = None
    fond_oeil: Optional[str] = None
    biomicroscopie: Optional[str] = None
    champ_visuel: Optional[str] = None
    diagnostic: Optional[str] = None
    observations: Optional[str] = None


class QueryRequest(BaseModel):
    query: str


class BilanSimpleCreate(BaseModel):
    age: int = Field(ge=0, le=150)
    sexe: str = Field(pattern=r"^(Homme|Femme)$")
    ametropie: str  # Valeurs séparées par virgule (ex: "Myopie, Astigmatisme")
    anomalies: Optional[str] = None
    acuite_visuelle: Optional[str] = None
    statut_refractif: str = Field(pattern=r"^(Emmetrope|Non emmetrope)$")


def _get_examens_writable_columns(conn: sqlite3.Connection):
    """Liste des colonnes modifiables de la table examens."""
    blocked = {"examen_id", "date_creation", "date_modification"}
    rows = conn.execute("PRAGMA table_info(examens)").fetchall()
    return [r["name"] for r in rows if r["name"] not in blocked]


# ═══════════════════════════════════════════════════════════════
# ROUTES – SANTÉ
# ═══════════════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "online",
        "service": "OptiSanté API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════
# ROUTES – PATIENTS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/patients")
async def list_patients(
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
):
    query = """
        SELECT p.*, 
               (SELECT COUNT(*) FROM examens e WHERE e.patient_id = p.patient_id) as nb_examens,
               (SELECT MAX(e.date_examen) FROM examens e WHERE e.patient_id = p.patient_id) as dernier_examen
        FROM patients p WHERE p.est_archive = 0
    """
    params = []
    if search:
        query += " AND (p.nom LIKE ? OR p.prenom LIKE ? OR p.ville LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    query += " ORDER BY p.nom, p.prenom LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = db_conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@app.delete("/api/patients")
async def delete_all_patients():
    """Supprime tous les patients et tous leurs examens associés."""
    patients_count = db_conn.execute("SELECT COUNT(*) AS c FROM patients").fetchone()["c"]
    examens_count = db_conn.execute("SELECT COUNT(*) AS c FROM examens").fetchone()["c"]

    db_conn.execute("DELETE FROM examens")
    db_conn.execute("DELETE FROM patients")
    db_conn.commit()

    log_audit(db_conn, "system", "DELETE_ALL", "patients", 0)
    return {
        "status": "deleted_all",
        "patients_deleted": patients_count,
        "examens_deleted": examens_count,
    }


@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: int):
    row = db_conn.execute(
        "SELECT * FROM patients WHERE patient_id = ? AND est_archive = 0",
        (patient_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Patient non trouvé")
    log_audit(db_conn, "system", "READ", "patients", patient_id)
    return dict(row)


@app.post("/api/patients")
async def create_patient(patient: PatientCreate):
    try:
        cursor = db_conn.execute(
            """INSERT INTO patients (nom, prenom, date_naissance, sexe, adresse, code_postal,
               ville, telephone, email, numero_securite_sociale, mutuelle, numero_adherent, consentement_rgpd)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                patient.nom, patient.prenom, patient.date_naissance, patient.sexe,
                patient.adresse, patient.code_postal, patient.ville, patient.telephone,
                patient.email, patient.numero_securite_sociale, patient.mutuelle,
                patient.numero_adherent, patient.consentement_rgpd,
            ),
        )
        db_conn.commit()
        patient_id = cursor.lastrowid
        log_audit(db_conn, "system", "CREATE", "patients", patient_id)
        return {"patient_id": patient_id, "status": "created"}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: int):
    """Supprime un patient et tous ses examens associés."""
    row = db_conn.execute(
        "SELECT * FROM patients WHERE patient_id = ? AND est_archive = 0",
        (patient_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Patient non trouvé")
    db_conn.execute("DELETE FROM examens WHERE patient_id = ?", (patient_id,))
    db_conn.execute("DELETE FROM patients WHERE patient_id = ?", (patient_id,))
    db_conn.commit()
    log_audit(db_conn, "system", "DELETE", "patients", patient_id)
    return {"status": "deleted", "patient_id": patient_id}


@app.put("/api/patients/{patient_id}")
async def update_patient(patient_id: int, patient: PatientCreate):
    """Met à jour les informations d'un patient."""
    row = db_conn.execute(
        "SELECT * FROM patients WHERE patient_id = ? AND est_archive = 0",
        (patient_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Patient non trouvé")
    db_conn.execute(
        """UPDATE patients SET nom=?, prenom=?, date_naissance=?, sexe=?, adresse=?, code_postal=?,
           ville=?, telephone=?, email=?, numero_securite_sociale=?, mutuelle=?,
           numero_adherent=?, consentement_rgpd=?, date_modification=datetime('now')
           WHERE patient_id=?""",
        (
            patient.nom, patient.prenom, patient.date_naissance, patient.sexe,
            patient.adresse, patient.code_postal, patient.ville, patient.telephone,
            patient.email, patient.numero_securite_sociale, patient.mutuelle,
            patient.numero_adherent, patient.consentement_rgpd, patient_id,
        ),
    )
    db_conn.commit()
    log_audit(db_conn, "system", "UPDATE", "patients", patient_id)
    return {"status": "updated", "patient_id": patient_id}


# ═══════════════════════════════════════════════════════════════
# ROUTES – EXAMENS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/patients/{patient_id}/examens")
async def list_examens(patient_id: int):
    rows = db_conn.execute(
        "SELECT * FROM examens WHERE patient_id = ? ORDER BY date_examen DESC",
        (patient_id,),
    ).fetchall()
    return [dict(r) for r in rows]


@app.post("/api/examens")
async def create_examen(examen: ExamenCreate):
    # Récupérer l'âge du patient pour l'analyse clinique
    patient = db_conn.execute(
        "SELECT date_naissance FROM patients WHERE patient_id = ?",
        (examen.patient_id,),
    ).fetchone()
    if not patient:
        raise HTTPException(404, "Patient non trouvé")

    # Calcul de l'âge
    naissance = datetime.strptime(patient["date_naissance"], "%Y-%m-%d").date()
    today = date.today()
    age = today.year - naissance.year - ((today.month, today.day) < (naissance.month, naissance.day))

    # Analyse clinique automatique
    exam_data = ExamenComplet(
        patient_id=examen.patient_id,
        patient_age=age,
        date_examen=datetime.now().isoformat(),
        av_od_sc=examen.av_od_sc,
        av_og_sc=examen.av_og_sc,
        av_od_ac=examen.av_od_ac,
        av_og_ac=examen.av_og_ac,
        refraction_od=RefractionData(
            sphere=examen.rx_od_sphere,
            cylindre=examen.rx_od_cylindre,
            axe=examen.rx_od_axe,
            addition=examen.rx_od_addition,
            prisme=examen.rx_od_prisme,
            base_prisme=examen.rx_od_base_prisme,
        ),
        refraction_og=RefractionData(
            sphere=examen.rx_og_sphere,
            cylindre=examen.rx_og_cylindre,
            axe=examen.rx_og_axe,
            addition=examen.rx_og_addition,
            prisme=examen.rx_og_prisme,
            base_prisme=examen.rx_og_base_prisme,
        ),
        pio_od=examen.pio_od,
        pio_og=examen.pio_og,
        motilite_oculaire=examen.motilite_oculaire,
        champ_visuel=examen.champ_visuel,
    )

    analyse = analyser_examen(exam_data)

    # Générer les alertes textuelles
    alerte_text = None
    niveau_urgence = 0
    if analyse.alertes:
        alerte_text = " | ".join(a.message for a in analyse.alertes)
        niveau_urgence = analyse.risque_global

    # Insérer l'examen (inclut tous les champs étendus connus par le schéma)
    data = examen.model_dump()
    data["date_examen"] = data.get("date_examen") or datetime.now().isoformat()
    data["alerte_clinique"] = alerte_text
    data["niveau_urgence"] = niveau_urgence
    data["signature_hash"] = compute_record_hash(data)

    writable_columns = _get_examens_writable_columns(db_conn)
    payload = {col: data.get(col) for col in writable_columns if col in data}

    columns = list(payload.keys())
    placeholders = ",".join("?" for _ in columns)
    cursor = db_conn.execute(
        f"INSERT INTO examens ({', '.join(columns)}) VALUES ({placeholders})",
        tuple(payload[c] for c in columns),
    )
    db_conn.commit()
    examen_id = cursor.lastrowid
    log_audit(db_conn, data["praticien"], "CREATE", "examens", examen_id)

    return {
        "examen_id": examen_id,
        "analyse": {
            "sphere_equivalente_od": analyse.sphere_equivalente_od,
            "sphere_equivalente_og": analyse.sphere_equivalente_og,
            "classification_od": analyse.classification_od,
            "classification_og": analyse.classification_og,
            "alertes": [
                {"code": a.code, "message": a.message, "niveau": a.niveau, "recommandation": a.recommandation}
                for a in analyse.alertes
            ],
            "risque_global": analyse.risque_global,
            "est_valide": analyse.est_valide,
            "erreurs_validation": analyse.erreurs_validation,
        },
    }


# ═══════════════════════════════════════════════════════════════
# ROUTES – DASHBOARD / STATISTIQUES
# ═══════════════════════════════════════════════════════════════

@app.get("/api/dashboard/stats")
async def dashboard_stats():
    """Statistiques globales pour le tableau de bord médical."""
    stats = {}

    # Compteurs généraux
    stats["total_patients"] = db_conn.execute(
        "SELECT COUNT(*) FROM patients WHERE est_archive = 0"
    ).fetchone()[0]
    stats["total_examens"] = db_conn.execute(
        "SELECT COUNT(*) FROM examens"
    ).fetchone()[0]
    stats["alertes_actives"] = db_conn.execute(
        "SELECT COUNT(*) FROM examens WHERE niveau_urgence >= 2"
    ).fetchone()[0]
    stats["examens_ce_mois"] = db_conn.execute(
        "SELECT COUNT(*) FROM examens WHERE date_examen >= date('now','start of month')"
    ).fetchone()[0]

    return stats


@app.get("/api/dashboard/anomalies")
async def dashboard_anomalies():
    """Répartition des anomalies (pour Radar Chart)."""
    anomalies = {
        "Myopie": 0,
        "Hypermétropie": 0,
        "Astigmatisme": 0,
        "Presbytie": 0,
        "PIO élevée": 0,
        "Motilité anormale": 0,
        "Champ visuel réduit": 0,
        "Vision couleurs déficiente": 0,
    }

    rows = db_conn.execute("SELECT * FROM examens").fetchall()
    for row in rows:
        r = dict(row)
        # Myopie
        for sph_key in ["rx_od_sphere", "rx_og_sphere"]:
            if r.get(sph_key) is not None and r[sph_key] < -0.50:
                anomalies["Myopie"] += 1
        # Hypermétropie
        for sph_key in ["rx_od_sphere", "rx_og_sphere"]:
            if r.get(sph_key) is not None and r[sph_key] > 0.50:
                anomalies["Hypermétropie"] += 1
        # Astigmatisme
        for cyl_key in ["rx_od_cylindre", "rx_og_cylindre"]:
            if r.get(cyl_key) is not None and abs(r[cyl_key]) >= 0.75:
                anomalies["Astigmatisme"] += 1
        # Presbytie
        for add_key in ["rx_od_addition", "rx_og_addition"]:
            if r.get(add_key) is not None and r[add_key] > 0:
                anomalies["Presbytie"] += 1
        # PIO
        for pio_key in ["pio_od", "pio_og"]:
            if r.get(pio_key) is not None and r[pio_key] > 21:
                anomalies["PIO élevée"] += 1
        # Motilité
        if r.get("motilite_oculaire") == "Anormale":
            anomalies["Motilité anormale"] += 1
        # Champ visuel
        if r.get("champ_visuel") in ("Réduit", "Scotome"):
            anomalies["Champ visuel réduit"] += 1
        # Couleurs
        if r.get("test_couleurs") == "Déficient":
            anomalies["Vision couleurs déficiente"] += 1

    return [{"anomalie": k, "count": v} for k, v in anomalies.items()]


@app.get("/api/dashboard/pio-history")
async def pio_history():
    """Historique PIO pour Line Chart."""
    rows = db_conn.execute(
        """SELECT e.date_examen, p.nom || ' ' || p.prenom AS patient,
                  e.pio_od, e.pio_og
           FROM examens e JOIN patients p ON e.patient_id = p.patient_id
           WHERE e.pio_od IS NOT NULL OR e.pio_og IS NOT NULL
           ORDER BY e.date_examen"""
    ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/dashboard/demographics")
async def demographics():
    """Démographie patients (Pie Chart)."""
    rows = db_conn.execute(
        """SELECT p.sexe,
                  CASE
                    WHEN (strftime('%Y','now') - strftime('%Y', p.date_naissance)) < 18 THEN '0-17'
                    WHEN (strftime('%Y','now') - strftime('%Y', p.date_naissance)) < 30 THEN '18-29'
                    WHEN (strftime('%Y','now') - strftime('%Y', p.date_naissance)) < 45 THEN '30-44'
                    WHEN (strftime('%Y','now') - strftime('%Y', p.date_naissance)) < 60 THEN '45-59'
                    WHEN (strftime('%Y','now') - strftime('%Y', p.date_naissance)) < 75 THEN '60-74'
                    ELSE '75+'
                  END AS tranche_age,
                  COUNT(*) as count
           FROM patients p WHERE p.est_archive = 0
           GROUP BY sexe, tranche_age"""
    ).fetchall()
    return [dict(r) for r in rows]


@app.get("/api/dashboard/tendances")
async def tendances():
    """Tendances myopie/presbytie par tranche d'âge."""
    rows = db_conn.execute(
        """SELECT e.*,
                  (strftime('%Y','now') - strftime('%Y', p.date_naissance)) AS age
           FROM examens e JOIN patients p ON e.patient_id = p.patient_id"""
    ).fetchall()
    data = [dict(r) for r in rows]
    return analyser_tendances(data)


@app.get("/api/dashboard/alerts")
async def active_alerts():
    """Alertes cliniques actives (niveau ≥ 1)."""
    rows = db_conn.execute(
        """SELECT e.examen_id, e.date_examen, e.alerte_clinique, e.niveau_urgence,
                  e.diagnostic, p.nom, p.prenom, p.patient_id
           FROM examens e JOIN patients p ON e.patient_id = p.patient_id
           WHERE e.niveau_urgence >= 1
           ORDER BY e.niveau_urgence DESC, e.date_examen DESC"""
    ).fetchall()
    return [dict(r) for r in rows]


# ═══════════════════════════════════════════════════════════════
# ROUTES – RGPD
# ═══════════════════════════════════════════════════════════════

@app.get("/api/rgpd/export-csv", response_class=PlainTextResponse)
async def export_anonymised_csv():
    """Export CSV anonymisé conforme RGPD."""
    rows = db_conn.execute(
        """SELECT p.*, e.* FROM patients p
           JOIN examens e ON p.patient_id = e.patient_id
           WHERE p.est_archive = 0"""
    ).fetchall()
    data = [dict(r) for r in rows]
    csv_content = exporter_csv_anonymise(data)
    log_audit(db_conn, "system", "EXPORT", "patients+examens", details="Export CSV anonymisé RGPD")
    return PlainTextResponse(csv_content, media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename=optisante_anonyme_{datetime.now().strftime('%Y%m%d')}.csv"
    })


@app.post("/api/rgpd/droit-oubli/{patient_id}")
async def exercer_droit_oubli(patient_id: int):
    """Droit à l'effacement – Art. 17 RGPD."""
    success = droit_a_loubli(db_conn, patient_id, "system")
    if not success:
        raise HTTPException(500, "Erreur lors de l'anonymisation")
    return {"status": "anonymised", "patient_id": patient_id}


# ═══════════════════════════════════════════════════════════════
# ROUTES – UTILITAIRES CLINIQUES
# ═══════════════════════════════════════════════════════════════

@app.get("/api/clinical/optotype-size")
async def optotype_size(
    acuity: float = Query(..., gt=0, le=2.0),
    distance: float = Query(default=5.0, gt=0),
    ppi: float = Query(default=96.0, gt=0),
):
    """Calcul taille optotype ISO 8596."""
    taille_mm = calculer_taille_optotype_mm(acuity, distance)
    from clinical_engine import calculer_pixels_optotype
    pixels = calculer_pixels_optotype(taille_mm, ppi)
    return {"acuity": acuity, "distance_m": distance, "size_mm": taille_mm, "size_px": pixels}


@app.post("/api/db/query")
async def raw_query(req: QueryRequest):
    """Exécute une requête SQL en lecture seule (SELECT uniquement)."""
    if not req.query.strip().upper().startswith("SELECT"):
        raise HTTPException(400, "Seules les requêtes SELECT sont autorisées.")
    try:
        rows = db_conn.execute(req.query).fetchall()
        log_audit(db_conn, "system", "READ", details=f"Query: {req.query[:100]}")
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(400, str(e))


# ═══════════════════════════════════════════════════════════════
# ROUTES – BILANS OPTOMÉTRIQUES (CRUD complet)
# ═══════════════════════════════════════════════════════════════

@app.get("/api/bilans")
async def list_bilans(
    search: Optional[str] = None,
    urgence: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(default=200, le=1000),
    offset: int = 0,
):
    """Liste tous les bilans (examens) avec info patient."""
    query = """
        SELECT e.*, p.nom, p.prenom, p.date_naissance, p.sexe
        FROM examens e
        JOIN patients p ON e.patient_id = p.patient_id
        WHERE p.est_archive = 0
    """
    params = []

    if search:
        query += " AND (p.nom LIKE ? OR p.prenom LIKE ? OR e.diagnostic LIKE ? OR e.praticien LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])
    if urgence is not None:
        query += " AND e.niveau_urgence = ?"
        params.append(urgence)
    if date_from:
        query += " AND e.date_examen >= ?"
        params.append(date_from)
    if date_to:
        query += " AND e.date_examen <= ?"
        params.append(date_to + "T23:59:59")

    query += " ORDER BY e.date_examen DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = db_conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@app.delete("/api/bilans")
async def delete_all_bilans():
    """Supprime tous les bilans optométriques."""
    bilans_count = db_conn.execute("SELECT COUNT(*) AS c FROM examens").fetchone()["c"]
    db_conn.execute("DELETE FROM examens")
    db_conn.commit()

    log_audit(db_conn, "system", "DELETE_ALL", "examens", 0)
    return {"status": "deleted_all", "bilans_deleted": bilans_count}


@app.get("/api/bilans/{examen_id}")
async def get_bilan(examen_id: int):
    """Récupère un bilan complet avec analyse clinique."""
    row = db_conn.execute(
        """SELECT e.*, p.nom, p.prenom, p.date_naissance, p.sexe,
                  p.adresse, p.code_postal, p.ville, p.telephone, p.email,
                  p.numero_securite_sociale, p.mutuelle, p.numero_adherent,
                  p.consentement_rgpd
           FROM examens e
           JOIN patients p ON e.patient_id = p.patient_id
           WHERE e.examen_id = ?""",
        (examen_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan non trouvé")

    bilan = dict(row)
    log_audit(db_conn, "system", "READ", "examens", examen_id)

    # Calculer l'âge du patient
    try:
        naissance = datetime.strptime(bilan["date_naissance"], "%Y-%m-%d").date()
        today = date.today()
        age = today.year - naissance.year - ((today.month, today.day) < (naissance.month, naissance.day))
    except (ValueError, TypeError):
        age = 0

    # Analyse complète via analytics_engine
    analyse = analyser_bilan_complet(bilan, age, db_conn)

    return {
        "bilan": bilan,
        "analyse": {
            "sphere_equivalente_od": analyse.se_od_rx,
            "sphere_equivalente_og": analyse.se_og_rx,
            "se_od_auto": analyse.se_od_auto,
            "se_og_auto": analyse.se_og_auto,
            "classification_od": analyse.classification_od,
            "classification_og": analyse.classification_og,
            "anisometropie": analyse.anisometropie,
            "pio_moyenne": analyse.pio_moyenne,
            "progression_od": analyse.progression_od,
            "progression_og": analyse.progression_og,
            "risque_global": analyse.risque_global,
            "alertes": analyse.alertes,
        },
    }


@app.get("/api/bilans/{examen_id}/pdf")
async def export_bilan_pdf(examen_id: int):
    """Génère et retourne le PDF du bilan optométrique."""
    row = db_conn.execute(
        """SELECT e.*, p.nom, p.prenom, p.date_naissance, p.sexe,
                  p.adresse, p.code_postal, p.ville, p.telephone, p.email,
                  p.numero_securite_sociale, p.mutuelle, p.numero_adherent,
                  p.consentement_rgpd
           FROM examens e
           JOIN patients p ON e.patient_id = p.patient_id
           WHERE e.examen_id = ?""",
        (examen_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan non trouvé")

    b = dict(row)
    log_audit(db_conn, "system", "EXPORT_PDF", "examens", examen_id)

    urgence_map = {0: "ROUTINE", 1: "SURVEILLANCE", 2: "RÉFÉRÉ", 3: "URGENCE"}

    def _fmt_sphere(v):
        if v is None or str(v).strip() in ("", "None"):
            return "—"
        try:
            n = float(v)
            return f"{n:+.2f} D"
        except (ValueError, TypeError):
            return str(v)

    def _fmt(v, suffix=""):
        if v is None or str(v).strip() in ("", "None"):
            return "—"
        return f"{v}{suffix}"

    pdf_data = {
        "bilan_num": str(examen_id).zfill(4),
        "date": b.get("date_examen", "—"),
        "praticien": b.get("praticien", "—"),
        "patient": {
            "nom": f"{b.get('nom', '')} {b.get('prenom', '')}".strip() or "—",
            "ddn": b.get("date_naissance", "—"),
            "sexe": b.get("sexe", "—"),
            "type": urgence_map.get(b.get("niveau_urgence", 0), "ROUTINE"),
        },
        "acuite_visuelle": {
            "od_sc": _fmt(b.get("av_od_sc")),
            "od_ac": _fmt(b.get("av_od_ac")),
            "og_sc": _fmt(b.get("av_og_sc")),
            "og_ac": _fmt(b.get("av_og_ac")),
            "binoculaire": _fmt(b.get("av_binoculaire")),
        },
        "refraction_objective": {
            "od": {
                "sphere": _fmt_sphere(b.get("auto_od_sphere")),
                "cylindre": _fmt_sphere(b.get("auto_od_cylindre")),
                "axe": _fmt(b.get("auto_od_axe"), "°"),
            },
            "og": {
                "sphere": _fmt_sphere(b.get("auto_og_sphere")),
                "cylindre": _fmt_sphere(b.get("auto_og_cylindre")),
                "axe": _fmt(b.get("auto_og_axe"), "°"),
            },
        },
        "prescription": {
            "od": {
                "sphere": _fmt_sphere(b.get("rx_od_sphere")),
                "cylindre": _fmt_sphere(b.get("rx_od_cylindre")),
                "axe": _fmt(b.get("rx_od_axe"), "°"),
                "addition": _fmt_sphere(b.get("rx_od_addition")),
                "prisme": _fmt(b.get("rx_od_prisme")),
                "base": _fmt(b.get("rx_od_base_prisme")),
            },
            "og": {
                "sphere": _fmt_sphere(b.get("rx_og_sphere")),
                "cylindre": _fmt_sphere(b.get("rx_og_cylindre")),
                "axe": _fmt(b.get("rx_og_axe"), "°"),
                "addition": _fmt_sphere(b.get("rx_og_addition")),
                "prisme": _fmt(b.get("rx_og_prisme")),
                "base": _fmt(b.get("rx_og_base_prisme")),
            },
        },
        "distances_pression": {
            "dp_od": _fmt(b.get("dp_od"), " mm"),
            "dp_og": _fmt(b.get("dp_og"), " mm"),
            "dp_bino": _fmt(b.get("dp_binoculaire"), " mm"),
            "pio_od": _fmt(b.get("pio_od"), " mmHg"),
            "pio_og": _fmt(b.get("pio_og"), " mmHg"),
            "methode": _fmt(b.get("methode_pio")),
        },
        "examens": {
            "motilite": b.get("motilite_oculaire"),
            "cover_test": b.get("cover_test"),
            "test_couleurs": b.get("test_couleurs"),
            "fond_oeil": b.get("fond_oeil"),
            "biomicroscopie": b.get("biomicroscopie"),
            "champ_visuel": b.get("champ_visuel"),
        },
        "diagnostic": b.get("diagnostic"),
        "observations": b.get("observations"),
        "sha256": b.get("signature_hash", "N/A"),
    }

    already_mapped = {
        "examen_id", "patient_id", "date_examen", "praticien", "niveau_urgence", "signature_hash",
        "nom", "prenom", "date_naissance", "sexe", "adresse", "code_postal", "ville", "telephone",
        "email", "numero_securite_sociale", "mutuelle", "numero_adherent", "consentement_rgpd",
        "av_od_sc", "av_od_ac", "av_og_sc", "av_og_ac", "av_binoculaire",
        "auto_od_sphere", "auto_od_cylindre", "auto_od_axe", "auto_og_sphere", "auto_og_cylindre", "auto_og_axe",
        "rx_od_sphere", "rx_od_cylindre", "rx_od_axe", "rx_od_addition", "rx_od_prisme", "rx_od_base_prisme",
        "rx_og_sphere", "rx_og_cylindre", "rx_og_axe", "rx_og_addition", "rx_og_prisme", "rx_og_base_prisme",
        "dp_od", "dp_og", "dp_binoculaire", "pio_od", "pio_og", "methode_pio",
        "motilite_oculaire", "cover_test", "test_couleurs", "fond_oeil", "biomicroscopie", "champ_visuel",
        "diagnostic", "observations", "alerte_clinique", "date_creation", "date_modification",
    }
    pdf_data["donnees_complementaires"] = {
        key: b.get(key)
        for key in sorted(b.keys())
        if key not in already_mapped
    }

    pdf_bytes = generate_bilan_pdf_bytes(pdf_data)
    filename = f"bilan_{examen_id}_{b.get('nom', '')}_{b.get('prenom', '')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.delete("/api/bilans/{examen_id}")
async def delete_bilan(examen_id: int):
    """Supprime un bilan (examen)."""
    row = db_conn.execute(
        "SELECT * FROM examens WHERE examen_id = ?", (examen_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan non trouvé")
    db_conn.execute("DELETE FROM examens WHERE examen_id = ?", (examen_id,))
    db_conn.commit()
    log_audit(db_conn, "system", "DELETE", "examens", examen_id)
    return {"status": "deleted", "examen_id": examen_id}


@app.put("/api/bilans/{examen_id}")
async def update_bilan(examen_id: int, examen: ExamenCreate):
    """Met à jour un bilan existant."""
    row = db_conn.execute(
        "SELECT * FROM examens WHERE examen_id = ?", (examen_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan non trouvé")

    # Récupérer l'âge du patient pour l'analyse clinique
    patient = db_conn.execute(
        "SELECT date_naissance FROM patients WHERE patient_id = ?",
        (examen.patient_id,),
    ).fetchone()
    if not patient:
        raise HTTPException(404, "Patient non trouvé")

    naissance = datetime.strptime(patient["date_naissance"], "%Y-%m-%d").date()
    today = date.today()
    age = today.year - naissance.year - ((today.month, today.day) < (naissance.month, naissance.day))

    # Analyse clinique automatique
    exam_data = ExamenComplet(
        patient_id=examen.patient_id,
        patient_age=age,
        date_examen=datetime.now().isoformat(),
        av_od_sc=examen.av_od_sc,
        av_og_sc=examen.av_og_sc,
        av_od_ac=examen.av_od_ac,
        av_og_ac=examen.av_og_ac,
        refraction_od=RefractionData(
            sphere=examen.rx_od_sphere,
            cylindre=examen.rx_od_cylindre,
            axe=examen.rx_od_axe,
            addition=examen.rx_od_addition,
            prisme=examen.rx_od_prisme,
            base_prisme=examen.rx_od_base_prisme,
        ),
        refraction_og=RefractionData(
            sphere=examen.rx_og_sphere,
            cylindre=examen.rx_og_cylindre,
            axe=examen.rx_og_axe,
            addition=examen.rx_og_addition,
            prisme=examen.rx_og_prisme,
            base_prisme=examen.rx_og_base_prisme,
        ),
        pio_od=examen.pio_od,
        pio_og=examen.pio_og,
        motilite_oculaire=examen.motilite_oculaire,
        champ_visuel=examen.champ_visuel,
    )

    analyse = analyser_examen(exam_data)

    alerte_text = None
    niveau_urgence = 0
    if analyse.alertes:
        alerte_text = " | ".join(a.message for a in analyse.alertes)
        niveau_urgence = analyse.risque_global

    data = examen.model_dump()
    data["alerte_clinique"] = alerte_text
    data["niveau_urgence"] = niveau_urgence
    data["signature_hash"] = compute_record_hash(data)

    writable_columns = set(_get_examens_writable_columns(db_conn))
    update_columns = [key for key in data.keys() if key in writable_columns]
    set_clause = ", ".join(f"{col}=?" for col in update_columns)

    db_conn.execute(
        f"UPDATE examens SET {set_clause}, date_modification=datetime('now') WHERE examen_id=?",
        tuple(data[col] for col in update_columns) + (examen_id,),
    )
    db_conn.commit()
    log_audit(db_conn, data["praticien"], "UPDATE", "examens", examen_id)

    return {
        "examen_id": examen_id,
        "status": "updated",
        "analyse": {
            "sphere_equivalente_od": analyse.sphere_equivalente_od,
            "sphere_equivalente_og": analyse.sphere_equivalente_og,
            "classification_od": analyse.classification_od,
            "classification_og": analyse.classification_og,
            "alertes": [
                {"code": a.code, "message": a.message, "niveau": a.niveau, "recommandation": a.recommandation}
                for a in analyse.alertes
            ],
            "risque_global": analyse.risque_global,
            "est_valide": analyse.est_valide,
            "erreurs_validation": analyse.erreurs_validation,
        },
    }


@app.get("/api/bilans/stats/global")
async def bilans_stats():
    """Statistiques agrégées sur l'ensemble des bilans."""
    return generer_statistiques_bilans(db_conn)


# ═══════════════════════════════════════════════════════════════
# ROUTES – BILANS SIMPLES (dépistage rapide)
# ═══════════════════════════════════════════════════════════════

@app.get("/api/bilans-simples")
async def list_bilans_simples(
    limit: int = Query(default=200, le=1000),
    offset: int = 0,
):
    """Liste tous les bilans simples."""
    rows = db_conn.execute(
        "SELECT * FROM bilans_simples ORDER BY date_creation DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    return [dict(r) for r in rows]


@app.delete("/api/bilans-simples")
async def delete_all_bilans_simples():
    """Supprime tous les bilans simplifiés."""
    bilans_count = db_conn.execute("SELECT COUNT(*) AS c FROM bilans_simples").fetchone()["c"]
    db_conn.execute("DELETE FROM bilans_simples")
    db_conn.commit()

    log_audit(db_conn, "system", "DELETE_ALL", "bilans_simples", 0)
    return {"status": "deleted_all", "bilans_deleted": bilans_count}


@app.post("/api/bilans-simples")
async def create_bilan_simple(bilan: BilanSimpleCreate):
    """Crée un bilan simple (dépistage rapide)."""
    try:
        cursor = db_conn.execute(
            """INSERT INTO bilans_simples (age, sexe, ametropie, anomalies, acuite_visuelle, statut_refractif)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (bilan.age, bilan.sexe, bilan.ametropie, bilan.anomalies,
             bilan.acuite_visuelle, bilan.statut_refractif),
        )
        db_conn.commit()
        bilan_id = cursor.lastrowid
        log_audit(db_conn, "system", "CREATE", "bilans_simples", bilan_id)
        return {"bilan_simple_id": bilan_id, "status": "created"}
    except Exception as e:
        raise HTTPException(400, str(e))


@app.get("/api/bilans-simples/stats")
async def bilans_simples_stats():
    """Statistiques agrégées sur les bilans simplifiés."""
    def _normalize_label(value: str) -> str:
        if not value:
            return ""
        normalized = unicodedata.normalize("NFD", str(value).lower())
        without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
        return " ".join(without_accents.split()).strip()

    ametropie_aliases = {
        "myopie": "Myopie",
        "hypermetropie": "Hypermétropie",
        "astigmatisme": "Astigmatisme",
    }

    anomalie_aliases = {
        "insuffisance d'accommodation": "Insuffisance d'accommodation",
        "exces d'accommodation": "Excès d'accommodation",
        "fatigue accommodative": "Fatigue accommodative",
        "spasme accommodatif": "Spasme accommodatif",
        "inertie accommodative": "Inertie accommodative",
        "paralysie accommodative": "Paralysie accommodative",
        "insuffisance de convergence": "Insuffisance de convergence",
        "pseudo-insuffisance de convergence": "Pseudo-insuffisance de convergence",
        "exces de convergence": "Excès de convergence",
        "insuffisance de convergence pure": "Insuffisance de convergence pure",
        "esophorie basique": "Ésophorie basique",
        "insuffisance de divergence": "Insuffisance de divergence",
        "exophorie basique": "Exophorie basique",
        "exces de divergence": "Excès de divergence",
        "phorie verticale": "Phorie verticale hyper D/G",
        "phorie verticale hyper d/g": "Phorie verticale hyper D/G",
        "phorie verticale hyper g/d": "Phorie verticale hyper G/D",
        "paralysie oculomotrice": "Paralysie oculomotrice",
        "dysfonctionnement vergentiel": "Dysfonctionnement vergentiel",
        "reserves fusionnelles reduites": "Réserves fusionnelles réduites",
        "pas d'anomalie": "Pas d'anomalie",
        "aucune": "Pas d'anomalie",
    }
    no_anomaly_labels = {"Pas d'anomalie", "Aucune"}

    statut_aliases = {
        "emmetrope": "Emmetrope",
        "non emmetrope": "Non emmetrope",
        "non emmetropie": "Non emmetrope",
    }

    def _canonicalize(value: str, aliases: dict) -> str:
        cleaned = str(value).strip()
        key = _normalize_label(cleaned)
        return aliases.get(key, cleaned)

    def _split_multi_values(raw_value: Optional[str], aliases: dict):
        if not raw_value:
            return []
        values = []
        for item in str(raw_value).split(","):
            candidate = item.strip()
            if candidate:
                values.append(_canonicalize(candidate, aliases))
        return values

    rows = db_conn.execute(
        "SELECT * FROM bilans_simples ORDER BY date_creation DESC"
    ).fetchall()
    bilans = [dict(r) for r in rows]
    total = len(bilans)

    # Répartition par sexe
    sexe_map = {}
    for b in bilans:
        s = b.get("sexe", "Inconnu")
        sexe_map[s] = sexe_map.get(s, 0) + 1

    # Répartition par tranche d'âge
    age_map = {}
    for b in bilans:
        age = b.get("age")
        if age is None:
            t = "Inconnu"
        elif age < 10:
            t = "0-9 ans"
        elif age < 20:
            t = "10-19 ans"
        elif age < 30:
            t = "20-29 ans"
        elif age < 40:
            t = "30-39 ans"
        elif age < 50:
            t = "40-49 ans"
        elif age < 60:
            t = "50-59 ans"
        else:
            t = "60+ ans"
        age_map[t] = age_map.get(t, 0) + 1

    # Répartition des amétropies
    ametropie_map = {}
    for b in bilans:
        for ametropie in _split_multi_values(b.get("ametropie", ""), ametropie_aliases):
            ametropie_map[ametropie] = ametropie_map.get(ametropie, 0) + 1

    # Répartition des anomalies
    anomalies_map = {}
    for b in bilans:
        for anomalie in _split_multi_values(b.get("anomalies", ""), anomalie_aliases):
            if anomalie not in no_anomaly_labels:
                anomalies_map[anomalie] = anomalies_map.get(anomalie, 0) + 1

    # Répartition acuité visuelle
    acuite_map = {}
    for b in bilans:
        val = b.get("acuite_visuelle", "")
        if val:
            acuite_map[val] = acuite_map.get(val, 0) + 1

    # Statut réfractif
    statut_map = {}
    for b in bilans:
        val = b.get("statut_refractif", "")
        if val:
            canon = _canonicalize(val, statut_aliases)
            statut_map[canon] = statut_map.get(canon, 0) + 1

    # ─── Classification déficience visuelle OMS (ISO 8596 / ICD-11 9D90) ───
    def _acuite_to_decimal(av_str):
        """Convertit l'acuité visuelle en valeur décimale."""
        if not av_str:
            return None
        av = av_str.strip()
        if av in ("PL-",):
            return 0.0
        if av in ("PL+",):
            return 0.01
        if av in ("VBLM",):
            return 0.02
        if av in ("CLD",):
            return 0.04
        if "/" in av:
            parts = av.replace("<", "").split("/")
            try:
                return float(parts[0]) / float(parts[1])
            except (ValueError, ZeroDivisionError):
                return None
        return None

    def _classifier_deficience_oms(decimal_av):
        """Classifie l'acuité selon les seuils OMS ICD-11 9D90."""
        if decimal_av is None:
            return "Non classifié"
        if decimal_av >= 0.8:
            return "Normal (≥ 8/10)"
        if decimal_av >= 0.5:
            return "Déficience légère (< 8/10)"
        if decimal_av >= 0.3:
            return "Déficience modérée (< 5/10)"
        if decimal_av >= 0.1:
            return "Déficience sévère (< 3/10)"
        if decimal_av >= 0.05:
            return "Cécité légale (< 1/10)"
        return "Cécité (< 0.5/10)"

    deficience_map = {}
    for b in bilans:
        dec = _acuite_to_decimal(b.get("acuite_visuelle", ""))
        cat = _classifier_deficience_oms(dec)
        deficience_map[cat] = deficience_map.get(cat, 0) + 1

    # ─── Amétropies par sexe (STROBE) ─────────────────────────
    def _tranche(age):
        if age is None:
            return "Inconnu"
        if age < 10: return "0-9 ans"
        if age < 20: return "10-19 ans"
        if age < 30: return "20-29 ans"
        if age < 40: return "30-39 ans"
        if age < 50: return "40-49 ans"
        if age < 60: return "50-59 ans"
        return "60+ ans"

    ametropie_par_sexe = {}
    for b in bilans:
        s = b.get("sexe", "Inconnu")
        for ametropie in _split_multi_values(b.get("ametropie", ""), ametropie_aliases):
            key = f"{ametropie}|{s}"
            ametropie_par_sexe[key] = ametropie_par_sexe.get(key, 0) + 1

    # ─── Anomalies par tranche d'âge (AAO PPP / ICD-11) ──────
    anomalies_par_age = {}
    for b in bilans:
        t = _tranche(b.get("age"))
        for anomalie in _split_multi_values(b.get("anomalies", ""), anomalie_aliases):
            if anomalie not in no_anomaly_labels:
                key = f"{anomalie}|{t}"
                anomalies_par_age[key] = anomalies_par_age.get(key, 0) + 1

    # ─── Taux de non-emmétropie par âge (OMS VISION 2020) ─────
    emmetropie_par_age = {}
    for b in bilans:
        t = _tranche(b.get("age"))
        if t not in emmetropie_par_age:
            emmetropie_par_age[t] = {"total": 0, "non_emmetrope": 0}
        emmetropie_par_age[t]["total"] += 1
        if b.get("statut_refractif") == "Non emmetrope":
            emmetropie_par_age[t]["non_emmetrope"] += 1

    # ─── Anomalies par sexe (STROBE / ICD-11) ────────────────
    anomalies_par_sexe = {}
    for b in bilans:
        s = b.get("sexe", "Inconnu")
        for anomalie in _split_multi_values(b.get("anomalies", ""), anomalie_aliases):
            if anomalie not in no_anomaly_labels:
                key = f"{anomalie}|{s}"
                anomalies_par_sexe[key] = anomalies_par_sexe.get(key, 0) + 1

    return {
        "total": total,
        "sexe": sexe_map,
        "tranches_age": age_map,
        "ametropies": ametropie_map,
        "anomalies": anomalies_map,
        "acuite_visuelle": acuite_map,
        "statut_refractif": statut_map,
        "deficience_oms": deficience_map,
        "ametropie_par_sexe": ametropie_par_sexe,
        "anomalies_par_age": anomalies_par_age,
        "emmetropie_par_age": emmetropie_par_age,
        "anomalies_par_sexe": anomalies_par_sexe,
    }


@app.get("/api/bilans-simples/{bilan_id}")
async def get_bilan_simple(bilan_id: int):
    """Récupère un bilan simple par ID."""
    row = db_conn.execute(
        "SELECT * FROM bilans_simples WHERE bilan_simple_id = ?", (bilan_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan simple non trouvé")
    log_audit(db_conn, "system", "READ", "bilans_simples", bilan_id)
    return dict(row)


@app.put("/api/bilans-simples/{bilan_id}")
async def update_bilan_simple(bilan_id: int, bilan: BilanSimpleCreate):
    """Met à jour un bilan simple."""
    row = db_conn.execute(
        "SELECT * FROM bilans_simples WHERE bilan_simple_id = ?", (bilan_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan simple non trouvé")
    db_conn.execute(
        """UPDATE bilans_simples SET age=?, sexe=?, ametropie=?, anomalies=?,
           acuite_visuelle=?, statut_refractif=? WHERE bilan_simple_id=?""",
        (bilan.age, bilan.sexe, bilan.ametropie, bilan.anomalies,
         bilan.acuite_visuelle, bilan.statut_refractif, bilan_id),
    )
    db_conn.commit()
    log_audit(db_conn, "system", "UPDATE", "bilans_simples", bilan_id)
    return {"status": "updated", "bilan_simple_id": bilan_id}


@app.delete("/api/bilans-simples/{bilan_id}")
async def delete_bilan_simple(bilan_id: int):
    """Supprime un bilan simple."""
    row = db_conn.execute(
        "SELECT * FROM bilans_simples WHERE bilan_simple_id = ?", (bilan_id,),
    ).fetchone()
    if not row:
        raise HTTPException(404, "Bilan simple non trouvé")
    db_conn.execute("DELETE FROM bilans_simples WHERE bilan_simple_id = ?", (bilan_id,))
    db_conn.commit()
    log_audit(db_conn, "system", "DELETE", "bilans_simples", bilan_id)
    return {"status": "deleted", "bilan_simple_id": bilan_id}


# ─── Point d'entrée ──────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    is_frozen = getattr(_sys, 'frozen', False)
    is_dev = _os.getenv("NODE_ENV") == "development"

    if is_frozen:
        # PyInstaller: pass app object directly (cannot import by string)
        uvicorn.run(app, host="0.0.0.0", port=8000)
    else:
        # Development: use string for hot-reload support
        _os.chdir(BASE_DIR)
        uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=is_dev)
