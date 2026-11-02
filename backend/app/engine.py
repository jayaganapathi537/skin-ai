import json
import math
import os

from colorspacious import cspace_convert

from . import engine_config as cfg

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_palettes() -> dict:
    with open(os.path.join(DATA_DIR, "palettes.json"), "r") as f:
        return json.load(f)


def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip("#") if h else ""
    if len(h) < 6:
        return (128, 128, 128)
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def hex_to_lab(h: str) -> tuple:
    rgb = hex_to_rgb(h)
    lab = cspace_convert([rgb[0] / 255, rgb[1] / 255, rgb[2] / 255], "sRGB1", "CIELab")
    return float(lab[0]), float(lab[1]), float(lab[2])


def _hue_angle(a: float, b: float) -> float:
    angle = math.degrees(math.atan2(b, a))
    return angle if angle >= 0 else angle + 360


def _chroma(a: float, b: float) -> float:
    return math.sqrt(a ** 2 + b ** 2)


def _ciede2000(lab1: tuple, lab2: tuple) -> float:
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    C1 = math.sqrt(a1**2 + b1**2)
    C2 = math.sqrt(a2**2 + b2**2)
    C_avg = (C1 + C2) / 2
    C_avg7 = C_avg**7
    G = 0.5 * (1 - math.sqrt(C_avg7 / (C_avg7 + 25**7)))
    a1p = a1 * (1 + G)
    a2p = a2 * (1 + G)
    C1p = math.sqrt(a1p**2 + b1**2)
    C2p = math.sqrt(a2p**2 + b2**2)

    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360

    dLp = L2 - L1
    dCp = C2p - C1p

    if C1p * C2p == 0:
        dhp = 0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    elif h2p - h1p > 180:
        dhp = h2p - h1p - 360
    else:
        dhp = h2p - h1p + 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))

    Lp_avg = (L1 + L2) / 2
    Cp_avg = (C1p + C2p) / 2
    if C1p * C2p == 0:
        hp_avg = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hp_avg = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hp_avg = (h1p + h2p + 360) / 2
    else:
        hp_avg = (h1p + h2p - 360) / 2

    T = (
        1
        - 0.17 * math.cos(math.radians(hp_avg - 30))
        + 0.24 * math.cos(math.radians(2 * hp_avg))
        + 0.32 * math.cos(math.radians(3 * hp_avg + 6))
        - 0.20 * math.cos(math.radians(4 * hp_avg - 63))
    )

    SL = 1 + 0.015 * (Lp_avg - 50) ** 2 / math.sqrt(20 + (Lp_avg - 50) ** 2)
    SC = 1 + 0.045 * Cp_avg
    SH = 1 + 0.015 * Cp_avg * T

    Cp_avg7 = Cp_avg**7
    RT = (
        -2
        * math.sqrt(Cp_avg7 / (Cp_avg7 + 25**7))
        * math.sin(math.radians(60 * math.exp(-(((hp_avg - 275) / 25) ** 2))))
    )

    dE = math.sqrt(
        (dLp / SL) ** 2
        + (dCp / SC) ** 2
        + (dHp / SH) ** 2
        + RT * (dCp / SC) * (dHp / SH)
    )
    return dE


# --- A. UNDERTONE ---

def compute_undertone(skin_lab: tuple, lip_lab: tuple = None, hair_lab: tuple = None) -> dict:
    _, sa, sb = skin_lab
    skin_hue = _hue_angle(sa, sb)

    warmth = skin_hue

    if lip_lab and cfg.LIP_WEIGHT > 0:
        _, la, lb = lip_lab
        lip_hue = _hue_angle(la, lb)
        if 20 < lip_hue < 80:
            warmth += cfg.LIP_WEIGHT
        elif lip_hue > 300 or lip_hue < 20:
            warmth -= cfg.LIP_WEIGHT

    if hair_lab and cfg.HAIR_WEIGHT > 0:
        _, _, hb = hair_lab
        if hb > 20:
            warmth += cfg.HAIR_WEIGHT
        elif hb < -5:
            warmth -= cfg.HAIR_WEIGHT

    if warmth > cfg.WARM_BOUNDARY:
        undertone = "warm"
        distance = warmth - cfg.WARM_BOUNDARY
    elif warmth < cfg.COOL_BOUNDARY:
        undertone = "cool"
        distance = cfg.COOL_BOUNDARY - warmth
    else:
        undertone = "neutral"
        distance = 0

    # Lean (only meaningful for neutral)
    if undertone == "neutral":
        if skin_hue >= cfg.LEAN_WARM:
            lean = "leaning warm"
        elif skin_hue <= cfg.LEAN_COOL:
            lean = "leaning cool"
        else:
            lean = "balanced"
    else:
        lean = None

    # Undertone clarity
    if undertone in ("warm", "cool"):
        clarity = min(1.0, distance / cfg.CLARITY_DIVISOR)
    else:
        clarity = None

    spectrum_position = max(0.0, min(1.0, (skin_hue - cfg.SPECTRUM_OFFSET) / cfg.SPECTRUM_RANGE))

    return {
        "undertone": undertone,
        "lean": lean,
        "clarity": round(clarity, 2) if clarity is not None else None,
        "spectrum_position": round(spectrum_position, 3),
        "raw_hue": round(skin_hue, 1),
    }


# --- B. DEPTH ---

def compute_depth(skin_L: float) -> str:
    if skin_L >= cfg.LIGHT_MIN_L:
        return "light"
    if skin_L >= cfg.MEDIUM_MIN_L:
        return "medium"
    return "deep"


# --- B. FAMILY ---

def get_palette_family(undertone: str, depth: str, skin_L: float) -> str:
    if undertone == "warm":
        if depth == "light":
            return "warm-light"
        if depth == "medium":
            return "warm-light" if skin_L >= cfg.MEDIUM_LIGHT_SPLIT_L else "warm-deep"
        return "warm-deep"
    if undertone == "cool":
        if depth == "light":
            return "cool-light"
        if depth == "medium":
            return "cool-light" if skin_L >= cfg.MEDIUM_LIGHT_SPLIT_L else "cool-deep"
        return "cool-deep"
    # neutral
    if depth == "light":
        return "neutral-soft"
    if depth == "medium":
        return "neutral-soft" if skin_L >= cfg.MEDIUM_LIGHT_SPLIT_L else "neutral-rich"
    return "neutral-rich"


# --- B. CONTRAST ---

def _hair_is_plausible(hair_lab: tuple) -> bool:
    h_L, h_a, h_b = hair_lab
    if h_L > cfg.HAIR_L_MAX:
        return False
    hue = _hue_angle(h_a, h_b)
    if hue < cfg.HAIR_HUE_MIN or hue > cfg.HAIR_HUE_MAX:
        return False
    return True


def compute_contrast(skin_L: float, brow_lab: tuple, eye_lab: tuple, hair_lab: tuple) -> dict:
    features = [brow_lab[0], eye_lab[0]]
    hair_included = _hair_is_plausible(hair_lab)
    if hair_included:
        features.append(hair_lab[0])
    mean_L = sum(features) / len(features)
    diff = abs(skin_L - mean_L)

    if diff > cfg.HIGH_CONTRAST:
        band = "high"
    elif diff > cfg.MEDIUM_CONTRAST:
        band = "medium"
    else:
        band = "low"

    return {"band": band, "diff": round(diff, 1), "hair_included": hair_included}


# --- C. PHOTO QUALITY ---

def compute_photo_quality(skin_lab: tuple, hair_lab: tuple, eye_lab: tuple, brow_lab: tuple) -> dict:
    quality = 1.0
    reasons = []

    skin_L, skin_a, skin_b = skin_lab
    skin_chr = _chroma(skin_a, skin_b)

    if skin_L < cfg.SKIN_L_MIN or skin_L > cfg.SKIN_L_MAX:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append(f"Skin brightness outside expected range (L*={skin_L:.0f})")

    if skin_chr < cfg.SKIN_CHROMA_MIN or skin_chr > cfg.SKIN_CHROMA_MAX:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append(f"Skin colour saturation looks unusual (chroma={skin_chr:.1f})")

    h_L, h_a, h_b = hair_lab
    h_hue = _hue_angle(h_a, h_b)
    if h_L > cfg.HAIR_L_MAX:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append("Hair colour looks unusually bright")
    if h_hue < cfg.HAIR_HUE_MIN or h_hue > cfg.HAIR_HUE_MAX:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append("Hair colour looks unusual — possibly affected by lighting")

    e_L = eye_lab[0]
    if e_L > cfg.EYES_L_MAX:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append("Eye colour appears very light — may be reflecting light")

    b_L = brow_lab[0]
    if b_L > skin_L:
        quality -= cfg.QUALITY_DEDUCTION
        reasons.append("Brows appear lighter than skin — possible lighting issue")

    quality = max(0.0, round(quality, 2))
    if quality >= 0.8:
        label = "Good"
    elif quality >= cfg.RETAKE_THRESHOLD:
        label = "Fair"
    else:
        label = "Retake"

    return {
        "score": quality,
        "label": label,
        "reasons": reasons,
        "suggest_retake": quality < cfg.RETAKE_THRESHOLD,
    }


# --- D. GARMENT RANKING ---

def match_garment(garment_hex: str, palette: dict) -> dict:
    garment_lab = hex_to_lab(garment_hex)

    hero_colors = palette.get("hero_colors", palette.get("heroes", []))
    neutral_colors = palette.get("neutral_colors", palette.get("neutrals", []))
    care_colors = palette.get("care_colors", [])

    positive_colors = hero_colors + neutral_colors
    if not positive_colors:
        return {"score": 50, "band": "Okay", "delta_e": None, "near_face_warning": False}

    min_positive_de = min(_ciede2000(garment_lab, hex_to_lab(c["hex"])) for c in positive_colors)

    near_face_warning = False
    if care_colors:
        min_care_de = min(_ciede2000(garment_lab, hex_to_lab(c["hex"])) for c in care_colors)
        if min_care_de < min_positive_de:
            near_face_warning = True

    de = min_positive_de
    score = max(0, round(100 - cfg.GARMENT_DELTA_E_MULTIPLIER * de, 1))

    if de <= cfg.GREAT_MAX_DELTA_E:
        band = "Great"
    elif de <= cfg.GOOD_MAX_DELTA_E:
        band = "Good"
    elif de <= cfg.OKAY_MAX_DELTA_E:
        band = "Okay"
    else:
        band = "Hidden"

    if near_face_warning and band in ("Great", "Good"):
        band = "Okay"

    return {
        "score": score,
        "band": band,
        "delta_e": round(de, 1),
        "near_face_warning": near_face_warning,
    }


# --- E. EXPLANATIONS ---

def generate_explanations(detected: dict, family: str, heroes: list) -> list:
    undertone = detected.get("undertone", "neutral")
    lean = detected.get("lean")
    eye_name = detected.get("eye_color_name", "Brown").lower()
    hair_name = detected.get("hair_color_name", "")
    hair_plausible = detected.get("hair_plausible", True)
    depth = detected.get("depth", "medium").lower()

    undertone_phrases = {
        "warm": "appears to complement your warm undertone",
        "cool": "suggests a natural harmony with your cool undertone",
        "neutral": "works well with your balanced undertone",
    }
    if undertone == "neutral" and lean and lean != "balanced":
        undertone_phrases["neutral"] = f"works well with your balanced, {lean} undertone"

    base = undertone_phrases.get(undertone, undertone_phrases["neutral"])

    # Whether to hedge language
    hedge = lean == "balanced" or (undertone == "neutral")

    templates_by_index = [
        [
            "{name} {base} and can brighten a {depth} complexion.",
            "{name} {base}, adding a fresh lift near {eye_color} eyes.",
            "{name} suggests a natural pairing for {depth} skin with {eye_color} eyes.",
        ],
        [
            "{name} {base} and brings warmth without overpowering.",
            "{name} {base}, creating depth near the face.",
            "{name} pairs well with {eye_color} eyes and a {depth} complexion.",
        ],
        [
            "{name} {base} and adds earthy richness.",
            "{name} {base}, grounding your {depth} colouring.",
        ],
    ]

    enriched = []
    for i, color in enumerate(heroes):
        name = color["name"]
        reason = color.get("reason_template", "")
        if reason:
            reason = reason.replace("{undertone_phrase}", base)
            reason = reason.replace("{eye_color}", eye_name)
            if hair_plausible and hair_name:
                reason = reason.replace("{hair_name}", hair_name.lower())
            else:
                reason = reason.replace(" and {hair_name} hair", "")
                reason = reason.replace("{hair_name}", "")
            reason = reason.replace("{depth}", depth)
            # Fix doubled "with"
            reason = reason.replace("with with", "with")
        else:
            group = templates_by_index[i % len(templates_by_index)]
            template = group[i % len(group)]
            reason = template.format(
                name=name, base=base, depth=depth,
                eye_color=eye_name,
            )
            if hedge:
                reason = reason.replace("complements", "may complement")
                reason = reason.replace("brightens", "may brighten")

        enriched.append({"hex": color["hex"], "name": name, "reason": reason})

    return enriched


# --- F. SUMMARY ---

def _build_summary(depth: str, undertone: str, lean: str, contrast: str,
                   eye_name: str, hair_name: str, hair_plausible: bool,
                   photo_quality_label: str) -> str:
    undertone_desc = {
        "warm": "warm, golden",
        "cool": "cool, rosy",
        "neutral": "balanced",
    }
    ut_text = undertone_desc.get(undertone, undertone)
    if undertone == "neutral" and lean and lean != "balanced":
        ut_text = f"balanced ({lean})"

    hedged = photo_quality_label == "Retake" or (undertone == "neutral" and lean == "balanced")
    verb = "appears to have" if hedged else "have"

    parts = [f"You {verb} a {depth} complexion with {ut_text} undertones"]
    eye_part = f"{eye_name.lower()} eyes"
    if hair_plausible and hair_name:
        parts.append(f"{eye_part} and {hair_name.lower()} hair")
    else:
        parts.append(eye_part)

    contrast_desc = {
        "high": "The strong contrast between your skin and features means you can carry bold colour pairings.",
        "medium": "Your moderate contrast gives you flexibility with both tonal and contrasting outfits.",
        "low": "Your soft contrast suits tonal, harmonious colour combinations.",
    }
    return f"{parts[0]}, {parts[1]}. {contrast_desc.get(contrast, '')}"


# --- MAIN ENTRY ---

def analyze(youcam_result: dict) -> dict:
    skin_hex = youcam_result.get("skin_color") or "#C8A283"
    eye_hex = youcam_result.get("eye_color") or "#6B4226"
    eye_name = youcam_result.get("eye_color_name") or "Brown"
    lip_hex = youcam_result.get("lip_color") or "#B5656B"
    brow_hex = youcam_result.get("eyebrow_color") or "#5C4033"
    hair_hex = youcam_result.get("hair_color") or "#3B2F2F"
    hair_name = youcam_result.get("hair_color_name") or "Brown"

    skin_lab = hex_to_lab(skin_hex)
    lip_lab = hex_to_lab(lip_hex)
    hair_lab = hex_to_lab(hair_hex)
    brow_lab = hex_to_lab(brow_hex)
    eye_lab = hex_to_lab(eye_hex)

    depth = compute_depth(skin_lab[0])
    ut = compute_undertone(skin_lab, lip_lab, hair_lab)
    contrast = compute_contrast(skin_lab[0], brow_lab, eye_lab, hair_lab)
    hair_plausible = _hair_is_plausible(hair_lab)
    family = get_palette_family(ut["undertone"], depth, skin_lab[0])
    pq = compute_photo_quality(skin_lab, hair_lab, eye_lab, brow_lab)

    palettes = _load_palettes()
    family_data = palettes.get(family, palettes.get("neutral-soft", {}))

    detected = {
        "skin_hex": skin_hex,
        "eye_hex": eye_hex,
        "eye_color_name": eye_name,
        "lip_hex": lip_hex,
        "eyebrow_hex": brow_hex,
        "hair_hex": hair_hex,
        "hair_color_name": hair_name,
        "undertone": ut["undertone"],
        "lean": ut["lean"],
        "depth": depth,
        "hair_plausible": hair_plausible,
    }

    heroes = generate_explanations(detected, family, family_data.get("heroes", []))
    neutrals = [{"hex": c["hex"], "name": c["name"]} for c in family_data.get("neutrals", [])]
    care = [{"hex": c["hex"], "name": c["name"], "reason": c.get("reason_template", "")} for c in family_data.get("care_colors", [])]

    summary = _build_summary(
        depth, ut["undertone"], ut["lean"], contrast["band"],
        eye_name, hair_name, hair_plausible, pq["label"],
    )

    undertone_label = ut["undertone"].capitalize()
    if ut["undertone"] == "neutral" and ut["lean"]:
        undertone_label = f"Neutral, {ut['lean']}"

    return {
        "profile": {
            "skin_color": skin_hex,
            "eye_color": eye_hex,
            "eye_color_name": eye_name,
            "lip_color": lip_hex,
            "eyebrow_color": brow_hex,
            "hair_color": hair_hex,
            "hair_color_name": hair_name,
            "depth": depth.capitalize(),
            "undertone": undertone_label,
            "undertone_raw": ut["undertone"],
            "lean": ut["lean"],
            "spectrum_position": ut["spectrum_position"],
            "raw_hue": ut["raw_hue"],
            "contrast": contrast["band"].capitalize(),
            "contrast_diff": contrast["diff"],
            "hair_included_in_contrast": contrast["hair_included"],
            "photo_quality": pq,
            "palette_family": family,
            "summary": summary,
        },
        "palette": {
            "family": family,
            "hero_colors": [{"hex": c["hex"], "name": c["name"], "reason": c.get("reason")} for c in heroes],
            "neutral_colors": [{"hex": c["hex"], "name": c["name"]} for c in neutrals],
            "care_colors": care,
        },
    }
