# ─────────────────────────────────────────────────────────────────
# BBA-Data – Moteur Clinique (clinical_engine.py)
# Calculs de réfraction normalisés ISO 13666 / ISO 8596
# Alertes cliniques conformes ISO 14971 (Gestion des risques)
# ─────────────────────────────────────────────────────────────────

import math
import logging
from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime, date

logger = logging.getLogger("bbadata.clinical")

# ═══════════════════════════════════════════════════════════════
# CONSTANTES CLINIQUES
# ═══════════════════════════════════════════════════════════════

# ISO 14971 – Seuils d'alerte
PIO_SEUIL_NORMAL = 21.0          # mmHg – au-delà → alerte glaucome
PIO_SEUIL_CRITIQUE = 30.0        # mmHg – au-delà → urgence
SPHERE_MIN = -30.0                # Dioptries
SPHERE_MAX = +30.0
CYLINDRE_MIN = -10.0
CYLINDRE_MAX = +10.0
AXE_MIN = 0
AXE_MAX = 180
ADDITION_MIN = 0.50
ADDITION_MAX = 4.00
DP_MIN = 25.0                     # mm
DP_MAX = 40.0                     # mm (monoculaire)
AV_MIN = 0.0
AV_MAX = 2.0                     # Acuité décimale

# ISO 8596 – Taille d'optotype de référence
# L'optotype standard (anneau de Landolt) sous-tend 5' d'arc à la distance de test
OPTOTYPE_REFERENCE_ARCMIN = 5.0   # minutes d'arc pour AV = 1.0


# ═══════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════

@dataclass
class RefractionData:
    """Données de réfraction pour un œil (terminologie ISO 13666)."""
    sphere: Optional[float] = None       # SPH (dioptries)
    cylindre: Optional[float] = None     # CYL (dioptries)
    axe: Optional[int] = None            # AXE (degrés 0-180)
    addition: Optional[float] = None     # ADD (dioptries, presbytie)
    prisme: Optional[float] = None       # Dioptries prismatiques
    base_prisme: Optional[str] = None    # BH, BB, BN, BT


@dataclass
class ExamenComplet:
    """Données d'un examen optométrique complet."""
    patient_id: int
    patient_age: int
    date_examen: str

    # Acuité visuelle
    av_od_sc: Optional[float] = None
    av_og_sc: Optional[float] = None
    av_od_ac: Optional[float] = None
    av_og_ac: Optional[float] = None

    # Réfraction
    refraction_od: RefractionData = field(default_factory=RefractionData)
    refraction_og: RefractionData = field(default_factory=RefractionData)

    # PIO
    pio_od: Optional[float] = None
    pio_og: Optional[float] = None

    # Motilité
    motilite_oculaire: Optional[str] = None
    champ_visuel: Optional[str] = None


@dataclass
class AlerteClinique:
    """Alerte générée par le moteur clinique (ISO 14971)."""
    code: str
    message: str
    niveau: int               # 0=routine, 1=surveillance, 2=référé, 3=urgence
    recommandation: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ResultatAnalyse:
    """Résultat complet de l'analyse clinique."""
    sphere_equivalente_od: Optional[float] = None
    sphere_equivalente_og: Optional[float] = None
    classification_od: str = ""
    classification_og: str = ""
    alertes: list = field(default_factory=list)
    risque_global: int = 0     # Niveau de risque max parmi les alertes
    est_valide: bool = True
    erreurs_validation: list = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════
# FONCTIONS DE CALCUL (ISO 13666 / ISO 8596)
# ═══════════════════════════════════════════════════════════════

def calculer_sphere_equivalente(sphere: float, cylindre: float) -> float:
    """
    Calcule la Sphère Équivalente (SE) selon ISO 13666.
    
    SE = Sphère + (Cylindre / 2)
    
    La sphère équivalente représente la puissance sphérique qui,
    seule, produirait le même cercle de moindre diffusion.
    
    Args:
        sphere: Puissance sphérique en dioptries
        cylindre: Puissance cylindrique en dioptries
    
    Returns:
        Sphère équivalente en dioptries, arrondie à 0.25 D près
    """
    if sphere is None:
        return 0.0
    cyl = cylindre if cylindre is not None else 0.0
    se = sphere + (cyl / 2.0)
    # Arrondir au quart de dioptrie le plus proche (standard clinique)
    return round(se * 4) / 4


def classifier_amethropie(sphere_eq: float, addition: Optional[float] = None, age: int = 0) -> str:
    """
    Classifie l'amétropie selon la sphère équivalente (ISO 13666).
    
    Args:
        sphere_eq: Sphère équivalente en dioptries
        addition: Addition de près (si presbytie)
        age: Âge du patient
    
    Returns:
        Classification textuelle
    """
    classifications = []

    # Myopie / Hypermétropie
    if sphere_eq < -6.0:
        classifications.append("Forte myopie")
    elif sphere_eq < -3.0:
        classifications.append("Myopie moyenne")
    elif sphere_eq < -0.50:
        classifications.append("Myopie légère")
    elif sphere_eq > 5.0:
        classifications.append("Forte hypermétropie")
    elif sphere_eq > 2.0:
        classifications.append("Hypermétropie moyenne")
    elif sphere_eq > 0.50:
        classifications.append("Hypermétropie légère")
    else:
        classifications.append("Emmétrope")

    # Presbytie
    if addition is not None and addition > 0:
        if addition >= 2.50:
            classifications.append("Presbytie avancée")
        elif addition >= 1.50:
            classifications.append("Presbytie modérée")
        else:
            classifications.append("Presbytie débutante")
    elif age >= 40:
        classifications.append("Pré-presbyte (à surveiller)")

    return " + ".join(classifications)


def calculer_taille_optotype_mm(
    acuite_decimale: float,
    distance_m: float = 5.0,
) -> float:
    """
    Calcule la taille de l'optotype en mm à l'écran (ISO 8596 / ISO 10938).
    
    L'anneau de Landolt standard sous-tend 5 minutes d'arc à AV = 1.0.
    Taille = 2 × distance × tan(angle / 2)
    
    Pour une acuité V, l'angle sous-tendu est: α = 5' / V
    
    Args:
        acuite_decimale: Acuité visuelle décimale (ex: 0.5, 1.0, 1.5)
        distance_m: Distance de test en mètres (standard: 5m ou 6m)
    
    Returns:
        Taille de l'optotype en millimètres
    """
    if acuite_decimale <= 0:
        raise ValueError("L'acuité visuelle doit être positive")

    # Angle sous-tendu en minutes d'arc
    angle_arcmin = OPTOTYPE_REFERENCE_ARCMIN / acuite_decimale
    # Conversion en radians
    angle_rad = math.radians(angle_arcmin / 60.0)
    # Taille en mm (chaque détail = 1/5 de la taille totale)
    detail_mm = distance_m * 1000.0 * math.tan(angle_rad)
    taille_totale_mm = detail_mm * 5.0

    return round(taille_totale_mm, 2)


def calculer_pixels_optotype(
    taille_mm: float,
    resolution_ppi: float = 96.0,
) -> int:
    """
    Convertit la taille d'optotype (mm) en pixels selon la résolution écran.
    
    Args:
        taille_mm: Taille de l'optotype en mm
        resolution_ppi: Résolution de l'écran en pixels par pouce
    
    Returns:
        Taille en pixels
    """
    mm_per_pixel = 25.4 / resolution_ppi
    return max(1, round(taille_mm / mm_per_pixel))


# ═══════════════════════════════════════════════════════════════
# VALIDATION DES DONNÉES (ISO 14971 – Gestion des risques)
# ═══════════════════════════════════════════════════════════════

def valider_refraction(refraction: RefractionData, oeil: str = "OD") -> list:
    """
    Valide les données de réfraction avec les limites cliniques.
    Retourne une liste d'erreurs de validation.
    """
    erreurs = []

    if refraction.sphere is not None:
        if not (SPHERE_MIN <= refraction.sphere <= SPHERE_MAX):
            erreurs.append(
                f"{oeil} – Sphère hors limites ({refraction.sphere} D). "
                f"Plage autorisée: [{SPHERE_MIN}, {SPHERE_MAX}]"
            )

    if refraction.cylindre is not None:
        if not (CYLINDRE_MIN <= refraction.cylindre <= CYLINDRE_MAX):
            erreurs.append(
                f"{oeil} – Cylindre hors limites ({refraction.cylindre} D). "
                f"Plage autorisée: [{CYLINDRE_MIN}, {CYLINDRE_MAX}]"
            )

        # Incohérence Sphère/Cylindre: le cylindre ne devrait pas être
        # de signe opposé à la convention de notation
        if refraction.sphere is not None:
            # En notation minus-cylindre (la plus courante), CYL doit être ≤ 0
            # En notation plus-cylindre, CYL doit être ≥ 0
            # On vérifie la cohérence
            if refraction.cylindre != 0 and refraction.axe is None:
                erreurs.append(
                    f"{oeil} – Cylindre non nul ({refraction.cylindre} D) "
                    f"mais aucun axe spécifié. Incohérence ISO 13666."
                )

    if refraction.axe is not None:
        if not (AXE_MIN <= refraction.axe <= AXE_MAX):
            erreurs.append(
                f"{oeil} – Axe hors limites ({refraction.axe}°). "
                f"Plage autorisée: [{AXE_MIN}, {AXE_MAX}]"
            )

    if refraction.addition is not None:
        if not (ADDITION_MIN <= refraction.addition <= ADDITION_MAX):
            erreurs.append(
                f"{oeil} – Addition hors limites ({refraction.addition} D). "
                f"Plage autorisée: [{ADDITION_MIN}, {ADDITION_MAX}]"
            )

    return erreurs


def valider_pio(pio: Optional[float], oeil: str = "OD") -> list:
    """Valide la Pression Intraoculaire."""
    erreurs = []
    if pio is not None:
        if pio < 5.0 or pio > 60.0:
            erreurs.append(
                f"{oeil} – PIO hors limites physiques ({pio} mmHg). "
                f"Valeur suspecte, vérifier la mesure."
            )
    return erreurs


def valider_acuite(av: Optional[float], oeil: str = "OD", contexte: str = "SC") -> list:
    """Valide l'acuité visuelle."""
    erreurs = []
    if av is not None:
        if not (AV_MIN <= av <= AV_MAX):
            erreurs.append(
                f"{oeil} – AV {contexte} hors limites ({av}). "
                f"Plage autorisée: [{AV_MIN}, {AV_MAX}]"
            )
    return erreurs


# ═══════════════════════════════════════════════════════════════
# ALERTES CLINIQUES (ISO 14971)
# ═══════════════════════════════════════════════════════════════

def generer_alertes(examen: ExamenComplet) -> list:
    """
    Génère les alertes cliniques automatiques basées sur les données d'examen.
    Conformité ISO 14971 (gestion des risques dispositifs médicaux).
    """
    alertes = []

    # ─── PIO élevée (risque glaucome) ──────────────────────
    for oeil, pio in [("OD", examen.pio_od), ("OG", examen.pio_og)]:
        if pio is not None:
            if pio > PIO_SEUIL_CRITIQUE:
                alertes.append(AlerteClinique(
                    code="PIO_CRITIQUE",
                    message=f"PIO {oeil} = {pio} mmHg – VALEUR CRITIQUE",
                    niveau=3,
                    recommandation="Référer en URGENCE à un ophtalmologiste. "
                                   "Suspicion d'hypertonie oculaire sévère / glaucome aigu."
                ))
            elif pio > PIO_SEUIL_NORMAL:
                alertes.append(AlerteClinique(
                    code="PIO_ELEVEE",
                    message=f"PIO {oeil} = {pio} mmHg – au-dessus du seuil normal (>{PIO_SEUIL_NORMAL})",
                    niveau=2,
                    recommandation="Référer à un ophtalmologiste pour bilan glaucome "
                                   "(champ visuel, OCT papillaire, pachymétrie)."
                ))

    # ─── Motilité oculaire anormale ────────────────────────
    if examen.motilite_oculaire == "Anormale":
        alertes.append(AlerteClinique(
            code="MOTILITE_ANORMALE",
            message="Motilité oculaire anormale détectée",
            niveau=2,
            recommandation="Bilan orthoptique recommandé. "
                           "Explorer strabisme, paralysie oculomotrice, ou nystagmus."
        ))

    # ─── Champ visuel anormal ──────────────────────────────
    if examen.champ_visuel in ("Réduit", "Scotome"):
        niveau = 3 if examen.champ_visuel == "Scotome" else 2
        alertes.append(AlerteClinique(
            code="CHAMP_VISUEL_ANORMAL",
            message=f"Champ visuel: {examen.champ_visuel}",
            niveau=niveau,
            recommandation="Référer pour périmétrie automatisée et bilan neuro-ophtalmologique."
        ))

    # ─── Forte myopie (risque rétinien) ───────────────────
    for oeil, refr in [("OD", examen.refraction_od), ("OG", examen.refraction_og)]:
        if refr.sphere is not None:
            se = calculer_sphere_equivalente(refr.sphere, refr.cylindre)
            if se < -6.0:
                alertes.append(AlerteClinique(
                    code="FORTE_MYOPIE",
                    message=f"{oeil} – Forte myopie (SE = {se:.2f} D)",
                    niveau=1,
                    recommandation="Surveillance annuelle du fond d'œil (risque de "
                                   "décollement de rétine, néovaisseaux myopiques)."
                ))

    # ─── Asymétrie significative (anisométropie) ──────────
    if (examen.refraction_od.sphere is not None and examen.refraction_og.sphere is not None):
        se_od = calculer_sphere_equivalente(examen.refraction_od.sphere, examen.refraction_od.cylindre)
        se_og = calculer_sphere_equivalente(examen.refraction_og.sphere, examen.refraction_og.cylindre)
        diff = abs(se_od - se_og)
        if diff >= 2.0:
            alertes.append(AlerteClinique(
                code="ANISOMETROPIE",
                message=f"Anisométropie significative: ΔSE = {diff:.2f} D",
                niveau=1,
                recommandation="Évaluer la tolérance binoculaire. "
                               "Envisager lentilles de contact si intolérance lunettes."
            ))

    # ─── Presbytie non corrigée chez patient > 40 ans ─────
    if examen.patient_age >= 40:
        for oeil, refr in [("OD", examen.refraction_od), ("OG", examen.refraction_og)]:
            if refr.addition is None or refr.addition == 0:
                alertes.append(AlerteClinique(
                    code="PRESBYTIE_NON_CORRIGEE",
                    message=f"Patient ≥ 40 ans sans addition de près ({oeil})",
                    niveau=0,
                    recommandation="Vérifier la vision de près et propose une addition si nécessaire."
                ))
                break  # Une seule alerte suffit

    return alertes


# ═══════════════════════════════════════════════════════════════
# ANALYSES STATISTIQUES PAR TRANCHE D'ÂGE
# ═══════════════════════════════════════════════════════════════

def calculer_tranche_age(age: int) -> str:
    """Retourne la tranche d'âge normalisée."""
    if age < 18:
        return "0-17"
    elif age < 30:
        return "18-29"
    elif age < 45:
        return "30-44"
    elif age < 60:
        return "45-59"
    elif age < 75:
        return "60-74"
    else:
        return "75+"


def analyser_tendances(examens_data: list) -> dict:
    """
    Analyse les tendances de myopie/presbytie par tranche d'âge.
    
    Args:
        examens_data: Liste de dicts avec 'age', 'rx_od_sphere', 'rx_od_cylindre',
                      'rx_og_sphere', 'rx_og_cylindre', 'rx_od_addition', 'rx_og_addition'
    
    Returns:
        Dict avec statistiques par tranche d'âge
    """
    tranches = {}

    for exam in examens_data:
        age = exam.get("age", 0)
        tranche = calculer_tranche_age(age)

        if tranche not in tranches:
            tranches[tranche] = {
                "count": 0,
                "se_values": [],
                "additions": [],
                "myopes": 0,
                "hypermetropes": 0,
                "presbytes": 0,
                "emmetropes": 0,
            }

        t = tranches[tranche]
        t["count"] += 1

        # SE pour chaque œil
        for sph_key, cyl_key, add_key in [
            ("rx_od_sphere", "rx_od_cylindre", "rx_od_addition"),
            ("rx_og_sphere", "rx_og_cylindre", "rx_og_addition"),
        ]:
            sph = exam.get(sph_key)
            cyl = exam.get(cyl_key)
            add = exam.get(add_key)

            if sph is not None:
                se = calculer_sphere_equivalente(sph, cyl)
                t["se_values"].append(se)

                if se < -0.50:
                    t["myopes"] += 1
                elif se > 0.50:
                    t["hypermetropes"] += 1
                else:
                    t["emmetropes"] += 1

            if add is not None and add > 0:
                t["additions"].append(add)
                t["presbytes"] += 1

    # Calculer les moyennes
    result = {}
    for tranche, data in sorted(tranches.items()):
        se_vals = data["se_values"]
        add_vals = data["additions"]
        result[tranche] = {
            "nombre_patients": data["count"],
            "se_moyenne": round(sum(se_vals) / len(se_vals), 2) if se_vals else None,
            "se_min": min(se_vals) if se_vals else None,
            "se_max": max(se_vals) if se_vals else None,
            "addition_moyenne": round(sum(add_vals) / len(add_vals), 2) if add_vals else None,
            "taux_myopie": round(data["myopes"] / max(len(se_vals), 1) * 100, 1),
            "taux_hypermetropie": round(data["hypermetropes"] / max(len(se_vals), 1) * 100, 1),
            "taux_presbytie": round(data["presbytes"] / max(data["count"] * 2, 1) * 100, 1),
        }

    return result


# ═══════════════════════════════════════════════════════════════
# ANALYSE COMPLÈTE D'UN EXAMEN
# ═══════════════════════════════════════════════════════════════

def analyser_examen(examen: ExamenComplet) -> ResultatAnalyse:
    """
    Effectue l'analyse clinique complète d'un examen.
    
    1. Validation des données (ISO 14971)
    2. Calcul des sphères équivalentes (ISO 13666)
    3. Classification des amétropies
    4. Génération des alertes cliniques
    
    Returns:
        ResultatAnalyse avec toutes les données calculées
    """
    resultat = ResultatAnalyse()

    # ─── 1. Validation ────────────────────────────────────
    erreurs = []
    erreurs.extend(valider_refraction(examen.refraction_od, "OD"))
    erreurs.extend(valider_refraction(examen.refraction_og, "OG"))
    erreurs.extend(valider_pio(examen.pio_od, "OD"))
    erreurs.extend(valider_pio(examen.pio_og, "OG"))
    erreurs.extend(valider_acuite(examen.av_od_sc, "OD", "SC"))
    erreurs.extend(valider_acuite(examen.av_og_sc, "OG", "SC"))
    erreurs.extend(valider_acuite(examen.av_od_ac, "OD", "AC"))
    erreurs.extend(valider_acuite(examen.av_og_ac, "OG", "AC"))

    if erreurs:
        resultat.est_valide = False
        resultat.erreurs_validation = erreurs
        logger.warning(f"Patient {examen.patient_id}: {len(erreurs)} erreurs de validation")

    # ─── 2. Sphères équivalentes ──────────────────────────
    if examen.refraction_od.sphere is not None:
        resultat.sphere_equivalente_od = calculer_sphere_equivalente(
            examen.refraction_od.sphere, examen.refraction_od.cylindre
        )
    if examen.refraction_og.sphere is not None:
        resultat.sphere_equivalente_og = calculer_sphere_equivalente(
            examen.refraction_og.sphere, examen.refraction_og.cylindre
        )

    # ─── 3. Classifications ──────────────────────────────
    if resultat.sphere_equivalente_od is not None:
        resultat.classification_od = classifier_amethropie(
            resultat.sphere_equivalente_od,
            examen.refraction_od.addition,
            examen.patient_age,
        )
    if resultat.sphere_equivalente_og is not None:
        resultat.classification_og = classifier_amethropie(
            resultat.sphere_equivalente_og,
            examen.refraction_og.addition,
            examen.patient_age,
        )

    # ─── 4. Alertes cliniques ─────────────────────────────
    resultat.alertes = generer_alertes(examen)
    if resultat.alertes:
        resultat.risque_global = max(a.niveau for a in resultat.alertes)

    logger.info(
        f"Patient {examen.patient_id}: SE_OD={resultat.sphere_equivalente_od}, "
        f"SE_OG={resultat.sphere_equivalente_og}, "
        f"Alertes={len(resultat.alertes)}, Risque={resultat.risque_global}"
    )

    return resultat
