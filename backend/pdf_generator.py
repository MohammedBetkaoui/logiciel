# ─────────────────────────────────────────────────────────────────
# BBA-Data – Générateur PDF Bilan Optométrique (ReportLab)
# PDF professionnel A4 avec sections structurées & normes ISO
# ─────────────────────────────────────────────────────────────────

import hashlib
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    KeepTogether,
    HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle
from reportlab.graphics import renderPDF

# ═══════════════════════════════════════════════════════════════
# PALETTE DE COULEURS
# ═══════════════════════════════════════════════════════════════
C_BLUE_DARK   = colors.HexColor("#1a3c5e")
C_BLUE_MID    = colors.HexColor("#2563eb")
C_BLUE_LIGHT  = colors.HexColor("#4a90d9")
C_BLUE_BG     = colors.HexColor("#eff6ff")
C_GREEN_BG    = colors.HexColor("#ecfdf5")
C_GREEN       = colors.HexColor("#27ae60")
C_CARD_BG     = colors.HexColor("#f8f9fa")
C_HEADER_BG   = colors.HexColor("#f1f5f9")
C_TEXT         = colors.HexColor("#2c3e50")
C_TEXT_SEC     = colors.HexColor("#7f8c8d")
C_BORDER      = colors.HexColor("#e0e0e0")
C_ROW_ALT     = colors.HexColor("#fafbfc")
C_WHITE       = colors.white
C_RED         = colors.HexColor("#dc2626")
C_ORANGE      = colors.HexColor("#d97706")
C_AMBER_BG    = colors.HexColor("#fffbeb")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# ═══════════════════════════════════════════════════════════════
# STYLES
# ═══════════════════════════════════════════════════════════════
def _build_styles():
    ss = getSampleStyleSheet()
    styles = {}
    styles["title"] = ParagraphStyle(
        "BilanTitle", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=16, leading=19,
        textColor=C_TEXT, spaceAfter=1 * mm,
    )
    styles["subtitle"] = ParagraphStyle(
        "BilanSubtitle", parent=ss["Normal"],
        fontName="Helvetica", fontSize=7.5, leading=10,
        textColor=C_TEXT_SEC, spaceAfter=0,
    )
    styles["section_title"] = ParagraphStyle(
        "SectionTitle", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=C_BLUE_DARK, spaceAfter=0, spaceBefore=0,
    )
    styles["badge"] = ParagraphStyle(
        "Badge", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=6.5, leading=8,
        textColor=C_BLUE_DARK, alignment=TA_CENTER,
    )
    styles["cell"] = ParagraphStyle(
        "Cell", parent=ss["Normal"],
        fontName="Helvetica", fontSize=9, leading=12,
        textColor=C_TEXT,
    )
    styles["cell_bold"] = ParagraphStyle(
        "CellBold", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=C_TEXT,
    )
    styles["cell_mono"] = ParagraphStyle(
        "CellMono", parent=ss["Normal"],
        fontName="Courier-Bold", fontSize=9, leading=12,
        textColor=C_TEXT,
    )
    styles["eye_od"] = ParagraphStyle(
        "EyeOD", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        textColor=C_BLUE_DARK,
    )
    styles["eye_og"] = ParagraphStyle(
        "EyeOG", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=8.5, leading=11,
        textColor=colors.HexColor("#047857"),
    )
    styles["header_cell"] = ParagraphStyle(
        "HeaderCell", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=7, leading=9,
        textColor=C_TEXT_SEC,
    )
    styles["field_label"] = ParagraphStyle(
        "FieldLabel", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=6.5, leading=8,
        textColor=C_TEXT_SEC,
    )
    styles["field_value"] = ParagraphStyle(
        "FieldValue", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=10, leading=13,
        textColor=C_TEXT,
    )
    styles["field_value_mono"] = ParagraphStyle(
        "FieldValueMono", parent=ss["Normal"],
        fontName="Courier-Bold", fontSize=10, leading=13,
        textColor=C_TEXT,
    )
    styles["footer"] = ParagraphStyle(
        "Footer", parent=ss["Normal"],
        fontName="Helvetica", fontSize=6.5, leading=9,
        textColor=C_TEXT_SEC,
    )
    styles["footer_brand"] = ParagraphStyle(
        "FooterBrand", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=6.5, leading=9,
        textColor=colors.HexColor("#64748b"),
    )
    styles["patient_name"] = ParagraphStyle(
        "PatientName", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=12, leading=15,
        textColor=C_TEXT,
    )
    styles["patient_detail"] = ParagraphStyle(
        "PatientDetail", parent=ss["Normal"],
        fontName="Helvetica", fontSize=8, leading=11,
        textColor=C_TEXT_SEC,
    )
    styles["doc_type"] = ParagraphStyle(
        "DocType", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=7, leading=9,
        textColor=C_BLUE_DARK, alignment=TA_RIGHT,
    )
    styles["ref_number"] = ParagraphStyle(
        "RefNumber", parent=ss["Normal"],
        fontName="Courier-Bold", fontSize=18, leading=21,
        textColor=C_TEXT, alignment=TA_RIGHT,
    )
    styles["meta_line"] = ParagraphStyle(
        "MetaLine", parent=ss["Normal"],
        fontName="Helvetica", fontSize=8, leading=10,
        textColor=C_TEXT_SEC, alignment=TA_RIGHT,
    )
    styles["conclusion_label"] = ParagraphStyle(
        "ConclusionLabel", parent=ss["Normal"],
        fontName="Helvetica-Bold", fontSize=7, leading=9,
        textColor=C_TEXT_SEC,
    )
    styles["conclusion_value"] = ParagraphStyle(
        "ConclusionValue", parent=ss["Normal"],
        fontName="Helvetica", fontSize=9, leading=13,
        textColor=C_TEXT,
    )
    return styles


# ═══════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════
def _v(val, suffix=""):
    """Format a value with optional suffix, or return '—' if empty."""
    if val is None or str(val).strip() in ("", "None", "null"):
        return "—"
    return f"{val}{suffix}"


def _p(text, style):
    """Create a Paragraph from text and style."""
    return Paragraph(str(text), style)


def _make_logo():
    """Create a BBA logo as a Drawing (rounded blue square)."""
    d = Drawing(42, 42)
    d.add(Rect(0, 0, 42, 42, rx=8, ry=8,
               fillColor=C_BLUE_DARK, strokeColor=None))
    d.add(String(8, 14, "BBA",
                 fontName="Helvetica-Bold", fontSize=14,
                 fillColor=C_WHITE))
    return d


def _section_border_style(n_rows, col_count):
    """Build a TableStyle that gives a card appearance with left blue border."""
    cmds = [
        # Card outer border
        ("BOX", (0, 0), (-1, -1), 0.75, C_BORDER),
        # Left accent
        ("LINEBEFOREBORDER", (0, 0), (0, -1), 3, C_BLUE_DARK),
        ("BACKGROUND", (0, 0), (-1, -1), C_WHITE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    return cmds


def _data_table_style(n_data_rows, n_cols, has_header=True):
    """Return TableStyle commands for a professional data table."""
    cmds = [
        ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]
    if has_header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), C_HEADER_BG),
            ("LINEBELOW", (0, 0), (-1, 0), 0.75, C_BORDER),
        ]
    # Alternating rows
    start = 1 if has_header else 0
    total = start + n_data_rows
    for i in range(start, total):
        if (i - start) % 2 == 1:
            cmds.append(("BACKGROUND", (0, i), (-1, i), C_ROW_ALT))
    # Inner grid
    cmds.append(("INNERGRID", (0, 0), (-1, -1), 0.25, C_BORDER))
    return cmds


# ═══════════════════════════════════════════════════════════════
# SECTION BUILDERS
# ═══════════════════════════════════════════════════════════════
def _build_header(data, styles):
    """Build the top header with logo, title, and meta."""
    logo = _make_logo()

    title_block = [
        _p("Bilan Optométrique", styles["title"]),
        _p("Institut BBA · Système Digital d'Analyse Statistique des Bilans Optométriques", styles["subtitle"]),
    ]

    bilan_num = data.get("bilan_num", "0000")
    date_str = data.get("date", "—")
    praticien = data.get("praticien", "—")

    meta_block = [
        _p("RAPPORT D'EXAMEN", styles["doc_type"]),
        _p(f"#{bilan_num}", styles["ref_number"]),
        _p(date_str, styles["meta_line"]),
        _p(f"Praticien : {praticien}", styles["meta_line"]),
    ]

    # Title column
    from reportlab.platypus import TableStyle as TS
    title_table = Table([[t] for t in title_block], colWidths=[CONTENT_W * 0.55])
    title_table.setStyle(TS([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    meta_table = Table([[m] for m in meta_block], colWidths=[CONTENT_W * 0.32])
    meta_table.setStyle(TS([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    header = Table(
        [[logo, title_table, meta_table]],
        colWidths=[48, CONTENT_W * 0.55, CONTENT_W * 0.32],
    )
    header.setStyle(TS([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
    ]))
    return header


def _build_patient_card(data, styles):
    """Build the patient info banner."""
    patient = data.get("patient", {})
    nom = patient.get("nom", "—")
    ddn = patient.get("ddn", "—")
    sexe = patient.get("sexe", "—")
    ptype = patient.get("type", "ROUTINE")
    initial = nom[0].upper() if nom and nom != "—" else "?"

    # Avatar as a Drawing
    avatar = Drawing(36, 36)
    avatar.add(Circle(18, 18, 18, fillColor=C_BLUE_MID, strokeColor=None))
    avatar.add(String(10, 11, initial, fontName="Helvetica-Bold",
                      fontSize=15, fillColor=C_WHITE))

    info_block = Table([
        [_p(nom, styles["patient_name"])],
        [_p(f"Né(e) le {ddn}  ·  Sexe : {sexe}", styles["patient_detail"])],
    ], colWidths=[CONTENT_W * 0.55])
    info_block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    # Badge
    badge_colors = {
        "ROUTINE": (C_TEXT_SEC, colors.HexColor("#f3f4f6")),
        "URGENCE": (C_RED, colors.HexColor("#fef2f2")),
        "SURVEILLANCE": (C_BLUE_MID, C_BLUE_BG),
    }
    badge_fg, badge_bg = badge_colors.get(ptype.upper(), badge_colors["ROUTINE"])

    badge_table = Table(
        [[_p(ptype.upper(), ParagraphStyle(
            "BadgeInline", fontName="Helvetica-Bold", fontSize=7.5,
            leading=10, textColor=badge_fg, alignment=TA_CENTER,
        ))]],
        colWidths=[65], rowHeights=[18],
    )
    badge_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
        ("BOX", (0, 0), (-1, -1), 0.5, badge_fg),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))

    row = Table(
        [[avatar, info_block, badge_table]],
        colWidths=[44, CONTENT_W - 44 - 75, 75],
    )
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BACKGROUND", (0, 0), (-1, -1), C_BLUE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#bae6fd")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (0, 0), 12),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 12),
    ]))
    return row


def _build_section(title, badge_text, content_table, styles):
    """Wrap a content table in a section card with title bar and left accent."""
    # Title row
    title_parts = [_p(title, styles["section_title"])]
    badge_cell = ""
    if badge_text:
        badge_cell = _p(badge_text, styles["badge"])

    title_row = Table(
        [[title_parts[0], badge_cell]],
        colWidths=[CONTENT_W - 70, 62],
    )
    title_row.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_HEADER_BG),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (-1, 0), (-1, 0), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (0, 0), 12),
        ("RIGHTPADDING", (-1, 0), (-1, 0), 8),
    ]))

    # Combine: title + content in a single card
    wrapper = Table(
        [[title_row], [content_table]],
        colWidths=[CONTENT_W],
    )
    total_rows = 2
    wrapper.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, C_BORDER),
        # Left blue accent border
        ("LINEBEFOREBORDER", (0, 0), (0, -1), 3, C_BLUE_DARK),
        ("BACKGROUND", (0, 1), (-1, -1), C_WHITE),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, C_BORDER),
        ("TOPPADDING", (0, 1), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 1), (-1, -1), 10),
        ("RIGHTPADDING", (0, 1), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return wrapper


def _build_acuite_section(data, styles):
    """Section 1: Acuité Visuelle."""
    av = data.get("acuite_visuelle", {})
    header = [
        _p("", styles["header_cell"]),
        _p("SANS CORRECTION", styles["header_cell"]),
        _p("AVEC CORRECTION", styles["header_cell"]),
    ]
    rows = [
        header,
        [
            _p("Œil Droit (OD)", styles["eye_od"]),
            _p(_v(av.get("od_sc")), styles["cell_mono"]),
            _p(_v(av.get("od_ac")), styles["cell_mono"]),
        ],
        [
            _p("Œil Gauche (OG)", styles["eye_og"]),
            _p(_v(av.get("og_sc")), styles["cell_mono"]),
            _p(_v(av.get("og_ac")), styles["cell_mono"]),
        ],
        [
            _p("AV Binoculaire", styles["cell_bold"]),
            _p(_v(av.get("binoculaire")), styles["cell_mono"]),
            _p("", styles["cell"]),
        ],
    ]
    t = Table(rows, colWidths=[CONTENT_W * 0.35, CONTENT_W * 0.30, CONTENT_W * 0.30])
    t.setStyle(TableStyle(_data_table_style(3, 3)))
    return _build_section("👁  Acuité Visuelle", "ISO 8596", t, styles)


def _build_refraction_obj_section(data, styles):
    """Section 2: Réfraction Objective."""
    ref = data.get("refraction_objective", {})
    od = ref.get("od", {})
    og = ref.get("og", {})
    header = [
        _p("", styles["header_cell"]),
        _p("SPHÈRE", styles["header_cell"]),
        _p("CYLINDRE", styles["header_cell"]),
        _p("AXE", styles["header_cell"]),
    ]
    rows = [
        header,
        [
            _p("OD", styles["eye_od"]),
            _p(_v(od.get("sphere")), styles["cell_mono"]),
            _p(_v(od.get("cylindre")), styles["cell_mono"]),
            _p(_v(od.get("axe")), styles["cell_mono"]),
        ],
        [
            _p("OG", styles["eye_og"]),
            _p(_v(og.get("sphere")), styles["cell_mono"]),
            _p(_v(og.get("cylindre")), styles["cell_mono"]),
            _p(_v(og.get("axe")), styles["cell_mono"]),
        ],
    ]
    t = Table(rows, colWidths=[CONTENT_W * 0.20, CONTENT_W * 0.25,
                                CONTENT_W * 0.25, CONTENT_W * 0.25])
    t.setStyle(TableStyle(_data_table_style(2, 4)))
    return _build_section("🔬  Réfraction Objective", "AUTORÉFRACTOMÈTRE", t, styles)


def _build_prescription_section(data, styles):
    """Section 3: Réfraction Subjective – Prescription."""
    rx = data.get("prescription", {})
    od = rx.get("od", {})
    og = rx.get("og", {})
    header = [
        _p("", styles["header_cell"]),
        _p("SPHÈRE", styles["header_cell"]),
        _p("CYLINDRE", styles["header_cell"]),
        _p("AXE", styles["header_cell"]),
        _p("ADDITION", styles["header_cell"]),
        _p("PRISME", styles["header_cell"]),
        _p("BASE", styles["header_cell"]),
    ]
    cw = CONTENT_W
    widths = [cw * 0.10, cw * 0.15, cw * 0.15, cw * 0.12,
              cw * 0.16, cw * 0.14, cw * 0.13]
    rows = [
        header,
        [
            _p("OD", styles["eye_od"]),
            _p(_v(od.get("sphere")), styles["cell_mono"]),
            _p(_v(od.get("cylindre")), styles["cell_mono"]),
            _p(_v(od.get("axe")), styles["cell_mono"]),
            _p(_v(od.get("addition")), styles["cell_mono"]),
            _p(_v(od.get("prisme")), styles["cell_mono"]),
            _p(_v(od.get("base")), styles["cell"]),
        ],
        [
            _p("OG", styles["eye_og"]),
            _p(_v(og.get("sphere")), styles["cell_mono"]),
            _p(_v(og.get("cylindre")), styles["cell_mono"]),
            _p(_v(og.get("axe")), styles["cell_mono"]),
            _p(_v(og.get("addition")), styles["cell_mono"]),
            _p(_v(og.get("prisme")), styles["cell_mono"]),
            _p(_v(og.get("base")), styles["cell"]),
        ],
    ]
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle(_data_table_style(2, 7)))
    return _build_section("📋  Réfraction Subjective – Prescription", "ISO 13666", t, styles)


def _build_distances_pio_section(data, styles):
    """Section 4: Distances Pupillaires & PIO."""
    dp = data.get("distances_pression", {})
    fields = [
        ("DP OD", _v(dp.get("dp_od")), True),
        ("DP OG", _v(dp.get("dp_og")), True),
        ("DP BINOCULAIRE", _v(dp.get("dp_bino")), True),
        ("PIO OD", _v(dp.get("pio_od")), True),
        ("PIO OG", _v(dp.get("pio_og")), True),
        ("MÉTHODE PIO", _v(dp.get("methode")), False),
    ]
    label_row = []
    value_row = []
    for label, val, mono in fields:
        label_row.append(_p(label, styles["field_label"]))
        st = styles["field_value_mono"] if mono else styles["field_value"]
        # Highlight PIO > 21
        if "mmHg" in val:
            try:
                num = float(val.replace(" mmHg", ""))
                if num > 21:
                    st = ParagraphStyle(
                        "AlertValue", parent=st,
                        textColor=C_RED,
                    )
            except ValueError:
                pass
        value_row.append(_p(val, st))

    cw = CONTENT_W / 6
    t = Table([label_row, value_row], colWidths=[cw] * 6)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.25, C_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, C_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    return _build_section("📐  Distances Pupillaires & Pression Intraoculaire", "", t, styles)


def _build_examens_section(data, styles):
    """Section 5: Vision Binoculaire & Examens Complémentaires."""
    ex = data.get("examens", {})
    fields = [
        ("MOTILITÉ OCULAIRE", ex.get("motilite")),
        ("COVER TEST", ex.get("cover_test")),
        ("TEST COULEURS", ex.get("test_couleurs")),
        ("FOND D'ŒIL", ex.get("fond_oeil")),
        ("BIOMICROSCOPIE", ex.get("biomicroscopie")),
        ("CHAMP VISUEL", ex.get("champ_visuel")),
    ]
    # 3x2 grid
    row1_labels = []
    row1_values = []
    row2_labels = []
    row2_values = []
    for i, (label, val) in enumerate(fields):
        lp = _p(label, styles["field_label"])
        vp = _p(_v(val), styles["field_value"])
        if i < 3:
            row1_labels.append(lp)
            row1_values.append(vp)
        else:
            row2_labels.append(lp)
            row2_values.append(vp)

    cw = CONTENT_W / 3
    t = Table(
        [row1_labels, row1_values, row2_labels, row2_values],
        colWidths=[cw] * 3,
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.25, C_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, C_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # Separator line between first and second rows of fields
        ("LINEBELOW", (0, 1), (-1, 1), 0.5, C_BORDER),
    ]))
    return _build_section("🔍  Vision Binoculaire & Examens Complémentaires", "", t, styles)


def _build_diagnostic_section(data, styles):
    """Section 6: Diagnostic & Conclusion."""
    diag = data.get("diagnostic", "—")
    obs = data.get("observations", "—")

    diag_box = Table([
        [_p("DIAGNOSTIC", styles["conclusion_label"])],
        [_p(_v(diag), styles["conclusion_value"])],
    ], colWidths=[CONTENT_W * 0.46])
    diag_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))

    obs_box = Table([
        [_p("OBSERVATIONS", styles["conclusion_label"])],
        [_p(_v(obs), styles["conclusion_value"])],
    ], colWidths=[CONTENT_W * 0.46])
    obs_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), C_CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))

    # Stamp "DOCUMENT VÉRIFIÉ"
    stamp = Table(
        [[_p("●  DOCUMENT VÉRIFIÉ", ParagraphStyle(
            "StampText", fontName="Helvetica-Bold", fontSize=7,
            leading=9, textColor=C_GREEN, alignment=TA_CENTER,
        ))]],
        colWidths=[100], rowHeights=[18],
    )
    stamp.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 1, C_GREEN),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))

    content = Table([
        [diag_box, obs_box],
        ["", stamp],
    ], colWidths=[CONTENT_W * 0.50, CONTENT_W * 0.50])
    content.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (-1, -1), (-1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    return _build_section("📝  Diagnostic & Conclusion", "", content, styles)


def _build_footer(data, styles):
    """Build the footer block."""
    bilan_num = data.get("bilan_num", "0000")
    sha = data.get("sha256", "N/A")
    now = datetime.now()
    gen_date = now.strftime("%d/%m/%Y à %H:%M")

    left_lines = (
        f'<b>BBA-Data</b> — Institut BBA · Bilan #{bilan_num}<br/>'
        f'Généré le {gen_date}<br/>'
        f'Ce document est confidentiel. Toute reproduction non autorisée est interdite.<br/>'
        f'Données traitées conformément à la Déclaration d\'Helsinki et au RGPD (UE 2016/679).'
    )
    left = _p(left_lines, styles["footer"])

    hash_style = ParagraphStyle(
        "HashText", fontName="Courier", fontSize=6.5, leading=8,
        textColor=C_TEXT_SEC, alignment=TA_RIGHT,
    )
    right_block = Table([
        [_p(f"SHA-256 : {sha[:24]}", hash_style)],
        [_p("ISO 13666 · ISO 8596 · RGPD · CEI 62304", ParagraphStyle(
            "Standards", fontName="Helvetica", fontSize=6, leading=8,
            textColor=C_TEXT_SEC, alignment=TA_RIGHT,
        ))],
    ], colWidths=[CONTENT_W * 0.40])
    right_block.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))

    footer = Table(
        [[left, right_block]],
        colWidths=[CONTENT_W * 0.58, CONTENT_W * 0.42],
    )
    footer.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("LINEABOVE", (0, 0), (-1, 0), 1, C_BORDER),
    ]))
    return footer


# ═══════════════════════════════════════════════════════════════
# PAGE DECORATOR (left accent band)
# ═══════════════════════════════════════════════════════════════
def _draw_page_decoration(canvas, doc):
    """Draw decorative left band on each page."""
    canvas.saveState()
    # Gradient-like left band (3 segments)
    band_w = 4
    h3 = PAGE_H / 3
    canvas.setFillColor(colors.HexColor("#1e40af"))
    canvas.rect(0, 2 * h3, band_w, h3, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#3b82f6"))
    canvas.rect(0, h3, band_w, h3, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#93c5fd"))
    canvas.rect(0, 0, band_w, h3, fill=1, stroke=0)
    canvas.restoreState()


# ═══════════════════════════════════════════════════════════════
# MAIN FUNCTION
# ═══════════════════════════════════════════════════════════════
def generate_bilan_pdf(data: dict, output_path: str) -> str:
    """
    Generate a professional A4 PDF for a Bilan Optométrique.

    Args:
        data: Dictionary with bilan data (see module docstring for format).
        output_path: File path where the PDF will be saved.

    Returns:
        The output_path of the generated PDF.
    """
    styles = _build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )

    elements = []

    # Header
    elements.append(_build_header(data, styles))
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(
        width="100%", thickness=2, color=C_BLUE_DARK,
        spaceAfter=4 * mm,
    ))

    # Patient card
    elements.append(_build_patient_card(data, styles))
    elements.append(Spacer(1, 5 * mm))

    # Sections
    elements.append(KeepTogether(_build_acuite_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))

    elements.append(KeepTogether(_build_refraction_obj_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))

    elements.append(KeepTogether(_build_prescription_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))

    elements.append(KeepTogether(_build_distances_pio_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))

    elements.append(KeepTogether(_build_examens_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))

    elements.append(KeepTogether(_build_diagnostic_section(data, styles)))
    elements.append(Spacer(1, 6 * mm))

    # Footer
    elements.append(_build_footer(data, styles))

    doc.build(elements, onFirstPage=_draw_page_decoration, onLaterPages=_draw_page_decoration)
    return output_path


def generate_bilan_pdf_bytes(data: dict) -> bytes:
    """
    Generate a professional PDF and return it as bytes (for HTTP responses).

    Args:
        data: Dictionary with bilan data.

    Returns:
        PDF content as bytes.
    """
    buf = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
    )

    elements = []

    elements.append(_build_header(data, styles))
    elements.append(Spacer(1, 3 * mm))
    elements.append(HRFlowable(
        width="100%", thickness=2, color=C_BLUE_DARK,
        spaceAfter=4 * mm,
    ))
    elements.append(_build_patient_card(data, styles))
    elements.append(Spacer(1, 5 * mm))
    elements.append(KeepTogether(_build_acuite_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))
    elements.append(KeepTogether(_build_refraction_obj_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))
    elements.append(KeepTogether(_build_prescription_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))
    elements.append(KeepTogether(_build_distances_pio_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))
    elements.append(KeepTogether(_build_examens_section(data, styles)))
    elements.append(Spacer(1, 4 * mm))
    elements.append(KeepTogether(_build_diagnostic_section(data, styles)))
    elements.append(Spacer(1, 6 * mm))
    elements.append(_build_footer(data, styles))

    doc.build(elements, onFirstPage=_draw_page_decoration, onLaterPages=_draw_page_decoration)
    return buf.getvalue()
