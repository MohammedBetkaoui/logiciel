# ─────────────────────────────────────────────────────────────────
# Tests unitaires – analytics_engine.py
# Couverture : SE, classification, alertes PIO, anisométropie,
#              progression myopie, analyse complète de bilan
# ─────────────────────────────────────────────────────────────────

import pytest
import sqlite3
from datetime import datetime, timedelta
from analytics_engine import (
    calculer_sphere_equivalente,
    classifier_amethropie,
    analyser_pio,
    analyser_anisometropie,
    calculer_progression_myopie,
    analyser_bilan_complet,
    generer_statistiques_bilans,
    AnalyseComplete,
    PIO_SEUIL_NORMAL, PIO_SEUIL_CRITIQUE,
    MYOPIE_FORTE_SEUIL, MYOPIE_SEUIL, HYPERMETROPIE_SEUIL,
    ANISOMETROPIE_SEUIL, PRESBYTIE_AGE_SEUIL,
)


# ═══════════════════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════════════════

@pytest.fixture
def db_conn():
    """Base SQLite en mémoire avec schéma examens + patients."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE patients (
            patient_id INTEGER PRIMARY KEY,
            date_naissance TEXT,
            sexe TEXT DEFAULT 'M',
            est_archive INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE examens (
            examen_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            date_examen TEXT,
            rx_od_sphere REAL, rx_od_cylindre REAL, rx_od_axe INTEGER,
            rx_og_sphere REAL, rx_og_cylindre REAL, rx_og_axe INTEGER,
            rx_od_addition REAL, rx_og_addition REAL,
            auto_od_sphere REAL, auto_od_cylindre REAL,
            auto_og_sphere REAL, auto_og_cylindre REAL,
            pio_od REAL, pio_og REAL,
            motilite_oculaire TEXT, champ_visuel TEXT,
            test_couleurs TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        )
    """)
    yield conn
    conn.close()


def _insert_patient(conn, pid=1, dob="1990-01-01", sexe="M"):
    conn.execute(
        "INSERT OR IGNORE INTO patients (patient_id, date_naissance, sexe) VALUES (?,?,?)",
        (pid, dob, sexe),
    )
    conn.commit()


def _insert_examen(conn, patient_id, date_examen, sph_od, cyl_od=None, sph_og=None, cyl_og=None, **extra):
    cols = {
        "patient_id": patient_id,
        "date_examen": date_examen,
        "rx_od_sphere": sph_od,
        "rx_od_cylindre": cyl_od,
        "rx_og_sphere": sph_og,
        "rx_og_cylindre": cyl_og,
    }
    cols.update(extra)
    keys = ", ".join(cols.keys())
    placeholders = ", ".join("?" for _ in cols)
    conn.execute(f"INSERT INTO examens ({keys}) VALUES ({placeholders})", list(cols.values()))
    conn.commit()


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_sphere_equivalente
# ═══════════════════════════════════════════════════════════════

class TestCalculerSE:
    def test_formule_basique(self):
        assert calculer_sphere_equivalente(-3.0, -1.0) == -3.5

    def test_sphere_seule(self):
        assert calculer_sphere_equivalente(-2.0, 0.0) == -2.0

    def test_sphere_none(self):
        assert calculer_sphere_equivalente(None, -1.0) is None

    def test_cylindre_none(self):
        assert calculer_sphere_equivalente(-2.0, None) == -2.0

    def test_les_deux_none(self):
        assert calculer_sphere_equivalente(None, None) is None

    def test_hypermetropie(self):
        assert calculer_sphere_equivalente(3.0, 1.0) == 3.5

    def test_emmetropie(self):
        assert calculer_sphere_equivalente(0.0, 0.0) == 0.0

    def test_arrondi_2_decimales(self):
        result = calculer_sphere_equivalente(-1.0, -0.75)
        assert result == -1.38  # -1.0 + (-0.75/2) = -1.375 → -1.38


# ═══════════════════════════════════════════════════════════════
# TESTS – classifier_amethropie
# ═══════════════════════════════════════════════════════════════

class TestClassifierAmethropie:
    def test_none(self):
        assert classifier_amethropie(None) == "Non mesurable"

    def test_emmetropie(self):
        result = classifier_amethropie(0.0)
        assert "Emmétropie" in result

    def test_myopie_faible(self):
        result = classifier_amethropie(-1.0)
        assert "Myopie faible" in result

    def test_myopie_moyenne(self):
        result = classifier_amethropie(-4.0)
        assert "Myopie moyenne" in result

    def test_forte_myopie(self):
        result = classifier_amethropie(-7.0)
        assert "Forte myopie" in result

    def test_hypermetropie_faible(self):
        result = classifier_amethropie(1.0)
        assert "Hypermétropie faible" in result

    def test_hypermetropie_moyenne(self):
        result = classifier_amethropie(3.0)
        assert "Hypermétropie moyenne" in result

    def test_forte_hypermetropie(self):
        result = classifier_amethropie(6.0)
        assert "Forte hypermétropie" in result

    def test_presbytie_avec_addition(self):
        result = classifier_amethropie(0.0, age=50, addition=2.0)
        assert "Presbytie" in result

    def test_pas_presbytie_jeune(self):
        result = classifier_amethropie(0.0, age=30, addition=2.0)
        assert "Presbytie" not in result

    def test_seuil_myopie(self):
        """SE = -0.50 → Myopie faible (< -0.50)"""
        result = classifier_amethropie(MYOPIE_SEUIL)
        # -0.50 n'est pas < -0.50, donc pas myopie
        assert "Emmétropie" in result

    def test_seuil_hypermetropie(self):
        """SE = +0.50 → pas hypermétropie (pas > 0.50)"""
        result = classifier_amethropie(HYPERMETROPIE_SEUIL)
        assert "Emmétropie" in result


# ═══════════════════════════════════════════════════════════════
# TESTS – analyser_pio
# ═══════════════════════════════════════════════════════════════

class TestAnalyserPio:
    def test_pio_normale(self):
        alertes = analyser_pio(15.0, 14.0)
        assert alertes == []

    def test_pio_elevee_od(self):
        alertes = analyser_pio(25.0, 14.0)
        # PIO élevée OD + asymétrie (25-14=11 > 5)
        assert len(alertes) == 2
        codes = [a["code"] for a in alertes]
        assert "PIO_ELEVEE_OD" in codes
        assert "PIO_ASYMETRIE" in codes

    def test_pio_critique_og(self):
        alertes = analyser_pio(14.0, 35.0)
        assert any(a["niveau"] == 3 for a in alertes)
        assert any("CRITIQUE" in a["code"] for a in alertes)

    def test_pio_critique_et_elevee(self):
        alertes = analyser_pio(35.0, 25.0)
        assert len(alertes) >= 2

    def test_asymetrie_pio(self):
        alertes = analyser_pio(20.0, 12.0)  # diff = 8 > 5
        assert any("ASYMETRIE" in a["code"] for a in alertes)

    def test_pas_asymetrie_faible(self):
        alertes = analyser_pio(15.0, 14.0)  # diff = 1
        assert not any("ASYMETRIE" in a["code"] for a in alertes)

    def test_pio_none_od(self):
        alertes = analyser_pio(None, 14.0)
        assert alertes == []

    def test_pio_none_les_deux(self):
        alertes = analyser_pio(None, None)
        assert alertes == []

    def test_seuil_exact_normal(self):
        """PIO = 21 est au seuil, pas élevée (> 21, pas >=)"""
        alertes = analyser_pio(PIO_SEUIL_NORMAL, PIO_SEUIL_NORMAL)
        assert not any("ELEVEE" in a["code"] for a in alertes)

    def test_seuil_exact_critique(self):
        """PIO = 30 est au seuil critique, pas critique (> 30)"""
        alertes = analyser_pio(PIO_SEUIL_CRITIQUE, 14.0)
        assert not any("CRITIQUE" in a["code"] for a in alertes)


# ═══════════════════════════════════════════════════════════════
# TESTS – analyser_anisometropie
# ═══════════════════════════════════════════════════════════════

class TestAnalyserAnisometropie:
    def test_pas_anisometropie(self):
        result = analyser_anisometropie(-2.0, -2.5)
        assert result["alerte"] is False

    def test_anisometropie_detectee(self):
        result = analyser_anisometropie(-5.0, -1.0)
        assert result["alerte"] is True
        assert result["diff"] == 4.0

    def test_seuil_exact(self):
        """Diff = 1.5 → pas d'alerte (> 1.5, pas >=)"""
        result = analyser_anisometropie(-2.0, -0.5)
        assert result["alerte"] is False

    def test_juste_au_dessus_seuil(self):
        result = analyser_anisometropie(-2.0, -0.4)
        assert result["alerte"] is True

    def test_none_od(self):
        result = analyser_anisometropie(None, -2.0)
        assert result["diff"] is None
        assert result["alerte"] is False

    def test_none_og(self):
        result = analyser_anisometropie(-2.0, None)
        assert result["diff"] is None

    def test_message_present_si_alerte(self):
        result = analyser_anisometropie(-5.0, 0.0)
        assert result["message"] is not None
        assert "Anisométropie" in result["message"]

    def test_message_none_si_ok(self):
        result = analyser_anisometropie(-1.0, -1.0)
        assert result["message"] is None


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_progression_myopie
# ═══════════════════════════════════════════════════════════════

class TestCalculerProgressionMyopie:
    def test_pas_assez_examens(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2025-01-01", -2.0)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is None

    def test_progression_stable(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-06-01", -2.0)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is not None
        assert result["rythme"] == "Stable"
        assert result["progression_annuelle"] == 0.0

    def test_progression_rapide(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-01-01", -3.5)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is not None
        assert result["rythme"] == "Rapide"
        assert result["niveau"] == 2

    def test_progression_moderee(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-01-01", -2.75)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is not None
        assert result["rythme"] == "Modéré"

    def test_progression_lente(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-01-01", -2.30)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is not None
        assert result["rythme"] == "Lent"

    def test_periode_trop_courte(self, db_conn):
        """Moins de 3 mois entre examens → None"""
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2025-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-02-01", -2.5)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is None

    def test_plusieurs_examens(self, db_conn):
        """Premier et dernier sont utilisés pour le calcul"""
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2023-01-01", -1.0)
        _insert_examen(db_conn, 1, "2024-01-01", -1.5)
        _insert_examen(db_conn, 1, "2025-01-01", -2.0)
        result = calculer_progression_myopie(db_conn, 1, "od")
        assert result is not None
        assert result["nb_examens"] == 3
        assert result["premier_se"] == -1.0
        assert result["dernier_se"] == -2.0

    def test_patient_inexistant(self, db_conn):
        result = calculer_progression_myopie(db_conn, 999, "od")
        assert result is None

    def test_oeil_og(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", None, None, -3.0, -1.0)
        _insert_examen(db_conn, 1, "2025-01-01", None, None, -4.0, -1.0)
        result = calculer_progression_myopie(db_conn, 1, "og")
        assert result is not None


# ═══════════════════════════════════════════════════════════════
# TESTS – analyser_bilan_complet (intégration)
# ═══════════════════════════════════════════════════════════════

class TestAnalyserBilanComplet:
    def test_bilan_normal(self):
        bilan = {
            "patient_id": 1,
            "rx_od_sphere": -1.0, "rx_od_cylindre": -0.5,
            "rx_og_sphere": -1.0, "rx_og_cylindre": -0.5,
            "pio_od": 15.0, "pio_og": 14.0,
        }
        result = analyser_bilan_complet(bilan, age=30)
        assert result.se_od_rx == -1.25
        assert result.se_og_rx == -1.25
        assert "Myopie" in result.classification_od
        assert result.risque_global == 0

    def test_bilan_forte_myopie(self):
        bilan = {
            "rx_od_sphere": -8.0, "rx_od_cylindre": -1.0,
            "rx_og_sphere": -1.0, "rx_og_cylindre": 0.0,
        }
        result = analyser_bilan_complet(bilan, age=25)
        assert any("FORTE_MYOPIE" in a["code"] for a in result.alertes)

    def test_bilan_pio_critique(self):
        bilan = {"pio_od": 35.0, "pio_og": 14.0}
        result = analyser_bilan_complet(bilan, age=30)
        assert result.risque_global == 3

    def test_bilan_anisometropie(self):
        bilan = {
            "rx_od_sphere": -5.0, "rx_od_cylindre": 0.0,
            "rx_og_sphere": -1.0, "rx_og_cylindre": 0.0,
        }
        result = analyser_bilan_complet(bilan, age=30)
        assert result.anisometropie_alerte is True
        assert any("ANISOMETROPIE" in a["code"] for a in result.alertes)

    def test_bilan_presbytie_non_corrigee(self):
        bilan = {
            "rx_od_sphere": 0.0, "rx_od_cylindre": 0.0,
            "rx_og_sphere": 0.0, "rx_og_cylindre": 0.0,
        }
        result = analyser_bilan_complet(bilan, age=50)
        assert any("PRESBYTIE" in a["code"] for a in result.alertes)

    def test_bilan_motilite_anormale(self):
        bilan = {"motilite_oculaire": "Anormale"}
        result = analyser_bilan_complet(bilan, age=30)
        assert any("MOTILITE" in a["code"] for a in result.alertes)

    def test_bilan_champ_visuel_scotome(self):
        bilan = {"champ_visuel": "Scotome"}
        result = analyser_bilan_complet(bilan, age=30)
        assert any("CHAMP_VISUEL" in a["code"] for a in result.alertes)

    def test_bilan_dyschromatopsie(self):
        bilan = {"test_couleurs": "Déficient"}
        result = analyser_bilan_complet(bilan, age=30)
        assert any("DYSCHROMATOPSIE" in a["code"] for a in result.alertes)

    def test_bilan_pio_stats(self):
        bilan = {"pio_od": 16.0, "pio_og": 14.0}
        result = analyser_bilan_complet(bilan, age=30)
        assert result.pio_moyenne == 15.0
        assert result.pio_asymetrie == 2.0

    def test_bilan_auto_se(self):
        bilan = {
            "auto_od_sphere": -2.0, "auto_od_cylindre": -1.0,
            "auto_og_sphere": -2.0, "auto_og_cylindre": -1.0,
        }
        result = analyser_bilan_complet(bilan, age=30)
        assert result.se_od_auto == -2.5
        assert result.se_og_auto == -2.5

    def test_bilan_avec_progression(self, db_conn):
        _insert_patient(db_conn)
        _insert_examen(db_conn, 1, "2024-01-01", -2.0)
        _insert_examen(db_conn, 1, "2025-01-01", -3.5)

        bilan = {
            "patient_id": 1,
            "rx_od_sphere": -4.0, "rx_od_cylindre": 0.0,
            "rx_og_sphere": -2.0, "rx_og_cylindre": 0.0,
        }
        result = analyser_bilan_complet(bilan, age=20, db_conn=db_conn)
        assert result.progression_od is not None

    def test_bilan_vide(self):
        result = analyser_bilan_complet({}, age=25)
        assert result.se_od_rx is None
        assert result.se_og_rx is None
        assert result.risque_global == 0

    def test_risque_global_max(self):
        """Risque global = max de toutes les alertes"""
        bilan = {
            "pio_od": 35.0,  # niveau 3
            "motilite_oculaire": "Anormale",  # niveau 1
        }
        result = analyser_bilan_complet(bilan, age=30)
        assert result.risque_global == 3


# ═══════════════════════════════════════════════════════════════
# TESTS – generer_statistiques_bilans
# ═══════════════════════════════════════════════════════════════

class TestGenererStatistiquesBilans:
    def test_base_vide(self, db_conn):
        result = generer_statistiques_bilans(db_conn)
        assert result["total_bilans"] == 0

    def test_stats_basiques(self, db_conn):
        _insert_patient(db_conn, 1, "1990-01-01", "M")
        _insert_examen(db_conn, 1, "2025-01-01", -3.0, -1.0, -3.0, -1.0,
                       pio_od=15.0, pio_og=14.0)
        result = generer_statistiques_bilans(db_conn)
        assert result["total_bilans"] == 1
        assert result["categories"]["myopie"] >= 1

    def test_stats_pio(self, db_conn):
        _insert_patient(db_conn, 1, "1990-01-01")
        _insert_examen(db_conn, 1, "2025-01-01", -1.0, 0.0, -1.0, 0.0,
                       pio_od=15.0, pio_og=15.0)
        result = generer_statistiques_bilans(db_conn)
        assert result["pio_stats"]["moyenne"] == 15.0

    def test_stats_myopie(self, db_conn):
        _insert_patient(db_conn, 1, "1990-01-01")
        _insert_examen(db_conn, 1, "2025-01-01", -3.0, 0.0, -3.0, 0.0)
        result = generer_statistiques_bilans(db_conn)
        assert result["myopie_stats"]["moyenne_se"] == -3.0

    def test_patient_archive_exclu(self, db_conn):
        """Les patients archivés ne sont pas comptés"""
        conn = db_conn
        conn.execute(
            "INSERT INTO patients (patient_id, date_naissance, sexe, est_archive) VALUES (?,?,?,?)",
            (1, "1990-01-01", "M", 1),
        )
        conn.commit()
        _insert_examen(conn, 1, "2025-01-01", -3.0)
        result = generer_statistiques_bilans(conn)
        assert result["total_bilans"] == 0

    def test_comptage_astigmatisme(self, db_conn):
        _insert_patient(db_conn, 1, "1990-01-01")
        _insert_examen(db_conn, 1, "2025-01-01", -1.0, -1.5, -1.0, -1.5)
        result = generer_statistiques_bilans(db_conn)
        assert result["categories"]["astigmatisme"] >= 1

    def test_comptage_presbytie(self, db_conn):
        _insert_patient(db_conn, 1, "1970-01-01")
        _insert_examen(db_conn, 1, "2025-01-01", 0.0, 0.0, 0.0, 0.0,
                       rx_od_addition=2.0, rx_og_addition=2.0)
        result = generer_statistiques_bilans(db_conn)
        assert result["categories"]["presbytie"] >= 1
