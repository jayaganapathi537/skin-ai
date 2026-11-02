import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.engine import (
    hex_to_lab, _hue_angle, compute_depth, compute_undertone,
    get_palette_family, compute_contrast, compute_photo_quality,
    match_garment, analyze, _hair_is_plausible,
)
from app import engine_config as cfg


# --- A. UNDERTONE THRESHOLDS ---

def test_warm_undertone():
    # Skin with hue > 60 should be warm
    lab = (65.0, 10.0, 25.0)  # hue ≈ 68°
    ut = compute_undertone(lab)
    assert ut["undertone"] == "warm", f"Expected warm, got {ut}"
    assert ut["lean"] is None
    assert ut["clarity"] is not None

def test_cool_undertone():
    # Skin with hue < 50 should be cool
    lab = (65.0, 15.0, 5.0)  # hue ≈ 18°
    ut = compute_undertone(lab)
    assert ut["undertone"] == "cool", f"Expected cool, got {ut}"
    assert ut["lean"] is None

def test_neutral_balanced():
    # Skin with hue between 53 and 57 → neutral balanced
    lab = (65.0, 10.0, 14.0)  # hue ≈ 54.5°
    ut = compute_undertone(lab)
    assert ut["undertone"] == "neutral", f"Expected neutral, got {ut}"
    assert ut["lean"] == "balanced", f"Expected balanced, got {ut['lean']}"
    assert ut["clarity"] is None

def test_neutral_leaning_warm():
    # Skin with hue >= 57 but < 60 → neutral, leaning warm
    lab = (65.0, 10.0, 16.0)  # hue ≈ 58°
    ut = compute_undertone(lab)
    assert ut["undertone"] == "neutral", f"Expected neutral, got {ut}"
    assert ut["lean"] == "leaning warm", f"Expected leaning warm, got {ut['lean']}"

def test_neutral_leaning_cool():
    # Skin with hue <= 53 but >= 50 → neutral, leaning cool
    lab = (65.0, 12.0, 14.0)  # hue ≈ 49.4° — wait, that's < 50, that's cool
    # Try hue ≈ 52°
    lab = (65.0, 10.0, 12.7)  # hue ≈ 51.8°
    ut = compute_undertone(lab)
    assert ut["undertone"] == "neutral", f"Expected neutral, got {ut}"
    assert ut["lean"] == "leaning cool", f"Expected leaning cool, got {ut['lean']}"

def test_spectrum_position_bounds():
    # hue=40 → 0, hue=75 → 1
    lab_cold = (65.0, 20.0, 0.1)  # hue near 0 → position 0
    ut = compute_undertone(lab_cold)
    assert ut["spectrum_position"] == 0.0

    lab_warm = (65.0, 1.0, 30.0)  # hue near 88° → position clamped to 1
    ut = compute_undertone(lab_warm)
    assert ut["spectrum_position"] == 1.0


# --- B. DEPTH THRESHOLDS ---

def test_depth_light():
    assert compute_depth(70.0) == "light"
    assert compute_depth(62.0) == "light"

def test_depth_medium():
    assert compute_depth(61.0) == "medium"
    assert compute_depth(45.0) == "medium"

def test_depth_deep():
    assert compute_depth(44.0) == "deep"
    assert compute_depth(20.0) == "deep"


# --- B. FAMILY MAPPING (all six reachable) ---

def test_family_warm_light():
    assert get_palette_family("warm", "light", 70.0) == "warm-light"

def test_family_warm_deep():
    assert get_palette_family("warm", "deep", 40.0) == "warm-deep"

def test_family_warm_medium_splits():
    assert get_palette_family("warm", "medium", 55.0) == "warm-light"
    assert get_palette_family("warm", "medium", 48.0) == "warm-deep"

def test_family_cool_light():
    assert get_palette_family("cool", "light", 70.0) == "cool-light"

def test_family_cool_deep():
    assert get_palette_family("cool", "deep", 40.0) == "cool-deep"

def test_family_cool_medium_splits():
    assert get_palette_family("cool", "medium", 55.0) == "cool-light"
    assert get_palette_family("cool", "medium", 48.0) == "cool-deep"

def test_family_neutral_soft():
    assert get_palette_family("neutral", "light", 70.0) == "neutral-soft"

def test_family_neutral_rich():
    assert get_palette_family("neutral", "deep", 40.0) == "neutral-rich"

def test_family_neutral_medium_splits():
    assert get_palette_family("neutral", "medium", 55.0) == "neutral-soft"
    assert get_palette_family("neutral", "medium", 48.0) == "neutral-rich"

def test_all_six_families_reachable():
    families = set()
    for ut in ("warm", "cool", "neutral"):
        for depth, L in [("light", 70), ("deep", 40), ("medium", 55), ("medium", 48)]:
            families.add(get_palette_family(ut, depth, L))
    assert len(families) == 6, f"Only {len(families)} families reachable: {families}"


# --- B. CONTRAST ---

def test_contrast_high():
    skin_L = 75.0
    brow = (30.0, 5.0, 5.0)
    eye = (25.0, 3.0, 3.0)
    hair = (20.0, 5.0, 10.0)  # plausible
    c = compute_contrast(skin_L, brow, eye, hair)
    assert c["band"] == "high"

def test_contrast_low():
    skin_L = 50.0
    brow = (45.0, 5.0, 5.0)
    eye = (48.0, 3.0, 3.0)
    hair = (47.0, 5.0, 10.0)
    c = compute_contrast(skin_L, brow, eye, hair)
    assert c["band"] == "low"

def test_contrast_excludes_implausible_hair():
    skin_L = 60.0
    brow = (55.0, 5.0, 5.0)
    eye = (50.0, 3.0, 3.0)
    hair = (95.0, 0.0, 0.0)  # implausible: L* > 90
    c = compute_contrast(skin_L, brow, eye, hair)
    assert c["hair_included"] is False


# --- D. GARMENT RANKING BANDS ---

def test_garment_great():
    palette = {"hero_colors": [{"hex": "#FF7F50"}], "neutral_colors": [], "care_colors": []}
    result = match_garment("#FF7F50", palette)  # identical colour
    assert result["band"] == "Great"
    assert result["delta_e"] < cfg.GREAT_MAX_DELTA_E

def test_garment_hidden():
    palette = {"hero_colors": [{"hex": "#FF0000"}], "neutral_colors": [], "care_colors": []}
    result = match_garment("#00FF00", palette)  # very different
    assert result["band"] in ("Okay", "Hidden")

def test_garment_care_cap():
    palette = {
        "hero_colors": [{"hex": "#CC4444"}],
        "neutral_colors": [],
        "care_colors": [{"hex": "#CC4440"}],
    }
    result = match_garment("#CC4442", palette)
    assert result["near_face_warning"] is True
    assert result["band"] == "Okay"


# --- C. PHOTO QUALITY ---

def test_photo_quality_good():
    skin = (65.0, 15.0, 18.0)
    hair = (30.0, 5.0, 10.0)
    eye = (40.0, 5.0, 5.0)
    brow = (35.0, 3.0, 3.0)
    pq = compute_photo_quality(skin, hair, eye, brow)
    assert pq["label"] == "Good"
    assert pq["score"] >= 0.8

def test_photo_quality_bad_skin_L():
    skin = (95.0, 15.0, 18.0)  # L* outside 20-90
    hair = (30.0, 5.0, 10.0)
    eye = (40.0, 5.0, 5.0)
    brow = (35.0, 3.0, 3.0)
    pq = compute_photo_quality(skin, hair, eye, brow)
    assert pq["score"] < 1.0
    assert any("brightness" in r.lower() for r in pq["reasons"])

def test_photo_quality_retake():
    skin = (95.0, 2.0, 2.0)  # bad L* and bad chroma
    hair = (95.0, 0.0, 0.0)  # bad hair L*
    eye = (80.0, 0.0, 0.0)   # bad eye L*
    brow = (96.0, 0.0, 0.0)  # lighter than skin
    pq = compute_photo_quality(skin, hair, eye, brow)
    assert pq["suggest_retake"] is True
    assert pq["label"] == "Retake"


# --- G.18 FULL ANALYZE ---

def test_analyze_returns_required_fields():
    result = analyze({
        "skin_color": "#9e775c",
        "eye_color": "#442b27",
        "eye_color_name": "Brown",
        "lip_color": "#ab7d75",
        "eyebrow_color": "#5b575a",
        "hair_color": "#722626",
        "hair_color_name": "Red",
    })
    p = result["profile"]
    assert "spectrum_position" in p
    assert "lean" in p
    assert "photo_quality" in p
    assert p["photo_quality"]["label"] in ("Good", "Fair", "Retake")
    assert "hero_colors" in result["palette"]
    assert "care_colors" in result["palette"]

def test_analyze_empty_hair():
    result = analyze({
        "skin_color": "#9e775c",
        "eye_color": "#442b27",
        "eye_color_name": "Brown",
        "lip_color": "#ab7d75",
        "eyebrow_color": "#5b575a",
        "hair_color": "",
        "hair_color_name": "",
    })
    assert result["profile"]["depth"] in ("Light", "Medium", "Deep")


if __name__ == "__main__":
    import traceback
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for t in tests:
        try:
            t()
            passed += 1
            print(f"  PASS  {t.__name__}")
        except Exception as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {e}")
            traceback.print_exc()
    print(f"\n{passed} passed, {failed} failed out of {len(tests)}")
