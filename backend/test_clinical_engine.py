# ─────────────────────────────────────────────────────────────────
# Tests unitaires – clinical_engine.py
# Couverture : calculs ISO 13666/8596, validation, alertes ISO 14971
# ─────────────────────────────────────────────────────────────────

import pytest
import math
from clinical_engine import (
    calculer_sphere_equivalente,
    classifier_amethropie,
    calculer_taille_optotype_mm,
    calculer_pixels_optotype,
    valider_refraction,
    valider_pio,
    valider_acuite,
    generer_alertes,
    calculer_tranche_age,
    analyser_tendances,
    analyser_examen,
    RefractionData,
    ExamenComplet,
    AlerteClinique,
    ResultatAnalyse,
    SPHERE_MIN, SPHERE_MAX,
    CYLINDRE_MIN, CYLINDRE_MAX,
    AXE_MIN, AXE_MAX,
    ADDITION_MIN, ADDITION_MAX,
    PIO_SEUIL_NORMAL, PIO_SEUIL_CRITIQUE,
)


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_sphere_equivalente (ISO 13666)
# ═══════════════════════════════════════════════════════════════

class TestCalculerSphereEquivalente:
    def test_sphere_pure(self):
        """SE = SPH quand CYL = 0"""
        assert calculer_sphere_equivalente(-2.0, 0.0) == -2.0

    def test_formule_iso(self):
        """SE = SPH + CYL/2"""
        assert calculer_sphere_equivalente(-3.0, -1.0) == -3.5

    def test_positif(self):
        assert calculer_sphere_equivalente(2.0, 1.0) == 2.5

    def test_cylindre_none(self):
        """CYL None traité comme 0"""
        assert calculer_sphere_equivalente(-2.0, None) == -2.0

    def test_sphere_none(self):
        """SPH None → 0.0"""
        assert calculer_sphere_equivalente(None, -1.0) == 0.0

    def test_arrondi_quart_dioptrie(self):
        """Arrondi au 0.25 D le plus proche"""
        # -1.0 + (-0.75/2) = -1.375 → arrondi à -1.25 ou -1.50
        result = calculer_sphere_equivalente(-1.0, -0.75)
        assert result % 0.25 == 0  # Doit être un multiple de 0.25

    def test_emmetrope(self):
        assert calculer_sphere_equivalente(0.0, 0.0) == 0.0

    def test_forte_myopie(self):
        assert calculer_sphere_equivalente(-8.0, -2.0) == -9.0

    def test_forte_hypermetropie(self):
        assert calculer_sphere_equivalente(6.0, 2.0) == 7.0

    def test_valeurs_extremes(self):
        result = calculer_sphere_equivalente(-30.0, -10.0)
        assert result == -35.0


# ═══════════════════════════════════════════════════════════════
# TESTS – classifier_amethropie
# ═══════════════════════════════════════════════════════════════

class TestClassifierAmethropie:
    def test_emmetrope(self):
        assert "Emmétrope" in classifier_amethropie(0.0)

    def test_myopie_legere(self):
        result = classifier_amethropie(-1.0)
        assert "Myopie légère" in result

    def test_myopie_moyenne(self):
        result = classifier_amethropie(-4.0)
        assert "Myopie moyenne" in result

    def test_forte_myopie(self):
        result = classifier_amethropie(-7.0)
        assert "Forte myopie" in result

    def test_hypermetropie_legere(self):
        result = classifier_amethropie(1.0)
        assert "Hypermétropie légère" in result

    def test_hypermetropie_moyenne(self):
        result = classifier_amethropie(3.0)
        assert "Hypermétropie moyenne" in result

    def test_forte_hypermetropie(self):
        result = classifier_amethropie(6.0)
        assert "Forte hypermétropie" in result

    def test_presbytie_debutante(self):
        result = classifier_amethropie(0.0, addition=1.0)
        assert "Presbytie débutante" in result

    def test_presbytie_moderee(self):
        result = classifier_amethropie(0.0, addition=2.0)
        assert "Presbytie modérée" in result

    def test_presbytie_avancee(self):
        result = classifier_amethropie(0.0, addition=3.0)
        assert "Presbytie avancée" in result

    def test_pre_presbyte(self):
        """Patient ≥ 40 ans sans addition → pré-presbyte"""
        result = classifier_amethropie(0.0, age=45)
        assert "Pré-presbyte" in result

    def test_myopie_plus_presbytie(self):
        result = classifier_amethropie(-2.0, addition=2.0)
        assert "Myopie" in result
        assert "Presbytie" in result

    def test_seuil_emmetrope_bas(self):
        """SE = -0.50 est la frontière → Emmétrope"""
        result = classifier_amethropie(-0.50)
        # -0.50 est >= -0.50, pas < -0.50 → Emmétrope
        assert "Emmétrope" in result

    def test_seuil_emmetrope_haut(self):
        """SE = +0.50 → Emmétrope"""
        result = classifier_amethropie(0.50)
        assert "Emmétrope" in result


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_taille_optotype_mm (ISO 8596)
# ═══════════════════════════════════════════════════════════════

class TestCalculerTailleOptotype:
    def test_acuite_1_distance_5m(self):
        """AV=1.0 à 5m → taille totale optotype ≈ 36.36 mm (5 × détail 7.27mm)"""
        taille = calculer_taille_optotype_mm(1.0, 5.0)
        assert 36.0 < taille < 37.0

    def test_acuite_faible_plus_grande(self):
        """AV plus faible → optotype plus grand"""
        t05 = calculer_taille_optotype_mm(0.5, 5.0)
        t10 = calculer_taille_optotype_mm(1.0, 5.0)
        assert t05 > t10

    def test_acuite_forte_plus_petite(self):
        """AV plus forte → optotype plus petit"""
        t15 = calculer_taille_optotype_mm(1.5, 5.0)
        t10 = calculer_taille_optotype_mm(1.0, 5.0)
        assert t15 < t10

    def test_distance_6m(self):
        """Distance 6m → optotype plus grand qu'à 5m"""
        t5 = calculer_taille_optotype_mm(1.0, 5.0)
        t6 = calculer_taille_optotype_mm(1.0, 6.0)
        assert t6 > t5

    def test_acuite_zero_erreur(self):
        with pytest.raises(ValueError):
            calculer_taille_optotype_mm(0.0)

    def test_acuite_negative_erreur(self):
        with pytest.raises(ValueError):
            calculer_taille_optotype_mm(-1.0)

    def test_resultat_positif(self):
        result = calculer_taille_optotype_mm(0.1, 5.0)
        assert result > 0


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_pixels_optotype
# ═══════════════════════════════════════════════════════════════

class TestCalculerPixelsOptotype:
    def test_retourne_entier(self):
        result = calculer_pixels_optotype(7.27)
        assert isinstance(result, int)

    def test_minimum_1px(self):
        result = calculer_pixels_optotype(0.001)
        assert result >= 1

    def test_resolution_plus_haute_plus_pixels(self):
        p96 = calculer_pixels_optotype(10.0, 96.0)
        p144 = calculer_pixels_optotype(10.0, 144.0)
        assert p144 > p96


# ═══════════════════════════════════════════════════════════════
# TESTS – valider_refraction
# ═══════════════════════════════════════════════════════════════

class TestValiderRefraction:
    def test_refraction_valide(self):
        r = RefractionData(sphere=-2.0, cylindre=-1.0, axe=90)
        erreurs = valider_refraction(r, "OD")
        assert erreurs == []

    def test_sphere_hors_limites_haute(self):
        r = RefractionData(sphere=35.0)
        erreurs = valider_refraction(r, "OD")
        assert len(erreurs) == 1
        assert "Sphère hors limites" in erreurs[0]

    def test_sphere_hors_limites_basse(self):
        r = RefractionData(sphere=-35.0)
        erreurs = valider_refraction(r, "OD")
        assert len(erreurs) == 1

    def test_cylindre_hors_limites(self):
        r = RefractionData(sphere=0.0, cylindre=-15.0, axe=90)
        erreurs = valider_refraction(r, "OD")
        assert any("Cylindre hors limites" in e for e in erreurs)

    def test_axe_hors_limites(self):
        r = RefractionData(sphere=0.0, cylindre=-1.0, axe=200)
        erreurs = valider_refraction(r, "OD")
        assert any("Axe hors limites" in e for e in erreurs)

    def test_cylindre_sans_axe(self):
        """Cylindre non nul sans axe → incohérence ISO 13666"""
        r = RefractionData(sphere=-1.0, cylindre=-1.5, axe=None)
        erreurs = valider_refraction(r, "OD")
        assert any("Incohérence" in e for e in erreurs)

    def test_addition_hors_limites(self):
        r = RefractionData(addition=5.0)
        erreurs = valider_refraction(r, "OD")
        assert any("Addition hors limites" in e for e in erreurs)

    def test_refraction_vide_valide(self):
        r = RefractionData()
        erreurs = valider_refraction(r, "OD")
        assert erreurs == []

    def test_limites_exactes_valides(self):
        r = RefractionData(
            sphere=SPHERE_MAX, cylindre=CYLINDRE_MAX,
            axe=AXE_MAX, addition=ADDITION_MAX
        )
        erreurs = valider_refraction(r, "OD")
        # Cylindre non nul avec axe → pas d'incohérence
        assert erreurs == []


# ═══════════════════════════════════════════════════════════════
# TESTS – valider_pio
# ═══════════════════════════════════════════════════════════════

class TestValiderPio:
    def test_pio_normale(self):
        assert valider_pio(15.0, "OD") == []

    def test_pio_trop_basse(self):
        erreurs = valider_pio(3.0, "OD")
        assert len(erreurs) == 1

    def test_pio_trop_haute(self):
        erreurs = valider_pio(65.0, "OG")
        assert len(erreurs) == 1

    def test_pio_none(self):
        assert valider_pio(None, "OD") == []

    def test_pio_limite_basse(self):
        assert valider_pio(5.0, "OD") == []

    def test_pio_limite_haute(self):
        assert valider_pio(60.0, "OD") == []


# ═══════════════════════════════════════════════════════════════
# TESTS – valider_acuite
# ═══════════════════════════════════════════════════════════════

class TestValiderAcuite:
    def test_acuite_normale(self):
        assert valider_acuite(1.0, "OD", "SC") == []

    def test_acuite_hors_limites(self):
        erreurs = valider_acuite(3.0, "OD", "SC")
        assert len(erreurs) == 1

    def test_acuite_none(self):
        assert valider_acuite(None, "OD", "SC") == []

    def test_acuite_zero(self):
        assert valider_acuite(0.0, "OD", "SC") == []

    def test_acuite_limite_haute(self):
        assert valider_acuite(2.0, "OD", "AC") == []


# ═══════════════════════════════════════════════════════════════
# TESTS – generer_alertes (ISO 14971)
# ═══════════════════════════════════════════════════════════════

class TestGenererAlertes:
    def _examen_base(self, **kwargs):
        defaults = {
            "patient_id": 1,
            "patient_age": 30,
            "date_examen": "2026-01-15",
        }
        defaults.update(kwargs)
        return ExamenComplet(**defaults)

    def test_pas_alerte_examen_normal(self):
        examen = self._examen_base(
            pio_od=15.0, pio_og=14.0,
            refraction_od=RefractionData(sphere=-1.0, cylindre=-0.5, axe=90),
            refraction_og=RefractionData(sphere=-1.0, cylindre=-0.5, axe=90),
        )
        alertes = generer_alertes(examen)
        assert len(alertes) == 0

    def test_pio_elevee(self):
        examen = self._examen_base(pio_od=25.0, pio_og=14.0)
        alertes = generer_alertes(examen)
        codes = [a.code for a in alertes]
        assert "PIO_ELEVEE" in codes

    def test_pio_critique(self):
        examen = self._examen_base(pio_od=35.0, pio_og=14.0)
        alertes = generer_alertes(examen)
        assert any(a.niveau == 3 for a in alertes)

    def test_pio_critique_niveau_urgence(self):
        examen = self._examen_base(pio_od=35.0)
        alertes = generer_alertes(examen)
        critique = [a for a in alertes if a.code == "PIO_CRITIQUE"]
        assert len(critique) == 1
        assert critique[0].niveau == 3

    def test_motilite_anormale(self):
        examen = self._examen_base(motilite_oculaire="Anormale")
        alertes = generer_alertes(examen)
        codes = [a.code for a in alertes]
        assert "MOTILITE_ANORMALE" in codes

    def test_champ_visuel_reduit(self):
        examen = self._examen_base(champ_visuel="Réduit")
        alertes = generer_alertes(examen)
        cv = [a for a in alertes if a.code == "CHAMP_VISUEL_ANORMAL"]
        assert len(cv) == 1
        assert cv[0].niveau == 2

    def test_champ_visuel_scotome_urgence(self):
        examen = self._examen_base(champ_visuel="Scotome")
        alertes = generer_alertes(examen)
        cv = [a for a in alertes if a.code == "CHAMP_VISUEL_ANORMAL"]
        assert len(cv) == 1
        assert cv[0].niveau == 3

    def test_forte_myopie_alerte(self):
        examen = self._examen_base(
            refraction_od=RefractionData(sphere=-8.0, cylindre=-1.0, axe=90),
            refraction_og=RefractionData(sphere=-1.0, cylindre=0.0, axe=0),
        )
        alertes = generer_alertes(examen)
        assert any(a.code == "FORTE_MYOPIE" for a in alertes)

    def test_anisometropie(self):
        examen = self._examen_base(
            refraction_od=RefractionData(sphere=-5.0, cylindre=0.0, axe=0),
            refraction_og=RefractionData(sphere=-1.0, cylindre=0.0, axe=0),
        )
        alertes = generer_alertes(examen)
        assert any(a.code == "ANISOMETROPIE" for a in alertes)

    def test_pas_anisometropie_faible_diff(self):
        examen = self._examen_base(
            refraction_od=RefractionData(sphere=-2.0, cylindre=0.0, axe=0),
            refraction_og=RefractionData(sphere=-1.5, cylindre=0.0, axe=0),
        )
        alertes = generer_alertes(examen)
        assert not any(a.code == "ANISOMETROPIE" for a in alertes)

    def test_presbytie_non_corrigee(self):
        examen = self._examen_base(
            patient_age=50,
            refraction_od=RefractionData(sphere=-1.0),
            refraction_og=RefractionData(sphere=-1.0),
        )
        alertes = generer_alertes(examen)
        assert any(a.code == "PRESBYTIE_NON_CORRIGEE" for a in alertes)

    def test_pas_alerte_presbytie_jeune(self):
        examen = self._examen_base(
            patient_age=25,
            refraction_od=RefractionData(sphere=-1.0),
            refraction_og=RefractionData(sphere=-1.0),
        )
        alertes = generer_alertes(examen)
        assert not any(a.code == "PRESBYTIE_NON_CORRIGEE" for a in alertes)

    def test_alertes_multiples(self):
        """PIO critique + forte myopie + motilité anormale"""
        examen = self._examen_base(
            pio_od=35.0,
            motilite_oculaire="Anormale",
            refraction_od=RefractionData(sphere=-9.0, cylindre=-1.0, axe=90),
            refraction_og=RefractionData(sphere=-1.0),
        )
        alertes = generer_alertes(examen)
        codes = [a.code for a in alertes]
        assert "PIO_CRITIQUE" in codes
        assert "MOTILITE_ANORMALE" in codes
        assert "FORTE_MYOPIE" in codes


# ═══════════════════════════════════════════════════════════════
# TESTS – calculer_tranche_age
# ═══════════════════════════════════════════════════════════════

class TestCalculerTrancheAge:
    def test_enfant(self):
        assert calculer_tranche_age(10) == "0-17"

    def test_jeune_adulte(self):
        assert calculer_tranche_age(25) == "18-29"

    def test_adulte(self):
        assert calculer_tranche_age(35) == "30-44"

    def test_senior(self):
        assert calculer_tranche_age(50) == "45-59"

    def test_retraite(self):
        assert calculer_tranche_age(65) == "60-74"

    def test_age_avance(self):
        assert calculer_tranche_age(80) == "75+"

    def test_frontiere_18(self):
        assert calculer_tranche_age(17) == "0-17"
        assert calculer_tranche_age(18) == "18-29"

    def test_frontiere_30(self):
        assert calculer_tranche_age(29) == "18-29"
        assert calculer_tranche_age(30) == "30-44"

    def test_age_zero(self):
        assert calculer_tranche_age(0) == "0-17"


# ═══════════════════════════════════════════════════════════════
# TESTS – analyser_tendances
# ═══════════════════════════════════════════════════════════════

class TestAnalyserTendances:
    def test_vide(self):
        result = analyser_tendances([])
        assert result == {}

    def test_un_patient_myope(self):
        data = [{"age": 25, "rx_od_sphere": -3.0, "rx_od_cylindre": 0.0,
                 "rx_og_sphere": -3.0, "rx_og_cylindre": 0.0}]
        result = analyser_tendances(data)
        assert "18-29" in result
        assert result["18-29"]["nombre_patients"] == 1
        assert result["18-29"]["taux_myopie"] == 100.0

    def test_patient_emmetrope(self):
        data = [{"age": 30, "rx_od_sphere": 0.0, "rx_od_cylindre": 0.0,
                 "rx_og_sphere": 0.0, "rx_og_cylindre": 0.0}]
        result = analyser_tendances(data)
        assert "30-44" in result
        assert result["30-44"]["taux_myopie"] == 0.0

    def test_presbytie_comptage(self):
        data = [{"age": 55, "rx_od_sphere": 0.0, "rx_od_cylindre": 0.0,
                 "rx_og_sphere": 0.0, "rx_og_cylindre": 0.0,
                 "rx_od_addition": 2.0, "rx_og_addition": 2.0}]
        result = analyser_tendances(data)
        assert result["45-59"]["taux_presbytie"] > 0

    def test_plusieurs_tranches(self):
        data = [
            {"age": 20, "rx_od_sphere": -1.0, "rx_od_cylindre": 0.0,
             "rx_og_sphere": -1.0, "rx_og_cylindre": 0.0},
            {"age": 50, "rx_od_sphere": 1.0, "rx_od_cylindre": 0.0,
             "rx_og_sphere": 1.0, "rx_og_cylindre": 0.0},
        ]
        result = analyser_tendances(data)
        assert "18-29" in result
        assert "45-59" in result


# ═══════════════════════════════════════════════════════════════
# TESTS – analyser_examen (intégration)
# ═══════════════════════════════════════════════════════════════

class TestAnalyserExamen:
    def test_examen_normal(self):
        examen = ExamenComplet(
            patient_id=1, patient_age=30, date_examen="2026-01-15",
            av_od_sc=1.0, av_og_sc=1.0,
            pio_od=15.0, pio_og=14.0,
            refraction_od=RefractionData(sphere=-1.0, cylindre=-0.5, axe=90),
            refraction_og=RefractionData(sphere=-1.0, cylindre=-0.5, axe=90),
        )
        result = analyser_examen(examen)
        assert result.est_valide
        assert result.sphere_equivalente_od == -1.25
        assert result.sphere_equivalente_og == -1.25
        assert "Myopie" in result.classification_od
        assert result.risque_global == 0

    def test_examen_invalide(self):
        examen = ExamenComplet(
            patient_id=2, patient_age=30, date_examen="2026-01-15",
            refraction_od=RefractionData(sphere=-50.0),  # Hors limites
        )
        result = analyser_examen(examen)
        assert not result.est_valide
        assert len(result.erreurs_validation) > 0

    def test_examen_avec_alertes(self):
        examen = ExamenComplet(
            patient_id=3, patient_age=30, date_examen="2026-01-15",
            pio_od=35.0, pio_og=14.0,
            refraction_od=RefractionData(sphere=-8.0, cylindre=-1.0, axe=90),
            refraction_og=RefractionData(sphere=-1.0, cylindre=-0.5, axe=90),
        )
        result = analyser_examen(examen)
        assert result.risque_global == 3  # PIO critique
        assert len(result.alertes) >= 2

    def test_examen_presbyte(self):
        examen = ExamenComplet(
            patient_id=4, patient_age=55, date_examen="2026-01-15",
            refraction_od=RefractionData(sphere=1.0, cylindre=0.0, axe=0, addition=2.0),
            refraction_og=RefractionData(sphere=1.0, cylindre=0.0, axe=0, addition=2.0),
        )
        result = analyser_examen(examen)
        assert "Presbytie" in result.classification_od

    def test_examen_vide(self):
        """Examen sans données de réfraction"""
        examen = ExamenComplet(
            patient_id=5, patient_age=25, date_examen="2026-01-15",
        )
        result = analyser_examen(examen)
        assert result.est_valide
        assert result.sphere_equivalente_od is None
        assert result.sphere_equivalente_og is None

    def test_risque_global_max_alertes(self):
        """Le risque global = max des niveaux d'alertes"""
        examen = ExamenComplet(
            patient_id=6, patient_age=30, date_examen="2026-01-15",
            pio_od=25.0,  # niveau 2
            champ_visuel="Scotome",  # niveau 3
        )
        result = analyser_examen(examen)
        assert result.risque_global == 3
