"""Check catalogue coverage across all six palette families.

For each family, report Great / Good / Okay garment counts.
Warn if any family has fewer than 3 Great matches, listing
the hero colours that no garment covers yet.

Usage:
    python scripts/check_catalogue.py
"""
import json
import math
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BACKEND = REPO / "backend"
if not BACKEND.exists():
    BACKEND = REPO
DATA = BACKEND / "data"

sys.path.insert(0, str(BACKEND))
from app.engine import match_garment, hex_to_lab, _ciede2000
from app import engine_config as cfg

PALETTES_PATH = DATA / "palettes.json"
CATALOGUE_PATH = DATA / "catalogue.json"
SEED_PATH = DATA / "garments" / "catalogue.seed.json"

FAMILIES = [
    "warm-light", "warm-deep",
    "cool-light", "cool-deep",
    "neutral-soft", "neutral-rich",
]


def load_palettes():
    with open(PALETTES_PATH) as f:
        return json.load(f)


def load_catalogue():
    if CATALOGUE_PATH.exists():
        with open(CATALOGUE_PATH) as f:
            items = json.load(f)
        if items:
            return items
    # Fall back to seed target hexes if no images processed yet
    with open(SEED_PATH) as f:
        seed = json.load(f)
    return [{"dominant_hex": e["target_hex"], "name": e["name"]} for e in seed]


def main():
    palettes = load_palettes()
    catalogue = load_catalogue()
    source = "catalogue.json" if CATALOGUE_PATH.exists() and json.loads(CATALOGUE_PATH.read_text()) else "seed targets"

    print(f"Checking {len(catalogue)} garments against 6 families (source: {source})")
    print()

    any_warning = False

    for family in FAMILIES:
        fam = palettes[family]
        palette = {
            "hero_colors": fam["heroes"],
            "neutral_colors": fam["neutrals"],
            "care_colors": fam.get("care_colors", []),
        }

        great, good, okay, hidden = [], [], [], []
        for g in catalogue:
            result = match_garment(g["dominant_hex"], palette)
            band = result["band"]
            entry = (g["name"], g["dominant_hex"], result["delta_e"])
            if band == "Great":
                great.append(entry)
            elif band == "Good":
                good.append(entry)
            elif band == "Okay":
                okay.append(entry)
            else:
                hidden.append(entry)

        print(f"=== {family} ===")
        print(f"  Great: {len(great):>2}   Good: {len(good):>2}   Okay: {len(okay):>2}   Hidden: {len(hidden):>2}")

        if great:
            for name, hex_val, de in great:
                print(f"    Great  {name:<28} {hex_val}  dE={de:.1f}")
        if good:
            for name, hex_val, de in good:
                print(f"    Good   {name:<28} {hex_val}  dE={de:.1f}")

        if len(great) < 3:
            any_warning = True
            print(f"  *** WARNING: only {len(great)} Great match(es) — need at least 3 ***")

            # Find which hero colours are NOT covered by any Great garment
            uncovered = []
            for hero in fam["heroes"]:
                hero_lab = hex_to_lab(hero["hex"])
                covered = False
                for _, ghex, _ in great:
                    g_lab = hex_to_lab(ghex)
                    if _ciede2000(hero_lab, g_lab) <= cfg.GREAT_MAX_DELTA_E:
                        covered = True
                        break
                if not covered:
                    uncovered.append(hero)
            if uncovered:
                names = ", ".join(f'{h["name"]} ({h["hex"]})' for h in uncovered)
                print(f"  Uncovered heroes: {names}")

        print()

    if not any_warning:
        print("All families have 3+ Great matches.")


if __name__ == "__main__":
    main()
