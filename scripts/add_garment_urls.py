#!/usr/bin/env python3
"""Add external_url fields to catalog.json for YouCam try-on API."""
import json
import os

# Map garment IDs to appropriate Unsplash clothing images
# These are high-quality fashion photos suitable for virtual try-on
GARMENT_URLS = {
    1: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800",  # Coral blouse
    2: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800",  # Navy blazer
    3: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800",  # Emerald dress
    4: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",  # Mustard sweater
    5: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",  # Lavender shirt
    6: "https://images.unsplash.com/photo-1544923408-75c5cef46f14?w=800",  # Burgundy jacket
    7: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800",  # Sage skirt
    8: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800",  # Terracotta dress
    9: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",  # Cobalt tee
    10: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?w=800",  # Dusty rose cardigan
    11: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800",  # Charcoal trousers
    12: "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800",  # Honey gold blouse
    13: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800",  # Ruby dress
    14: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800",  # Teal bomber
    15: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800",  # Taupe pants
    16: "https://images.unsplash.com/photo-1618932260643-eee4a2f652a6?w=800",  # Purple top
    17: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800",  # Rust jacket
    18: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",  # Blush dress
    19: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=800",  # Forest green polo
    20: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800",  # Wine skirt
    21: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800",  # Peach tee
    22: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800",  # Midnight overcoat
    23: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800",  # Powder blue dress
    24: "https://images.unsplash.com/photo-1583744999762-2f259e73ecfd?w=800",  # Saffron camisole
}

def main():
    catalog_path = os.path.join(
        os.path.dirname(__file__), "..", "backend", "data", "catalog.json"
    )

    with open(catalog_path, "r") as f:
        catalog = json.load(f)

    # Add external_url to each item
    for item in catalog:
        item_id = item["id"]
        item["external_url"] = GARMENT_URLS.get(item_id, GARMENT_URLS[1])

    # Write back
    with open(catalog_path, "w") as f:
        json.dump(catalog, f, indent=2)

    print(f"✓ Added external_url to {len(catalog)} items")

if __name__ == "__main__":
    main()
