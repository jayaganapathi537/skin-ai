"""Build the garment catalogue from seed + images.

For every image in backend/data/garments/ that matches a seed entry:
  - Measure dominant colour from central 60%, ignoring background pixels
  - Flag deltaE > 12 as CHECK
  - Save 1200px-long-side JPG (tryon/) and 600px thumbnail (thumbs/)
  - Write catalogue.json

Usage:
    cd backend && python -m scripts.build_catalogue
  or:
    python scripts/build_catalogue.py
"""
import json
import math
import os
import sys

from pathlib import Path

# Allow running from repo root or backend/
REPO = Path(__file__).resolve().parent.parent
BACKEND = REPO / "backend"
if not BACKEND.exists():
    BACKEND = REPO
DATA = BACKEND / "data"
GARMENTS_DIR = DATA / "garments"
SEED_PATH = GARMENTS_DIR / "catalogue.seed.json"
CATALOGUE_OUT = DATA / "catalog.json"
TRYON_DIR = GARMENTS_DIR / "tryon"
THUMBS_DIR = GARMENTS_DIR / "thumbs"

sys.path.insert(0, str(BACKEND))

from PIL import Image
import numpy as np
from colorspacious import cspace_convert


def hex_to_lab(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return cspace_convert([r / 255, g / 255, b / 255], "sRGB1", "CIELab")


def rgb_to_lab(rgb_arr):
    return cspace_convert(rgb_arr / 255.0, "sRGB1", "CIELab")


def lab_to_hex(lab):
    rgb = cspace_convert(lab, "CIELab", "sRGB1")
    rgb = np.clip(rgb, 0, 1)
    return "#{:02X}{:02X}{:02X}".format(
        int(round(rgb[0] * 255)),
        int(round(rgb[1] * 255)),
        int(round(rgb[2] * 255)),
    )


def ciede2000(lab1, lab2):
    """CIEDE2000 between two Lab tuples/arrays."""
    L1, a1, b1 = float(lab1[0]), float(lab1[1]), float(lab1[2])
    L2, a2, b2 = float(lab2[0]), float(lab2[1]), float(lab2[2])

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
    T = (1
         - 0.17 * math.cos(math.radians(hp_avg - 30))
         + 0.24 * math.cos(math.radians(2 * hp_avg))
         + 0.32 * math.cos(math.radians(3 * hp_avg + 6))
         - 0.20 * math.cos(math.radians(4 * hp_avg - 63)))
    SL = 1 + 0.015 * (Lp_avg - 50)**2 / math.sqrt(20 + (Lp_avg - 50)**2)
    SC = 1 + 0.045 * Cp_avg
    SH = 1 + 0.015 * Cp_avg * T
    Cp_avg7 = Cp_avg**7
    RT = (-2 * math.sqrt(Cp_avg7 / (Cp_avg7 + 25**7))
          * math.sin(math.radians(60 * math.exp(-((hp_avg - 275) / 25)**2))))
    dE = math.sqrt((dLp / SL)**2 + (dCp / SC)**2 + (dHp / SH)**2
                    + RT * (dCp / SC) * (dHp / SH))
    return dE


def find_image(garments_dir, file_stem):
    for ext in (".jpg", ".jpeg", ".png", ".webp"):
        p = garments_dir / (file_stem + ext)
        if p.exists():
            return p
    return None


def measure_dominant(img):
    """Median colour of the central 60%, ignoring near-white/near-grey background."""
    w, h = img.size
    x0, y0 = int(w * 0.2), int(h * 0.2)
    x1, y1 = int(w * 0.8), int(h * 0.8)
    crop = img.crop((x0, y0, x1, y1)).convert("RGB")
    pixels = np.array(crop).reshape(-1, 3).astype(np.float64)

    lab = rgb_to_lab(pixels)
    L, a, b = lab[:, 0], lab[:, 1], lab[:, 2]
    chroma = np.sqrt(a**2 + b**2)

    mask = ~((chroma < 8) & (L > 75))
    if mask.sum() < 10:
        mask = np.ones(len(pixels), dtype=bool)

    filtered = pixels[mask]
    median_rgb = np.median(filtered, axis=0)
    median_lab = rgb_to_lab(median_rgb.reshape(1, 3))[0]
    hex_val = lab_to_hex(median_lab)

    bg_ratio = (~mask).sum() / len(pixels)
    cluttered = bg_ratio < 0.02 and len(pixels) > 100

    return hex_val, median_lab, cluttered


def resize_long_side(img, target):
    w, h = img.size
    if max(w, h) <= target:
        return img.copy()
    if w >= h:
        new_w = target
        new_h = int(round(h * target / w))
    else:
        new_h = target
        new_w = int(round(w * target / h))
    return img.resize((new_w, new_h), Image.LANCZOS)


def main():
    with open(SEED_PATH) as f:
        seed = json.load(f)

    TRYON_DIR.mkdir(parents=True, exist_ok=True)
    THUMBS_DIR.mkdir(parents=True, exist_ok=True)

    catalogue = []
    table_rows = []
    warnings = []
    next_id = 1

    for entry in seed:
        file_stem = entry["file"]
        img_path = find_image(GARMENTS_DIR, file_stem)

        if img_path is None:
            print(f"  SKIP  {file_stem:<28} (no image)")
            continue

        img = Image.open(img_path).convert("RGB")
        measured_hex, measured_lab, cluttered = measure_dominant(img)
        target_lab = hex_to_lab(entry["target_hex"])
        de = ciede2000(measured_lab, target_lab)

        flag = ""
        if de > 12:
            flag = "CHECK"
            warnings.append(f"{file_stem}: deltaE {de:.1f} > 12 vs target {entry['target_hex']}")
        if cluttered:
            flag = (flag + " CLUTTERED").strip()
            warnings.append(f"{file_stem}: background looks cluttered")

        table_rows.append((file_stem, measured_hex, entry["target_hex"], f"{de:.1f}", flag))

        dominant = entry.get("override_hex", measured_hex)

        tryon_img = resize_long_side(img, 1200)
        tryon_name = file_stem + ".jpg"
        tryon_img.save(TRYON_DIR / tryon_name, "JPEG", quality=85)

        thumb_img = resize_long_side(img, 600)
        thumb_name = file_stem + ".jpg"
        thumb_img.save(THUMBS_DIR / thumb_name, "JPEG", quality=85)

        catalogue.append({
            "id": next_id,
            "name": entry["name"],
            "category": entry["category"].capitalize(),
            "dominant_hex": dominant,
            "image": f"/images/garments/thumbs/{thumb_name}",
            "tryon_image": f"/images/garments/tryon/{tryon_name}",
            "price": entry["price"],
            "tags": [entry.get("group", "A").lower()],
        })
        next_id += 1

    # Print table
    print()
    print(f"{'File':<28} {'Measured':<10} {'Target':<10} {'dE':>6}  Flag")
    print("-" * 72)
    for row in table_rows:
        print(f"{row[0]:<28} {row[1]:<10} {row[2]:<10} {row[3]:>6}  {row[4]}")

    if warnings:
        print()
        print("WARNINGS:")
        for w in warnings:
            print(f"  ! {w}")

    with open(CATALOGUE_OUT, "w") as f:
        json.dump(catalogue, f, indent=2)

    print()
    print(f"Wrote {len(catalogue)} items to {CATALOGUE_OUT.relative_to(REPO)}")
    print(f"Tryon images: {TRYON_DIR.relative_to(REPO)}/")
    print(f"Thumbnails:   {THUMBS_DIR.relative_to(REPO)}/")

    if not catalogue:
        print()
        print("No images found yet. Place garment photos in")
        print(f"  {GARMENTS_DIR}/")
        print("named to match the 'file' field in catalogue.seed.json (e.g. top-coral-01.jpg)")


if __name__ == "__main__":
    main()
