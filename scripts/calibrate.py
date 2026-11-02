#!/usr/bin/env python3
"""Run the colour engine on every fixture and print a calibration table."""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.engine import analyze, hex_to_lab, _hue_angle, _chroma

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "data", "fixtures")


def main():
    files = sorted(f for f in os.listdir(FIXTURES_DIR) if f.endswith(".json"))
    if not files:
        print("No fixture files found in", FIXTURES_DIR)
        return

    rows = []
    for fname in files:
        with open(os.path.join(FIXTURES_DIR, fname)) as f:
            fixture = json.load(f)

        # Build the YouCam-style input from fixture profile
        profile = fixture.get("profile", {})
        youcam_input = {
            "skin_color": profile.get("skin_color", ""),
            "eye_color": profile.get("eye_color", ""),
            "eye_color_name": profile.get("eye_color_name", ""),
            "lip_color": profile.get("lip_color", ""),
            "eyebrow_color": profile.get("eyebrow_color", ""),
            "hair_color": profile.get("hair_color", ""),
            "hair_color_name": profile.get("hair_color_name", ""),
        }

        result = analyze(youcam_input)
        p = result["profile"]
        skin_lab = hex_to_lab(youcam_input["skin_color"])
        skin_L = skin_lab[0]
        skin_hue = _hue_angle(skin_lab[1], skin_lab[2])

        rows.append({
            "file": fname,
            "persona": fixture.get("persona", "?"),
            "skin_hex": youcam_input["skin_color"],
            "L*": round(skin_L, 1),
            "hue": round(skin_hue, 1),
            "depth": p["depth"],
            "undertone": p["undertone"],
            "lean": p.get("lean", "-"),
            "family": p["palette_family"],
            "contrast": p["contrast"],
            "pq_score": p["photo_quality"]["score"],
            "pq_label": p["photo_quality"]["label"],
        })

    # Print table
    headers = ["file", "persona", "skin_hex", "L*", "hue", "depth", "undertone", "lean", "family", "contrast", "pq_score", "pq_label"]
    col_widths = {}
    for h in headers:
        col_widths[h] = max(len(h), max(len(str(r[h])) for r in rows))

    header_line = " | ".join(h.ljust(col_widths[h]) for h in headers)
    sep_line = "-+-".join("-" * col_widths[h] for h in headers)
    print(header_line)
    print(sep_line)
    for r in rows:
        print(" | ".join(str(r[h]).ljust(col_widths[h]) for h in headers))

    # Distribution summary
    print("\n--- Label distribution ---")
    from collections import Counter
    depth_dist = Counter(r["depth"] for r in rows)
    ut_dist = Counter(r["undertone"] for r in rows)
    family_dist = Counter(r["family"] for r in rows)

    print(f"Depth:     {dict(depth_dist)}")
    print(f"Undertone: {dict(ut_dist)}")
    print(f"Family:    {dict(family_dist)}")

    # Neutral majority warning
    total = len(rows)
    neutral_count = sum(1 for r in rows if "neutral" in r["undertone"].lower())
    neutral_pct = neutral_count / total * 100
    if neutral_pct > 50:
        print(f"\n⚠  WARNING: {neutral_pct:.0f}% of results are Neutral ({neutral_count}/{total}). Consider adjusting thresholds.")
    else:
        print(f"\n✓  Neutral rate: {neutral_pct:.0f}% ({neutral_count}/{total})")


if __name__ == "__main__":
    main()
