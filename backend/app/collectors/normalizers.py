# normalizers.py
import json
from pathlib import Path
from app.schemas import NormalizedListing

def normalize_file(file_path: Path) -> NormalizedListing:
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    
    # source = first part of filename: "grailed_xxx.json" → "grailed"
    source = file_path.name.split("_")[0].lower()

#  get image_url: top-level for grailed/fashionphile, first main_image for 1stdibs
    image_url = payload.get("image_url")
    if not image_url:
        images = payload.get("main_images", [])
        if images:
            image_url = images[0].get("url")

    return NormalizedListing(
        source=source,
        source_product_id=str(payload.get("product_id", "")),
        title=str(payload.get("model") or payload.get("title") or "Unknown"),
        brand=str(payload.get("brand") or payload.get("brand_id") or "Unknown").lower(),
        category=payload.get("metadata", {}).get("garment_type") or payload.get("category"),
        price=float(payload.get("price") or 0.0),
        currency=payload.get("currency", "USD"),
        listing_url=payload.get("product_url"),
        image_url=image_url,
        metadata=payload.get("metadata") or {},
        condition = (
        payload.get("condition")                          # fashionphile: top-level
        or payload.get("metadata", {}).get("condition_display")  # 1stdibs: in metadata
        or payload.get("metadata", {}).get("condition")   # grailed: not present, returns None
        ),
    )


import re

def generate_normalized_key(brand: str, title: str, category: str | None = None):
    text = f"{brand} {category or ''} {title}".lower()

    # remove special chars
    text = re.sub(r"[^a-z0-9\s]", "", text)

    # normalize spaces
    text = " ".join(text.split())

    return text