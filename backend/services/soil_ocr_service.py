"""Soil report OCR and document extraction service for AgriShield backend.
Supports multi-page PDFs, PyMuPDF table finder, EasyOCR with OpenCV CLAHE illumination normalization, and Hindi/English semantic parsing.
"""
import re
import time
import io
import logging

logger = logging.getLogger(__name__)

_reader = None


def get_ocr_reader():
    global _reader
    if _reader is None:
        try:
            import easyocr
            try:
                import torch
                use_gpu = torch.cuda.is_available()
            except ImportError:
                use_gpu = False
            _reader = easyocr.Reader(["en"], gpu=use_gpu, download_enabled=False)
        except Exception as e:
            logger.warning(f"Failed to initialize EasyOCR reader: {e}")
            _reader = None
    return _reader


def _preprocess_image(img_bytes: bytes) -> bytes:
    """Enhance image contrast and illumination using OpenCV CLAHE for mobile photos."""
    try:
        import cv2
        import numpy as np
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return img_bytes

        h, w = img.shape[:2]
        if max(h, w) > 2200:
            scale = 2200.0 / max(h, w)
            img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        _, encoded = cv2.imencode('.png', enhanced)
        return encoded.tobytes()
    except Exception as e:
        logger.warning(f"Image preprocessing fallback: {e}")
        return img_bytes


def _parse_nutrient_from_text(text: str, label_pattern: str):
    p1 = rf'(?:{label_pattern})[^\d\n]{{0,30}}[:\-\s]+(\d+\.?\d*)'
    m = re.search(p1, text, re.IGNORECASE)
    if m:
        try:
            return float(m.groups()[-1])
        except (ValueError, TypeError):
            pass

    p2 = rf'(?:{label_pattern})[^\n]*\n[^\d\n]*(\d+\.?\d*)'
    m = re.search(p2, text, re.IGNORECASE)
    if m:
        try:
            return float(m.groups()[-1])
        except (ValueError, TypeError):
            pass

    p3 = rf'(?:{label_pattern})[^\d]{{0,40}}(\d+\.?\d*)'
    m = re.search(p3, text, re.IGNORECASE)
    if m:
        try:
            return float(m.groups()[-1])
        except (ValueError, TypeError):
            pass

    return None


def _parse_tables_for_nutrients(doc) -> dict:
    found = {}
    try:
        for page in doc:
            tabs = page.find_tables()
            for tab in tabs:
                for row in tab.extract():
                    row_str = ' '.join([str(c) for c in row if c is not None])

                    if re.search(r'Nitrogen|\bN\b|नाइट्रोजन|नायट्रोजन', row_str, re.IGNORECASE) and 'N' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['N'] = float(cell)
                                break

                    if re.search(r'Phosphorus|P2O5|\bP\b|फास्फोरस|स्फुर', row_str, re.IGNORECASE) and 'P' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['P'] = float(cell)
                                break

                    if re.search(r'Potassium|K2O|\bK\b|पोटाश|पोटैशियम', row_str, re.IGNORECASE) and 'K' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['K'] = float(cell)
                                break

                    if re.search(r'\bpH\b|पीएच|सामू', row_str, re.IGNORECASE) and 'pH' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                val = float(cell)
                                if 3.0 <= val <= 11.0:
                                    found['pH'] = val
                                    break

                    if re.search(r'Organic\s*Carbon|\bOC\b|कार्बन', row_str, re.IGNORECASE) and 'organic_carbon' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['organic_carbon'] = float(cell)
                                break

                    if re.search(r'Conductivity|\bEC\b|चालकता', row_str, re.IGNORECASE) and 'electrical_conductivity' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['electrical_conductivity'] = float(cell)
                                break

                    if re.search(r'Zinc|\bZn\b|जिंक', row_str, re.IGNORECASE) and 'zinc' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['zinc'] = float(cell)
                                break

                    if re.search(r'Sulphur|Sulfur|\bS\b|सल्फर|गंधक', row_str, re.IGNORECASE) and 'sulphur' not in found:
                        for cell in row:
                            if cell and re.match(r'^\s*(\d+\.?\d*)\s*$', str(cell)):
                                found['sulphur'] = float(cell)
                                break

                    if re.search(r'Area|रकबा', row_str, re.IGNORECASE) and 'area_acres' not in found:
                        area_m = re.search(r'(?:Farm\s*Area|Area|रकबा)[^\d]*(\d+\.?\d*)\s*(ha|hectares?|acres?|एकड़)?', row_str, re.IGNORECASE)
                        if area_m:
                            try:
                                v = float(area_m.group(1))
                                u = (area_m.group(2) or 'ha').lower()
                                if 'acre' in u or 'एकड़' in u:
                                    found['area_acres'] = round(v, 2)
                                    found['area_ha'] = round(v * 0.404686, 2)
                                else:
                                    found['area_ha'] = round(v, 2)
                                    found['area_acres'] = round(v * 2.47105, 2)
                            except Exception:
                                pass

                    if re.search(r'Farmer\s*Name|किसान', row_str, re.IGNORECASE) and 'farmer_name' not in found:
                        fn_m = re.search(r'(?:Farmer\s*Name|किसान\s*का\s*नाम)[^\w]*[:\-]?\s*([A-Za-z\s]{3,35})', row_str, re.IGNORECASE)
                        if fn_m and fn_m.group(1).strip().lower() not in ['farmer name', 'name']:
                            clean = re.sub(r'[\r\n]+.*|Card.*', '', fn_m.group(1)).strip()
                            if len(clean) >= 3:
                                found['farmer_name'] = clean

                    if re.search(r'Card\s*ID|SHC', row_str, re.IGNORECASE) and 'card_id' not in found:
                        cid_m = re.search(r'([A-Z0-9\-_]{6,30})', row_str)
                        if cid_m:
                            found['card_id'] = cid_m.group(1).strip()
    except Exception as e:
        logger.warning(f"Table parsing warning: {e}")

    return found


def _parse_soil_text(text: str) -> dict:
    N = _parse_nutrient_from_text(text, r'Available\s+Nitrogen(?:\s*\(N\))?|Nitrogen(?:\s*\(N\))?|Avail\.?\s*N|उपलब्ध\s*नाइट्रोजन|नाइट्रोजन|नायट्रोजन')
    P = _parse_nutrient_from_text(text, r'Available\s+Phosphorus(?:\s*\(P\))?|Phosphorus(?:\s*\(P\))?|Available\s+P2O5|P2O5|Avail\.?\s*P|उपलब्ध\s*फास्फोरस|फास्फोरस|स्फुर')
    K = _parse_nutrient_from_text(text, r'Available\s+Potassium(?:\s*\(K\))?|Potassium(?:\s*\(K\))?|Available\s+K2O|K2O|Avail\.?\s*K|उपलब्ध\s*पोटाश|पोटाश|पोटैशियम')

    pH_candidate = _parse_nutrient_from_text(text, r'Soil\s+Reaction(?:\s*\(pH\))?|Soil\s+pH|pH\s*Value|pH(?:\s*\(1:2\.5\))?|pH(?:\s*स्तर)?|पीएच|सामू')
    pH = pH_candidate if (pH_candidate and 3.0 <= pH_candidate <= 11.0) else None

    area_acres = None
    area_ha = None
    area_match = re.search(r'(?:Farm\s*Area|Land\s*Area|Area|रकबा|क्षेत्रफल)[^\d\n]*[:\-\s]*(\d+\.?\d*)\s*(ha|hectares?|acres?|एकड़)?', text, re.IGNORECASE)
    if area_match:
        try:
            val = float(area_match.group(1))
            unit = (area_match.group(2) or 'ha').lower()
            if 'acre' in unit or 'एकड़' in unit:
                area_acres = round(val, 2)
                area_ha = round(val * 0.404686, 2)
            else:
                area_ha = round(val, 2)
                area_acres = round(val * 2.47105, 2)
        except Exception:
            pass

    oc = _parse_nutrient_from_text(text, r'Organic\s+Carbon(?:\s*\(OC\))?|जैविक\s*कार्बन|कार्बन|सेंद्रिय\s*कर्ब')
    ec = _parse_nutrient_from_text(text, r'Electrical\s+Conductivity(?:\s*\(EC\))?|विद्युत\s*चालकता')
    zinc = _parse_nutrient_from_text(text, r'Available\s+Zinc(?:\s*\(Zn\))?|Zinc(?:\s*\(Zn\))?|जिंक|जस्ता')
    sulphur = _parse_nutrient_from_text(text, r'Available\s+Sulphur(?:\s*\(S\))?|Sulphur(?:\s*\(S\))?|सल्फर|गंधक')

    card_id_m = re.search(r'(?:Card\s*ID|SHC\s*No|Report\s*No)[^\w\n]*([A-Z0-9\-_]{6,30})', text, re.IGNORECASE)
    card_id = card_id_m.group(1).strip() if card_id_m else None

    farmer_m = re.search(r'(?:Farmer\s*Name|किसान\s*का\s*नाम)[^\w\n]*\n?[^\w\n]*[:\-]?\s*([A-Za-z\s]{3,35})(?:\n|Card|$)', text, re.IGNORECASE)
    farmer_name = farmer_m.group(1).strip() if farmer_m else None
    if farmer_name:
        farmer_name = re.sub(r'[\r\n]+.*|Card.*', '', farmer_name).strip()

    return {
        "N": N,
        "P": P,
        "K": K,
        "pH": pH,
        "area_acres": area_acres,
        "area_ha": area_ha,
        "organic_carbon": oc,
        "electrical_conductivity": ec,
        "zinc": zinc,
        "sulphur": sulphur,
        "card_id": card_id,
        "farmer_name": farmer_name
    }


def _extract_from_pdf(content: bytes) -> tuple[dict, str, str]:
    full_text = ""
    engine = "pymupdf-table"

    try:
        import pymupdf
        doc = pymupdf.open(stream=content, filetype="pdf")
        table_data = _parse_tables_for_nutrients(doc)

        pages_text = [page.get_text() or "" for page in doc]
        full_text = "\n".join(pages_text).strip()

        if all(table_data.get(k) is not None for k in ['N', 'P', 'K', 'pH']):
            return table_data, full_text, "pymupdf-tables"

        text_parsed = _parse_soil_text(full_text)
        merged = {**table_data}
        for k, v in text_parsed.items():
            if merged.get(k) is None and v is not None:
                merged[k] = v

        if sum(1 for k in ['N', 'P', 'K', 'pH'] if merged.get(k) is not None) >= 3:
            return merged, full_text, "pymupdf-hybrid"

        reader = get_ocr_reader()
        if reader is not None and len(doc) > 0:
            ocr_text_parts = []
            for i in range(min(len(doc), 3)):
                pix = doc[i].get_pixmap(dpi=150)
                img_bytes = _preprocess_image(pix.tobytes("png"))
                ocr_lines = reader.readtext(img_bytes, detail=0)
                ocr_text_parts.append(" ".join(ocr_lines))

            scanned_text = " ".join(ocr_text_parts).strip()
            if scanned_text:
                scanned_parsed = _parse_soil_text(scanned_text)
                for k, v in scanned_parsed.items():
                    if merged.get(k) is None and v is not None:
                        merged[k] = v
                return merged, (full_text + " " + scanned_text).strip(), "pymupdf-easyocr"

        return merged, full_text, engine
    except Exception as e:
        logger.warning(f"PyMuPDF PDF extraction error: {e}")

    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        pypdf_text = "\n".join([page.extract_text() or "" for page in reader.pages]).strip()
        parsed = _parse_soil_text(pypdf_text)
        return parsed, pypdf_text, "pypdf-text"
    except Exception as e:
        logger.warning(f"pypdf fallback error: {e}")

    return {}, full_text, engine


def _extract_from_image(content: bytes) -> tuple[dict, str, str]:
    reader = get_ocr_reader()
    full_text = ""
    if reader is not None:
        try:
            enhanced_bytes = _preprocess_image(content)
            ocr_lines = reader.readtext(enhanced_bytes, detail=0)
            full_text = " ".join(ocr_lines).strip()
            parsed = _parse_soil_text(full_text)
            return parsed, full_text, "easyocr-v1.0"
        except Exception as e:
            logger.warning(f"EasyOCR image extraction error: {e}")
    return {}, full_text, "image-fallback"


def extract_soil_data_from_bytes(file_bytes: bytes, filename: str = "") -> dict:
    t0 = time.time()
    try:
        fn_lower = filename.lower()
        is_pdf = file_bytes.startswith(b"%PDF") or fn_lower.endswith(".pdf")

        if is_pdf:
            parsed, full_text, engine = _extract_from_pdf(file_bytes)
        else:
            parsed, full_text, engine = _extract_from_image(file_bytes)

        primary_nutrients = ["N", "P", "K", "pH"]
        found_count = sum(1 for k in primary_nutrients if parsed.get(k) is not None)

        defaults = {"N": 45.0, "P": 22.0, "K": 180.0, "pH": 6.8}

        if found_count == 4:
            confidence = 0.96
        elif found_count == 3:
            confidence = 0.88
        elif found_count == 2:
            confidence = 0.75
        elif found_count == 1:
            confidence = 0.60
        else:
            confidence = 0.45

        final_nutrients = {
            k: parsed.get(k) if parsed.get(k) is not None else defaults[k]
            for k in primary_nutrients
        }

        elapsed = int((time.time() - t0) * 1000)
        cleaned_sample = re.sub(r'\s+', ' ', full_text).strip()
        extracted_text_display = cleaned_sample[:600] if cleaned_sample else "Soil Health Card processed"

        return {
            **final_nutrients,
            "confidence": round(confidence, 2),
            "extracted_text": extracted_text_display,
            "model_version": engine,
            "low_confidence": confidence < 0.7,
            "inference_ms": elapsed,
            "metadata": {
                "farmer_name": parsed.get("farmer_name"),
                "card_id": parsed.get("card_id"),
                "area_acres": parsed.get("area_acres"),
                "area_ha": parsed.get("area_ha"),
                "organic_carbon": parsed.get("organic_carbon"),
                "electrical_conductivity": parsed.get("electrical_conductivity"),
                "zinc": parsed.get("zinc"),
                "sulphur": parsed.get("sulphur"),
            }
        }
    except Exception as e:
        logger.error(f"Soil OCR service error: {e}", exc_info=True)
        elapsed = int((time.time() - t0) * 1000)
        return {
            "N": 45.0, "P": 22.0, "K": 180.0, "pH": 6.8,
            "confidence": 0.50,
            "extracted_text": f"Extraction error: {str(e)[:150]}",
            "model_version": "soil-ocr-fallback",
            "low_confidence": True,
            "inference_ms": elapsed,
            "metadata": {}
        }
