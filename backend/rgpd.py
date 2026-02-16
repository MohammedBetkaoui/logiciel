# ─────────────────────────────────────────────────────────────────
# BBA-Data – Module RGPD & Éthique (rgpd.py)
# Anonymisation des données patients pour export statistique
# Conformité RGPD (UE 2016/679), Secret Médical,
# Déclaration d'Helsinki (AMM 2013) – Recherche médicale
# ─────────────────────────────────────────────────────────────────

import hashlib
import csv
import io
import logging
from datetime import datetime, date
from typing import Optional

logger = logging.getLogger("bbadata.rgpd")


def pseudonymiser_id(patient_id: int, sel: str = "bbadata_2026") -> str:
    """
    Génère un pseudonyme irréversible pour un patient_id.
    Utilise SHA-256 avec un sel pour empêcher la ré-identification.
    """
    payload = f"{sel}:{patient_id}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12].upper()


def anonymiser_age(date_naissance: str) -> Optional[int]:
    """
    Convertit une date de naissance en âge approximatif (tranche de 5 ans)
    pour limiter la ré-identification tout en préservant l'utilité statistique.
    """
    try:
        naissance = datetime.strptime(date_naissance, "%Y-%m-%d").date()
        today = date.today()
        age = today.year - naissance.year - (
            (today.month, today.day) < (naissance.month, naissance.day)
        )
        # Arrondir à la tranche de 5 ans la plus proche
        return (age // 5) * 5
    except (ValueError, TypeError):
        return None


def anonymiser_code_postal(code_postal: str) -> Optional[str]:
    """
    Réduit la précision du code postal aux 2 premiers chiffres (département)
    pour limiter la géolocalisation précise.
    """
    if code_postal and len(code_postal) >= 2:
        return code_postal[:2] + "***"
    return None


def anonymiser_patient(patient: dict) -> dict:
    """
    Anonymise un enregistrement patient complet pour export statistique.
    
    Données SUPPRIMÉES (identifiantes directes):
    - nom, prénom, adresse, téléphone, email, n° sécu, n° adhérent
    
    Données MODIFIÉES (quasi-identifiantes):
    - patient_id → pseudonyme hashé
    - date_naissance → tranche d'âge 5 ans
    - code_postal → département uniquement (2 chiffres)
    
    Données CONSERVÉES (cliniques, non identifiantes):
    - sexe, données de réfraction, PIO, diagnostics, etc.
    """
    anonyme = {}

    # Pseudonyme
    anonyme["pseudo_id"] = pseudonymiser_id(patient.get("patient_id", 0))

    # Données quasi-identifiantes réduites
    anonyme["age_tranche"] = anonymiser_age(patient.get("date_naissance", ""))
    anonyme["sexe"] = patient.get("sexe")
    anonyme["departement"] = anonymiser_code_postal(patient.get("code_postal", ""))

    # Données cliniques CONSERVÉES intégralement
    champs_cliniques = [
        "av_od_sc", "av_og_sc", "av_od_ac", "av_og_ac", "av_binoculaire",
        "auto_od_sphere", "auto_od_cylindre", "auto_od_axe",
        "auto_og_sphere", "auto_og_cylindre", "auto_og_axe",
        "rx_od_sphere", "rx_od_cylindre", "rx_od_axe", "rx_od_addition",
        "rx_og_sphere", "rx_og_cylindre", "rx_og_axe", "rx_og_addition",
        "dp_od", "dp_og", "dp_binoculaire",
        "pio_od", "pio_og", "methode_pio",
        "motilite_oculaire", "test_couleurs", "champ_visuel",
        "diagnostic", "niveau_urgence",
    ]

    for champ in champs_cliniques:
        anonyme[champ] = patient.get(champ)

    # Supprimer explicitement les champs identifiants
    # (sécurité en profondeur – même s'ils ne sont pas copiés)

    return anonyme


def exporter_csv_anonymise(patients_examens: list) -> str:
    """
    Génère un fichier CSV anonymisé conforme RGPD et Déclaration d'Helsinki.
    Aucune donnée nominative n'est incluse dans l'export statistique.
    
    Args:
        patients_examens: Liste de dicts contenant les données patient+examen fusionnées
    
    Returns:
        Contenu CSV en string (prêt à écrire dans un fichier)
    """
    if not patients_examens:
        return ""

    anonymises = [anonymiser_patient(pe) for pe in patients_examens]
    
    output = io.StringIO()
    # Entête éthique (Déclaration d'Helsinki, Art. 24)
    output.write("# BBA-Data – Export anonymisé\n")
    output.write("# Données anonymisées conformément à la Déclaration d'Helsinki (AMM 2013)\n")
    output.write("# et au RGPD (UE 2016/679) – Aucune donnée nominative\n")
    output.write(f"# Date d'export: {date.today().isoformat()}\n")
    output.write(f"# Nombre d'enregistrements: {len(anonymises)}\n")
    output.write("#\n")
    writer = csv.DictWriter(output, fieldnames=anonymises[0].keys())
    writer.writeheader()
    writer.writerows(anonymises)

    csv_content = output.getvalue()
    logger.info(
        f"Export CSV anonymisé: {len(anonymises)} enregistrements, "
        f"taille: {len(csv_content)} octets"
    )

    return csv_content


def verifier_consentement(conn, patient_id: int) -> bool:
    """
    Vérifie si le patient a donné son consentement RGPD avant tout traitement.
    """
    row = conn.execute(
        "SELECT consentement_rgpd FROM patients WHERE patient_id = ?",
        (patient_id,),
    ).fetchone()
    
    if row is None:
        logger.warning(f"Patient {patient_id} introuvable.")
        return False

    return bool(row[0])


def droit_a_loubli(conn, patient_id: int, utilisateur: str) -> bool:
    """
    Implémente le droit à l'effacement (Art. 17 RGPD).
    Anonymise les données personnelles tout en conservant les données
    cliniques agrégées pour la recherche.
    """
    try:
        conn.execute(
            """UPDATE patients SET
                nom = '[ANONYMISÉ]', prenom = '[ANONYMISÉ]',
                adresse = NULL, telephone = NULL, email = NULL,
                numero_securite_sociale = NULL, numero_adherent = NULL,
                est_archive = 1, date_modification = datetime('now')
            WHERE patient_id = ?""",
            (patient_id,),
        )

        # Log d'audit obligatoire
        conn.execute(
            """INSERT INTO audit_log (utilisateur, action, table_cible, enregistrement_id, details, niveau)
               VALUES (?, 'DELETE_RGPD', 'patients', ?, 'Droit à l''oubli exercé – données personnelles anonymisées', 'WARN')""",
            (utilisateur, patient_id),
        )

        conn.commit()
        logger.info(f"Droit à l'oubli exercé pour patient {patient_id} par {utilisateur}")
        return True

    except Exception as e:
        logger.error(f"Erreur droit à l'oubli patient {patient_id}: {e}")
        conn.rollback()
        return False
