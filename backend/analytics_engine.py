# ─────────────────────────────────────────────────────────────────
# BBA-Data – Moteur d'Analyse Avancé (analytics_engine.py)
# Traitement des 45 champs du bilan optométrique
# Sphère Équivalente · Alertes PIO · Progression Myopie
# Conformité ISO 13666 / ISO 8596 / ISO 14971
# ─────────────────────────────────────────────────────────────────

import math
import logging
import sqlite3
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger("bbadata.analytics")


# ═══════════════════════════════════════════════════════════════
# CONSTANTES ISO
# ═══════════════════════════════════════════════════════════════

PIO_SEUIL_NORMAL = 21.0       # mmHg – ISO 14971
PIO_SEUIL_CRITIQUE = 30.0     # mmHg – urgence
MYOPIE_FORTE_SEUIL = -6.0     # D – forte myopie
MYOPIE_SEUIL = -0.50          # D – myopie clinique
HYPERMETROPIE_SEUIL = 0.50    # D – hypermétropie
ANISOMETROPIE_SEUIL = 1.5     # D – différence inter-oculaire significative
PRESBYTIE_AGE_SEUIL = 40      # ans


# ═══════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════

@dataclass
class AnalyseComplete:
    """Résultat complet de l'analyse d'un bilan (45 champs)."""
    # Sphère Équivalente (SE = SPH + CYL/2)
    se_od_auto: Optional[float] = None
    se_og_auto: Optional[float] = None
    se_od_rx: Optional[float] = None
    se_og_rx: Optional[float] = None

    # Classifications
    classification_od: str = ""
    classification_og: str = ""

    # Alertes
    alertes: List[Dict[str, Any]] = field(default_factory=list)

    # Progression myopie
    progression_od: Optional[Dict[str, Any]] = None
    progression_og: Optional[Dict[str, Any]] = None

    # Score de risque global (0-3)
    risque_global: int = 0

    # Anisométropie
    anisometropie: Optional[float] = None
    anisometropie_alerte: bool = False

    # Statistiques PIO
    pio_moyenne: Optional[float] = None
    pio_asymetrie: Optional[float] = None


# ═══════════════════════════════════════════════════════════════
# CALCULS CLINIQUES
# ═══════════════════════════════════════════════════════════════

def calculer_sphere_equivalente(sphere: Optional[float], cylindre: Optional[float]) -> Optional[float]:
    """
    Calcule la Sphère Équivalente (SE) selon ISO 13666.
    SE = SPH + CYL/2
    """
    if sphere is None:
        return None
    cyl = cylindre if cylindre is not None else 0.0
    return round(sphere + cyl / 2.0, 2)


def classifier_amethropie(se: Optional[float], age: int = 0, addition: Optional[float] = None) -> str:
    """
    Classifie l'amétropie selon la sphère équivalente (ISO 13666).
    """
    if se is None:
        return "Non mesurable"

    classifications = []

    if se < -6.0:
        classifications.append("Forte myopie")
    elif se < -3.0:
        classifications.append("Myopie moyenne")
    elif se < MYOPIE_SEUIL:
        classifications.append("Myopie faible")
    elif se > 5.0:
        classifications.append("Forte hypermétropie")
    elif se > 2.0:
        classifications.append("Hypermétropie moyenne")
    elif se > HYPERMETROPIE_SEUIL:
        classifications.append("Hypermétropie faible")
    else:
        classifications.append("Emmétropie")

    if age >= PRESBYTIE_AGE_SEUIL and addition and addition > 0:
        classifications.append("Presbytie")

    return " + ".join(classifications)


def analyser_pio(pio_od: Optional[float], pio_og: Optional[float]) -> List[Dict[str, Any]]:
    """
    Analyse la Pression Intraoculaire (ISO 14971 – gestion des risques).
    Retourne une liste d'alertes.
    """
    alertes = []

    for label, pio in [("OD", pio_od), ("OG", pio_og)]:
        if pio is None:
            continue
        if pio > PIO_SEUIL_CRITIQUE:
            alertes.append({
                "code": f"PIO_CRITIQUE_{label}",
                "message": f"PIO {label} = {pio} mmHg – URGENCE (> {PIO_SEUIL_CRITIQUE})",
                "niveau": 3,
                "recommandation": "Référer ophtalmologue en urgence – suspicion glaucome aigu",
            })
        elif pio > PIO_SEUIL_NORMAL:
            alertes.append({
                "code": f"PIO_ELEVEE_{label}",
                "message": f"PIO {label} = {pio} mmHg – Élevée (> {PIO_SEUIL_NORMAL})",
                "niveau": 2,
                "recommandation": "Référer ophtalmologue pour bilan glaucome complet",
            })

    # Asymétrie PIO
    if pio_od is not None and pio_og is not None:
        diff = abs(pio_od - pio_og)
        if diff > 5.0:
            alertes.append({
                "code": "PIO_ASYMETRIE",
                "message": f"Asymétrie PIO significative : {diff:.1f} mmHg entre OD et OG",
                "niveau": 1,
                "recommandation": "Vérifier la mesure et surveiller – asymétrie > 5 mmHg",
            })

    return alertes


def analyser_anisometropie(se_od: Optional[float], se_og: Optional[float]) -> Dict[str, Any]:
    """Détecte l'anisométropie (différence > 1.5 D inter-oculaire)."""
    if se_od is None or se_og is None:
        return {"diff": None, "alerte": False}

    diff = abs(se_od - se_og)
    alerte = diff > ANISOMETROPIE_SEUIL
    return {
        "diff": round(diff, 2),
        "alerte": alerte,
        "message": f"Anisométropie de {diff:.2f} D" if alerte else None,
    }


def calculer_progression_myopie(
    db_conn: sqlite3.Connection,
    patient_id: int,
    oeil: str = "od",
) -> Optional[Dict[str, Any]]:
    """
    Calcule la progression de la myopie sur les examens précédents.
    Retourne le taux de progression annuel moyen (D/an).
    """
    col_sph = f"rx_{oeil}_sphere"
    col_cyl = f"rx_{oeil}_cylindre"

    rows = db_conn.execute(
        f"""SELECT date_examen, {col_sph}, {col_cyl}
            FROM examens
            WHERE patient_id = ? AND {col_sph} IS NOT NULL
            ORDER BY date_examen ASC""",
        (patient_id,),
    ).fetchall()

    if len(rows) < 2:
        return None

    # Calculer les SE pour chaque examen
    points = []
    for row in rows:
        r = dict(row)
        se = calculer_sphere_equivalente(r[col_sph], r.get(col_cyl))
        if se is not None:
            try:
                dt = datetime.fromisoformat(r["date_examen"].replace("Z", ""))
                points.append((dt, se))
            except (ValueError, TypeError):
                continue

    if len(points) < 2:
        return None

    # Progression entre le premier et le dernier examen
    dt_first, se_first = points[0]
    dt_last, se_last = points[-1]
    delta_years = (dt_last - dt_first).days / 365.25

    if delta_years < 0.25:  # Moins de 3 mois → pas assez de données
        return None

    progression_totale = se_last - se_first
    progression_annuelle = progression_totale / delta_years

    # Classifier le rythme
    if progression_annuelle < -1.0:
        rythme = "Rapide"
        niveau = 2
    elif progression_annuelle < -0.5:
        rythme = "Modéré"
        niveau = 1
    elif progression_annuelle < -0.25:
        rythme = "Lent"
        niveau = 0
    else:
        rythme = "Stable"
        niveau = 0

    return {
        "progression_totale": round(progression_totale, 2),
        "progression_annuelle": round(progression_annuelle, 2),
        "nb_examens": len(points),
        "periode_mois": round(delta_years * 12),
        "rythme": rythme,
        "niveau": niveau,
        "premier_se": round(se_first, 2),
        "dernier_se": round(se_last, 2),
    }


# ═══════════════════════════════════════════════════════════════
# ANALYSE COMPLÈTE D'UN BILAN
# ═══════════════════════════════════════════════════════════════

def analyser_bilan_complet(
    bilan: Dict[str, Any],
    age: int,
    db_conn: Optional[sqlite3.Connection] = None,
) -> AnalyseComplete:
    """
    Analyse complète d'un bilan optométrique (45 champs).
    Retourne un objet AnalyseComplete avec :
    - Sphères équivalentes (auto + Rx)
    - Classifications
    - Alertes PIO
    - Progression myopie
    - Anisométropie
    """
    result = AnalyseComplete()

    # ─── 1. Sphères Équivalentes ──────────────────────────
    result.se_od_auto = calculer_sphere_equivalente(
        bilan.get("auto_od_sphere"), bilan.get("auto_od_cylindre")
    )
    result.se_og_auto = calculer_sphere_equivalente(
        bilan.get("auto_og_sphere"), bilan.get("auto_og_cylindre")
    )
    result.se_od_rx = calculer_sphere_equivalente(
        bilan.get("rx_od_sphere"), bilan.get("rx_od_cylindre")
    )
    result.se_og_rx = calculer_sphere_equivalente(
        bilan.get("rx_og_sphere"), bilan.get("rx_og_cylindre")
    )

    # ─── 2. Classifications ────────────────────────────────
    result.classification_od = classifier_amethropie(
        result.se_od_rx, age,
        bilan.get("rx_od_addition"),
    )
    result.classification_og = classifier_amethropie(
        result.se_og_rx, age,
        bilan.get("rx_og_addition"),
    )

    # ─── 3. Alertes PIO ───────────────────────────────────
    pio_alertes = analyser_pio(bilan.get("pio_od"), bilan.get("pio_og"))
    result.alertes.extend(pio_alertes)

    # PIO stats
    pio_od = bilan.get("pio_od")
    pio_og = bilan.get("pio_og")
    if pio_od is not None and pio_og is not None:
        result.pio_moyenne = round((pio_od + pio_og) / 2, 1)
        result.pio_asymetrie = round(abs(pio_od - pio_og), 1)

    # ─── 4. Anisométropie ─────────────────────────────────
    aniso = analyser_anisometropie(result.se_od_rx, result.se_og_rx)
    result.anisometropie = aniso["diff"]
    result.anisometropie_alerte = aniso["alerte"]
    if aniso["alerte"] and aniso.get("message"):
        result.alertes.append({
            "code": "ANISOMETROPIE",
            "message": aniso["message"],
            "niveau": 1,
            "recommandation": "Vérifier l'équilibre binoculaire – risque d'amblyopie chez l'enfant",
        })

    # ─── 5. Forte myopie ──────────────────────────────────
    for label, se in [("OD", result.se_od_rx), ("OG", result.se_og_rx)]:
        if se is not None and se < MYOPIE_FORTE_SEUIL:
            result.alertes.append({
                "code": f"FORTE_MYOPIE_{label}",
                "message": f"Forte myopie {label} (SE = {se:.2f} D)",
                "niveau": 1,
                "recommandation": "Fond d'œil annuel recommandé – risque de décollement rétinien",
            })

    # ─── 6. Motilité / Champ visuel ───────────────────────
    if bilan.get("motilite_oculaire") == "Anormale":
        result.alertes.append({
            "code": "MOTILITE_ANORMALE",
            "message": "Motilité oculaire anormale",
            "niveau": 1,
            "recommandation": "Examen orthoptique complet recommandé",
        })

    if bilan.get("champ_visuel") in ("Réduit", "Scotome"):
        result.alertes.append({
            "code": "CHAMP_VISUEL_ALTERE",
            "message": f"Champ visuel {bilan['champ_visuel'].lower()}",
            "niveau": 2,
            "recommandation": "Périmétrie automatisée + référer ophtalmologue",
        })

    if bilan.get("test_couleurs") == "Déficient":
        result.alertes.append({
            "code": "DYSCHROMATOPSIE",
            "message": "Déficience de la vision des couleurs",
            "niveau": 0,
            "recommandation": "Informer le patient – impact possible sur certaines professions",
        })

    # ─── 7. Presbytie non corrigée ────────────────────────
    if age >= PRESBYTIE_AGE_SEUIL:
        add_od = bilan.get("rx_od_addition")
        add_og = bilan.get("rx_og_addition")
        if (add_od is None or add_od == 0) and (add_og is None or add_og == 0):
            result.alertes.append({
                "code": "PRESBYTIE_NON_CORRIGEE",
                "message": f"Patient de {age} ans sans addition – presbytie probable non corrigée",
                "niveau": 0,
                "recommandation": "Vérifier la vision de près et proposer une addition",
            })

    # ─── 8. Progression myopie ────────────────────────────
    if db_conn is not None and bilan.get("patient_id"):
        result.progression_od = calculer_progression_myopie(db_conn, bilan["patient_id"], "od")
        result.progression_og = calculer_progression_myopie(db_conn, bilan["patient_id"], "og")

        for label, prog in [("OD", result.progression_od), ("OG", result.progression_og)]:
            if prog and prog["niveau"] >= 1:
                result.alertes.append({
                    "code": f"PROGRESSION_MYOPIE_{label}",
                    "message": f"Progression myopie {label} : {prog['progression_annuelle']:.2f} D/an ({prog['rythme']})",
                    "niveau": prog["niveau"],
                    "recommandation": "Envisager un contrôle de la myopie (orthokératologie, atropine)",
                })

    # ─── 9. Risque global ─────────────────────────────────
    if result.alertes:
        result.risque_global = max(a["niveau"] for a in result.alertes)

    logger.info(
        f"Analyse bilan patient #{bilan.get('patient_id')} : "
        f"SE OD={result.se_od_rx}, SE OG={result.se_og_rx}, "
        f"Risque={result.risque_global}, Alertes={len(result.alertes)}"
    )

    return result


# ═══════════════════════════════════════════════════════════════
# STATISTIQUES AGRÉGÉES
# ═══════════════════════════════════════════════════════════════

def generer_statistiques_bilans(db_conn: sqlite3.Connection) -> Dict[str, Any]:
    """
    Génère des statistiques agrégées sur l'ensemble des bilans.
    """
    rows = db_conn.execute(
        """SELECT e.*, p.date_naissance, p.sexe
           FROM examens e
           JOIN patients p ON e.patient_id = p.patient_id
           WHERE p.est_archive = 0"""
    ).fetchall()

    if not rows:
        return {
            "total_bilans": 0,
            "categories": {},
            "pio_stats": {},
            "myopie_stats": {},
        }

    bilans = [dict(r) for r in rows]
    total = len(bilans)

    # Comptage par catégorie
    categories = {
        "myopie": 0, "hypermetropie": 0, "emmetropie": 0,
        "astigmatisme": 0, "presbytie": 0, "forte_myopie": 0,
    }

    pio_values = []
    se_values = []

    for b in bilans:
        se_od = calculer_sphere_equivalente(b.get("rx_od_sphere"), b.get("rx_od_cylindre"))
        se_og = calculer_sphere_equivalente(b.get("rx_og_sphere"), b.get("rx_og_cylindre"))

        for se in [se_od, se_og]:
            if se is not None:
                se_values.append(se)
                if se < MYOPIE_FORTE_SEUIL:
                    categories["forte_myopie"] += 1
                    categories["myopie"] += 1
                elif se < MYOPIE_SEUIL:
                    categories["myopie"] += 1
                elif se > HYPERMETROPIE_SEUIL:
                    categories["hypermetropie"] += 1
                else:
                    categories["emmetropie"] += 1

        # Astigmatisme
        for cyl_key in ["rx_od_cylindre", "rx_og_cylindre"]:
            cyl = b.get(cyl_key)
            if cyl is not None and abs(cyl) >= 0.75:
                categories["astigmatisme"] += 1

        # Presbytie
        for add_key in ["rx_od_addition", "rx_og_addition"]:
            add = b.get(add_key)
            if add is not None and add > 0:
                categories["presbytie"] += 1

        # PIO
        for pio_key in ["pio_od", "pio_og"]:
            pio = b.get(pio_key)
            if pio is not None:
                pio_values.append(pio)

    # Stats PIO
    pio_stats = {}
    if pio_values:
        pio_stats = {
            "moyenne": round(sum(pio_values) / len(pio_values), 1),
            "min": round(min(pio_values), 1),
            "max": round(max(pio_values), 1),
            "nb_elevees": sum(1 for p in pio_values if p > PIO_SEUIL_NORMAL),
            "nb_critiques": sum(1 for p in pio_values if p > PIO_SEUIL_CRITIQUE),
        }

    # Stats SE
    myopie_stats = {}
    if se_values:
        myopie_stats = {
            "moyenne_se": round(sum(se_values) / len(se_values), 2),
            "min_se": round(min(se_values), 2),
            "max_se": round(max(se_values), 2),
        }

    return {
        "total_bilans": total,
        "categories": categories,
        "pio_stats": pio_stats,
        "myopie_stats": myopie_stats,
    }
