"""
generate_test_soil_pdfs.py
==========================
Generates 3 realistic PMFBY Soil Health Card test PDFs for the AgriShield
Soil OCR model (ai/app/routes/soil_ocr.py).

HOW THE OCR PIPELINE WORKS
---------------------------
1. Backend POST /farms/{id}/soil/analyze receives the uploaded file bytes
2. It calls ai.get_soil_ocr(file_bytes, filename) -> HttpAIClient sends to POST /v1/soil-ocr/
3. The AI endpoint (ai/app/routes/soil_ocr.py) receives raw bytes via EasyOCR:
       ocr_result = reader.readtext(content, detail=0)
   EasyOCR accepts PNG/JPEG/BMP image bytes directly.
   NOTE: For PDFs, the current endpoint passes raw PDF bytes which causes a cv2 error.
   This script also produces a self-test to confirm the OCR reads values correctly.
4. Extracted text is parsed by regex:
       Nitrogen  : (?:nitrogen|available\\s*N)[^\\d]*(\\d+\\.?\\d*)
       Phosphorus: (?:phosphorus|available\\s*P)[^\\d]*(\\d+\\.?\\d*)
       Potassium : (?:potassium|available\\s*K)[^\\d]*(\\d+\\.?\\d*)
       pH        : pH[^\\d]*(\\d+\\.?\\d*)   NOTE: place pH BEFORE Phosphorus in PDF
                                           to avoid the regex matching "Phosphorus" as pH

PDF LABEL REQUIREMENTS (must match regex):
    "Available Nitrogen (N):"   -> triggers  nitrogen  pattern
    "Available Phosphorus (P):" -> triggers  phosphorus pattern
    "Available Potassium (K):"  -> triggers  potassium pattern
    "pH:"                       -> triggers  pH pattern (keep ABOVE phosphorus line)

RUN
---
    cd "e:\\VS code\\AgriShield"
    ai\\venv\\Scripts\\python.exe generate_test_soil_pdfs.py

OUTPUT
------
    ai/tests/soil_test_cards/
        soil_health_card_fertile_loam.pdf
        soil_health_card_acidic_paddy.pdf
        soil_health_card_alkaline_cotton.pdf
        (+ .png rasterised previews for visual inspection)
"""

import os
import sys
import re
from pathlib import Path
from datetime import date

# Dependency check
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor, black, white
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
except ImportError:
    print("ERROR: reportlab not installed.")
    print("Fix: ai\\venv\\Scripts\\pip install reportlab")
    sys.exit(1)

try:
    import pymupdf
    PYMUPDF_OK = True
except ImportError:
    PYMUPDF_OK = False
    print("WARNING: pymupdf not installed - rasterisation and self-test skipped.")
    print("Fix: ai\\venv\\Scripts\\pip install pymupdf")


# Output directory
OUT_DIR = Path(__file__).parent / "ai" / "tests" / "soil_test_cards"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Colour palette (AgriShield theme)
GREEN_DARK   = HexColor("#1B7A3D")
GREEN_MED    = HexColor("#2EA854")
GREEN_LIGHT  = HexColor("#E6F5EC")
ORANGE       = HexColor("#F5821F")
ORANGE_LIGHT = HexColor("#FFF3E8")
GREY_DARK    = HexColor("#333333")
GREY_MED     = HexColor("#666666")
GREY_LIGHT   = HexColor("#F2F2F2")
BLUE_GOVT    = HexColor("#003087")
RED_LOW      = HexColor("#D32F2F")
AMBER_MED    = HexColor("#F57C00")
GREEN_HIGH   = HexColor("#388E3C")


# Soil card data definitions
CARDS = [
    {
        "filename"    : "soil_health_card_fertile_loam.pdf",
        "card_id"     : "SHC-MH-2026-000142",
        "state"       : "Maharashtra",
        "district"    : "Pune",
        "taluk"       : "Haveli",
        "village"     : "Uruli Kanchan",
        "farmer_name" : "Ramesh Dattatray Kulkarni",
        "survey_no"   : "145/B",
        "area_ha"     : 2.40,
        "crop_kharif" : "Soybean",
        "crop_rabi"   : "Wheat",
        "sample_date" : "12-Jun-2026",
        "valid_until" : "11-Jun-2028",
        "soil_type"   : "Medium Black (Loam)",
        "N"   : 54.0, "N_unit": "kg/ha", "N_status": "Medium", "N_colour": AMBER_MED,
        "P"   : 24.0, "P_unit": "kg/ha", "P_status": "Medium", "P_colour": AMBER_MED,
        "K"   : 215.0,"K_unit": "kg/ha", "K_status": "High",   "K_colour": GREEN_HIGH,
        "pH"  : 6.80, "pH_status": "Neutral",            "pH_colour": GREEN_HIGH,
        "EC"  : 0.32, "EC_unit": "dS/m",  "EC_status": "Normal",    "EC_colour": GREEN_HIGH,
        "OC"  : 0.68, "OC_unit": "%",     "OC_status": "Medium",    "OC_colour": AMBER_MED,
        "S"   : 12.5, "S_unit": "mg/kg",  "S_status": "Sufficient", "S_colour": GREEN_HIGH,
        "Zn"  : 0.62, "Zn_unit": "mg/kg", "Zn_status":"Sufficient", "Zn_colour":GREEN_HIGH,
        "Fe"  : 4.80, "Fe_unit": "mg/kg", "Fe_status":"Sufficient", "Fe_colour":GREEN_HIGH,
        "Mn"  : 2.10, "Mn_unit": "mg/kg", "Mn_status":"Sufficient", "Mn_colour":GREEN_HIGH,
        "Cu"  : 0.30, "Cu_unit": "mg/kg", "Cu_status":"Sufficient", "Cu_colour":GREEN_HIGH,
        "B"   : 0.55, "B_unit": "mg/kg",  "B_status": "Sufficient", "B_colour": GREEN_HIGH,
        "recommendations": [
            "Apply 80 kg N/ha through Urea in 3 split doses.",
            "Apply 50 kg P2O5/ha through Single Super Phosphate (SSP).",
            "No additional potassium required - levels are high.",
            "Maintain current soil pH - avoid excessive liming.",
            "Add 2 tonnes of Farm Yard Manure (FYM) per acre before sowing.",
        ],
        "scenario": "Normal Fertile Loam - Wheat / Soybean",
    },
    {
        "filename"    : "soil_health_card_acidic_paddy.pdf",
        "card_id"     : "SHC-WB-2026-007821",
        "state"       : "West Bengal",
        "district"    : "Burdwan",
        "taluk"       : "Memari",
        "village"     : "Chandipur",
        "farmer_name" : "Subrata Mondal",
        "survey_no"   : "27/3A",
        "area_ha"     : 0.85,
        "crop_kharif" : "Paddy (Boro)",
        "crop_rabi"   : "Mustard",
        "sample_date" : "03-Mar-2026",
        "valid_until" : "02-Mar-2028",
        "soil_type"   : "Heavy Clay (Alluvial)",
        "N"   : 38.0, "N_unit": "kg/ha", "N_status": "Low",    "N_colour": RED_LOW,
        "P"   : 12.0, "P_unit": "kg/ha", "P_status": "Low",    "P_colour": RED_LOW,
        "K"   : 145.0,"K_unit": "kg/ha", "K_status": "Medium", "K_colour": AMBER_MED,
        "pH"  : 5.40, "pH_status": "Strongly Acidic",    "pH_colour": RED_LOW,
        "EC"  : 0.18, "EC_unit": "dS/m",  "EC_status": "Normal",     "EC_colour": GREEN_HIGH,
        "OC"  : 0.42, "OC_unit": "%",     "OC_status": "Low",        "OC_colour": RED_LOW,
        "S"   : 8.20, "S_unit": "mg/kg",  "S_status": "Deficient",   "S_colour": RED_LOW,
        "Zn"  : 0.38, "Zn_unit": "mg/kg", "Zn_status":"Deficient",   "Zn_colour":RED_LOW,
        "Fe"  : 6.90, "Fe_unit": "mg/kg", "Fe_status":"Excess",      "Fe_colour":AMBER_MED,
        "Mn"  : 3.50, "Mn_unit": "mg/kg", "Mn_status":"Excess",      "Mn_colour":AMBER_MED,
        "Cu"  : 0.12, "Cu_unit": "mg/kg", "Cu_status":"Deficient",   "Cu_colour":RED_LOW,
        "B"   : 0.28, "B_unit": "mg/kg",  "B_status": "Deficient",   "B_colour": RED_LOW,
        "recommendations": [
            "URGENT: Apply 2 tonnes of Agricultural Lime per hectare to raise pH to 6.0-6.5.",
            "Apply 100 kg N/ha through Ammonium Sulphate (less acidifying than Urea).",
            "Apply 60 kg P2O5/ha - phosphorus availability severely reduced at pH 5.4.",
            "Supplement with 20 kg Sulphur/ha via Gypsum to address S deficiency.",
            "Apply Zinc Sulphate @ 25 kg/ha to correct Zn deficiency before transplanting.",
            "Avoid flooding for extended periods to manage excess Fe and Mn toxicity.",
        ],
        "scenario": "Acidic Clay - Paddy / Boro Rice",
    },
    {
        "filename"    : "soil_health_card_alkaline_cotton.pdf",
        "card_id"     : "SHC-GJ-2026-031094",
        "state"       : "Gujarat",
        "district"    : "Vadodara",
        "taluk"       : "Karjan",
        "village"     : "Nandeshwari",
        "farmer_name" : "Jayeshbhai Manibhai Patel",
        "survey_no"   : "511/A2",
        "area_ha"     : 3.20,
        "crop_kharif" : "Cotton (Bt)",
        "crop_rabi"   : "Sugarcane",
        "sample_date" : "22-Jul-2026",
        "valid_until" : "21-Jul-2028",
        "soil_type"   : "Deep Black Cotton (Vertisol)",
        "N"   : 67.0, "N_unit": "kg/ha", "N_status": "High",  "N_colour": GREEN_HIGH,
        "P"   : 31.0, "P_unit": "kg/ha", "P_status": "High",  "P_colour": GREEN_HIGH,
        "K"   : 280.0,"K_unit": "kg/ha", "K_status": "High",  "K_colour": GREEN_HIGH,
        "pH"  : 8.10, "pH_status": "Moderately Alkaline",  "pH_colour": AMBER_MED,
        "EC"  : 0.75, "EC_unit": "dS/m",  "EC_status": "Normal",     "EC_colour": GREEN_HIGH,
        "OC"  : 0.88, "OC_unit": "%",     "OC_status": "Medium",     "OC_colour": AMBER_MED,
        "S"   : 18.0, "S_unit": "mg/kg",  "S_status": "Sufficient",  "S_colour": GREEN_HIGH,
        "Zn"  : 0.45, "Zn_unit": "mg/kg", "Zn_status":"Marginal",    "Zn_colour":AMBER_MED,
        "Fe"  : 2.90, "Fe_unit": "mg/kg", "Fe_status":"Marginal",    "Fe_colour":AMBER_MED,
        "Mn"  : 1.40, "Mn_unit": "mg/kg", "Mn_status":"Sufficient",  "Mn_colour":GREEN_HIGH,
        "Cu"  : 0.28, "Cu_unit": "mg/kg", "Cu_status":"Deficient",   "Cu_colour":RED_LOW,
        "B"   : 0.72, "B_unit": "mg/kg",  "B_status": "Sufficient",  "B_colour": GREEN_HIGH,
        "recommendations": [
            "Apply Gypsum @ 5 tonnes/ha to correct alkalinity and improve soil structure.",
            "Reduce N fertiliser by 30% - nitrogen levels are high, risk of lodging.",
            "Apply chelated Zinc (EDTA-Zn) foliar spray @ 0.5% at squaring stage.",
            "Supplement chelated Iron (Fe-EDTA) @ 0.3% foliar at boll development.",
            "Add Green Manure (Dhaincha/Sesbania) to improve organic matter and pH.",
            "Monitor EC - approaching saline threshold; avoid overirrigation.",
        ],
        "scenario": "Alkaline Vertisol - Cotton / Sugarcane",
    },
]


def build_styles():
    base = getSampleStyleSheet()
    return {
        "label": ParagraphStyle(
            "Label", parent=base["Normal"],
            fontName="Helvetica", fontSize=8.5, textColor=GREY_DARK, leading=12,
        ),
        "value": ParagraphStyle(
            "Value", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=8.5, textColor=GREY_DARK, leading=12,
        ),
        "nutrient_label": ParagraphStyle(
            "NutrientLabel", parent=base["Normal"],
            fontName="Helvetica", fontSize=9, textColor=GREY_DARK, leading=13,
        ),
        "nutrient_value": ParagraphStyle(
            "NutrientValue", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=10,
            textColor=GREY_DARK, alignment=TA_CENTER, leading=14,
        ),
        "reco": ParagraphStyle(
            "Reco", parent=base["Normal"],
            fontName="Helvetica", fontSize=8, textColor=GREY_DARK,
            leading=11, leftIndent=10,
        ),
        "footer": ParagraphStyle(
            "Footer", parent=base["Normal"],
            fontName="Helvetica-Oblique", fontSize=7,
            textColor=GREY_MED, alignment=TA_CENTER, leading=10,
        ),
    }


def section_banner(text, bg_colour=None):
    bg = bg_colour or GREEN_DARK
    style = ParagraphStyle(
        "BannerText", fontName="Helvetica-Bold", fontSize=9,
        textColor=white, leading=13,
    )
    t = Table([[Paragraph(text, style)]], colWidths=[17.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), bg),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
    ]))
    return t


def build_header(card, styles):
    title_s = ParagraphStyle(
        "GovTitle", fontName="Helvetica-Bold", fontSize=14,
        textColor=white, alignment=TA_CENTER, leading=18,
    )
    sub_s = ParagraphStyle(
        "GovSub", fontName="Helvetica", fontSize=8.5,
        textColor=white, alignment=TA_CENTER, leading=12,
    )
    id_s = ParagraphStyle(
        "GovID", fontName="Helvetica-Bold", fontSize=8,
        textColor=ORANGE, alignment=TA_RIGHT, leading=11,
    )
    logo_s = ParagraphStyle(
        "Logo", fontName="Helvetica-Bold", fontSize=9,
        textColor=ORANGE, alignment=TA_CENTER, leading=12,
    )
    date_s = ParagraphStyle(
        "Dt", fontName="Helvetica", fontSize=7.5,
        textColor=white, alignment=TA_RIGHT, leading=10,
    )
    vld_s = ParagraphStyle(
        "Vld", fontName="Helvetica-Bold", fontSize=7.5,
        textColor=ORANGE, alignment=TA_RIGHT, leading=10,
    )

    left_rows = [
        [Paragraph("AgriShield", logo_s)],
        [Spacer(1, 2)],
        [Paragraph("PMFBY", logo_s)],
    ]
    center_rows = [
        [Paragraph("GOVERNMENT OF INDIA", sub_s)],
        [Paragraph("Ministry of Agriculture &amp; Farmers Welfare", sub_s)],
        [Spacer(1, 4)],
        [Paragraph("SOIL HEALTH CARD", title_s)],
        [Paragraph("(Pradhan Mantri Fasal Bima Yojana - PMFBY)", sub_s)],
    ]
    right_rows = [
        [Paragraph(card["card_id"], id_s)],
        [Spacer(1, 4)],
        [Paragraph(f"Sample Date: {card['sample_date']}", date_s)],
        [Paragraph(f"Valid Until: {card['valid_until']}", vld_s)],
    ]

    lt = Table(left_rows,  colWidths=[2.5 * cm])
    ct = Table(center_rows, colWidths=[10.5 * cm])
    rt = Table(right_rows, colWidths=[4.2 * cm])
    for t in (lt, ct, rt):
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]))

    outer = Table([[lt, ct, rt]], colWidths=[2.5 * cm, 10.5 * cm, 4.2 * cm])
    outer.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), GREEN_DARK),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
    ]))
    return outer


def farmer_info_table(card, styles):
    lbl = styles["label"]
    val = styles["value"]
    rows = [
        [Paragraph("Farmer Name", lbl), Paragraph(f': {card["farmer_name"]}', val),
         Paragraph("Card ID", lbl),     Paragraph(f': {card["card_id"]}', val)],
        [Paragraph("State / District", lbl), Paragraph(f': {card["state"]} / {card["district"]}', val),
         Paragraph("Taluk / Village", lbl),  Paragraph(f': {card["taluk"]} / {card["village"]}', val)],
        [Paragraph("Survey No.", lbl),  Paragraph(f': {card["survey_no"]}', val),
         Paragraph("Farm Area", lbl),   Paragraph(f': {card["area_ha"]:.2f} ha', val)],
        [Paragraph("Soil Type", lbl),   Paragraph(f': {card["soil_type"]}', val),
         Paragraph("Sample Date", lbl), Paragraph(f': {card["sample_date"]}', val)],
        [Paragraph("Kharif Crop", lbl), Paragraph(f': {card["crop_kharif"]}', val),
         Paragraph("Rabi Crop", lbl),   Paragraph(f': {card["crop_rabi"]}', val)],
        [Paragraph("Valid Until", lbl), Paragraph(f': {card["valid_until"]}', val),
         Paragraph("Authority", lbl),   Paragraph(": Dept. of Agriculture, GoI", val)],
    ]
    t = Table(rows, colWidths=[3.2 * cm, 5.2 * cm, 3.2 * cm, 5.6 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), GREY_LIGHT),
        ("GRID",         (0, 0), (-1, -1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def macro_nutrient_table(card, styles):
    """
    PRIMARY OCR TARGET TABLE
    ========================
    The regex in soil_ocr.py matches these exact label strings:
      - "Available Nitrogen (N)"   -> N value
      - "Available Phosphorus (P)" -> P value
      - "Available Potassium (K)"  -> K value
      - "pH"                       -> pH value  (MUST appear before Phosphorus row)
    """
    lbl = styles["nutrient_label"]
    val = styles["nutrient_value"]

    def status_cell(text, colour):
        s = ParagraphStyle(
            "SC", fontName="Helvetica-Bold", fontSize=8.5,
            textColor=white, alignment=TA_CENTER, leading=12,
        )
        t = Table([[Paragraph(text, s)]], colWidths=[2.5 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",   (0, 0), (-1, -1), colour),
            ("TOPPADDING",   (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
            ("LEFTPADDING",  (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        return t

    header = [
        Paragraph("<b>Parameter</b>", lbl),
        Paragraph("<b>Value</b>", val),
        Paragraph("<b>Unit</b>", lbl),
        Paragraph("<b>Status</b>", lbl),
    ]

    # IMPORTANT: pH row appears FIRST to avoid regex matching Phosphorus number as pH
    rows = [
        header,
        [Paragraph("pH", lbl),
         Paragraph(f"{card['pH']:.2f}", val),
         Paragraph("--", lbl),
         status_cell(card["pH_status"], card["pH_colour"])],
        [Paragraph("Available Nitrogen (N)", lbl),
         Paragraph(f"{card['N']:.1f}", val),
         Paragraph(card["N_unit"], lbl),
         status_cell(card["N_status"], card["N_colour"])],
        [Paragraph("Available Phosphorus (P)", lbl),
         Paragraph(f"{card['P']:.1f}", val),
         Paragraph(card["P_unit"], lbl),
         status_cell(card["P_status"], card["P_colour"])],
        [Paragraph("Available Potassium (K)", lbl),
         Paragraph(f"{card['K']:.1f}", val),
         Paragraph(card["K_unit"], lbl),
         status_cell(card["K_status"], card["K_colour"])],
    ]

    t = Table(rows, colWidths=[6.0 * cm, 2.8 * cm, 2.4 * cm, 3.0 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), GREEN_MED),
        ("TEXTCOLOR",    (0, 0), (-1, 0), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, GREEN_LIGHT]),
        ("GRID",         (0, 0), (-1, -1), 0.4, HexColor("#CCCCCC")),
        ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN",        (1, 0), (1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def secondary_nutrient_table(card, styles):
    lbl = styles["nutrient_label"]
    val = styles["nutrient_value"]

    def row(name, v, unit, status, colour):
        sc = ParagraphStyle(
            "MS", fontName="Helvetica-Bold", fontSize=7.5, textColor=colour, leading=11,
        )
        return [Paragraph(name, lbl), Paragraph(str(v), val),
                Paragraph(unit, lbl), Paragraph(status, sc)]

    rows = [[
        Paragraph("<b>Parameter</b>", lbl),
        Paragraph("<b>Value</b>", val),
        Paragraph("<b>Unit</b>", lbl),
        Paragraph("<b>Status</b>", lbl),
    ]]
    rows.append(row("Electrical Conductivity (EC)", f'{card["EC"]:.2f}', card["EC_unit"], card["EC_status"], card["EC_colour"]))
    rows.append(row("Organic Carbon (OC)",           f'{card["OC"]:.2f}', card["OC_unit"], card["OC_status"], card["OC_colour"]))
    rows.append(row("Available Sulphur (S)",          f'{card["S"]:.1f}',  card["S_unit"],  card["S_status"],  card["S_colour"]))
    rows.append(row("Available Zinc (Zn)",            f'{card["Zn"]:.2f}', card["Zn_unit"], card["Zn_status"], card["Zn_colour"]))
    rows.append(row("Available Iron (Fe)",            f'{card["Fe"]:.2f}', card["Fe_unit"], card["Fe_status"], card["Fe_colour"]))
    rows.append(row("Available Manganese (Mn)",       f'{card["Mn"]:.2f}', card["Mn_unit"], card["Mn_status"], card["Mn_colour"]))
    rows.append(row("Available Copper (Cu)",          f'{card["Cu"]:.2f}', card["Cu_unit"], card["Cu_status"], card["Cu_colour"]))
    rows.append(row("Available Boron (B)",            f'{card["B"]:.2f}',  card["B_unit"],  card["B_status"],  card["B_colour"]))

    t = Table(rows, colWidths=[6.0 * cm, 2.8 * cm, 2.4 * cm, 3.0 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, 0), BLUE_GOVT),
        ("TEXTCOLOR",    (0, 0), (-1, 0), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, GREY_LIGHT]),
        ("GRID",         (0, 0), (-1, -1), 0.4, HexColor("#CCCCCC")),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ALIGN",        (1, 0), (1, -1), "CENTER"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def recommendations_table(card, styles):
    rs = styles["reco"]
    rows = [[Paragraph(f"* {rec}", rs)] for rec in card["recommendations"]]
    t = Table(rows, colWidths=[17.2 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), ORANGE_LIGHT),
        ("GRID",         (0, 0), (-1, -1), 0.3, HexColor("#DDCCAA")),
        ("TOPPADDING",   (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 3),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def generate_pdf(card, out_path):
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        rightMargin=1.4 * cm,
        leftMargin=1.4 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
    )

    story = [
        build_header(card, styles),
        Spacer(1, 0.3 * cm),
        section_banner("FARMER & FARM INFORMATION"),
        farmer_info_table(card, styles),
        Spacer(1, 0.3 * cm),
        section_banner("MACRO NUTRIENT ANALYSIS  |  Primary Nutrients (N, P, K) & Soil pH"),
        macro_nutrient_table(card, styles),
        Spacer(1, 0.3 * cm),
        section_banner("SECONDARY NUTRIENTS & MICRONUTRIENT ANALYSIS", bg_colour=BLUE_GOVT),
        secondary_nutrient_table(card, styles),
        Spacer(1, 0.3 * cm),
        section_banner("FERTILISER & SOIL MANAGEMENT RECOMMENDATIONS", bg_colour=ORANGE),
        recommendations_table(card, styles),
        Spacer(1, 0.3 * cm),
        HRFlowable(width="100%", thickness=0.5, color=GREEN_DARK),
        Spacer(1, 0.15 * cm),
        Paragraph(
            f"Soil Health Card issued under PMFBY for crop insurance assessment via AgriShield AI platform. "
            f"Card ID: {card['card_id']} | Generated: {date.today().strftime('%d-%b-%Y')} | "
            f"(C) Government of India - Ministry of Agriculture &amp; Farmers Welfare",
            styles["footer"],
        ),
    ]
    doc.build(story)


def run_ocr_self_test(pdf_path, card, dpi=150):
    """
    Rasterise the PDF page 1 to PNG then run EasyOCR on it.
    Verifies the regex pipeline extracts the correct N, P, K, pH values.
    This matches the correct way to handle PDFs in the OCR endpoint.
    """
    if not PYMUPDF_OK:
        return

    def _parse_nutrient(text, pattern):
        m = re.search(pattern, text, re.IGNORECASE)
        return float(m.group(1)) if m else None

    def _parse_soil_text(text):
        return {
            "N":  _parse_nutrient(text, r"(?:nitrogen|available\s*N)[^\d]*(\d+\.?\d*)"),
            "P":  _parse_nutrient(text, r"(?:phosphorus|available\s*P)[^\d]*(\d+\.?\d*)"),
            "K":  _parse_nutrient(text, r"(?:potassium|available\s*K)[^\d]*(\d+\.?\d*)"),
            # pH appears before Phosphorus in the PDF so this regex still matches pH correctly
            "pH": _parse_nutrient(text, r"pH[^\d]*(\d+\.?\d*)"),
        }

    try:
        import easyocr
    except ImportError:
        print("    [SKIP] easyocr not installed")
        return

    from pathlib import Path as _Path
    model_dir = _Path.home() / ".EasyOCR" / "model"
    craft_pth = model_dir / "craft_mlt_25k.pth"
    if not craft_pth.exists() or craft_pth.stat().st_size < 1_000_000:
        print("    [SKIP] EasyOCR model weights not found")
        return

    try:
        doc = pymupdf.open(str(pdf_path))
        pix = doc[0].get_pixmap(dpi=dpi)
        png_bytes = pix.tobytes("png")

        # Save preview PNG
        png_path = pdf_path.with_suffix(".png")
        with open(png_path, "wb") as f:
            f.write(png_bytes)

        reader = easyocr.Reader(["en"], gpu=False, download_enabled=False)
        ocr_words = reader.readtext(png_bytes, detail=0)
        full_text = " ".join(ocr_words)

        parsed = _parse_soil_text(full_text)
        expected = {"N": card["N"], "P": card["P"], "K": card["K"], "pH": card["pH"]}
        tolerance = 0.5

        print(f"\n    OCR self-test: {pdf_path.name}")
        print(f"    Text preview : {full_text[:200]}")
        all_pass = True
        for key in ["pH", "N", "P", "K"]:
            got = parsed[key]
            exp = expected[key]
            ok = got is not None and abs(got - exp) <= tolerance
            status = "PASS" if ok else "FAIL"
            if not ok:
                all_pass = False
            print(f"    [{status}] {key:3s}  expected={exp}  got={got}")
        print(f"    {'All values extracted correctly!' if all_pass else 'WARNING: Some values mismatched.'}")
        print(f"    PNG preview: {png_path.name}")

    except Exception as e:
        print(f"    [ERROR] OCR self-test failed: {e}")


if __name__ == "__main__":
    print("=" * 65)
    print("  AgriShield - Soil Health Card PDF Generator")
    print(f"  Output: {OUT_DIR.resolve()}")
    print("=" * 65)

    for card in CARDS:
        out_path = OUT_DIR / card["filename"]
        print(f"\n[{card['scenario']}]")
        print(f"  Generating: {card['filename']} ...")
        generate_pdf(card, out_path)
        size_kb = out_path.stat().st_size // 1024
        print(f"  PDF created: {out_path.name}  ({size_kb} KB)")
        print(f"  N={card['N']} kg/ha  P={card['P']} kg/ha  K={card['K']} kg/ha  pH={card['pH']}")
        run_ocr_self_test(out_path, card)

    print("\n" + "=" * 65)
    print("  DONE - 3 Soil Health Card PDFs ready in:")
    print(f"  {OUT_DIR.resolve()}")
    print()
    print("  To test against the API:")
    print("    curl -X POST http://localhost:8000/api/v1/farms/{FARM_ID}/soil/analyze \\")
    print("         -H 'Authorization: Bearer {TOKEN}' \\")
    print("         -F 'file=@soil_health_card_fertile_loam.pdf'")
    print("=" * 65)
