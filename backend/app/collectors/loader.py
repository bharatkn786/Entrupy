# loader.py
from pathlib import Path
from sqlalchemy.orm import Session
from app.collectors.normalizers import normalize_file
from app.schemas import NormalizedListing



DATA_DIR = Path(__file__).parent.parent.parent / "data" / "sample_products" 

def load_normalized_listings(data_dir: Path) -> list[NormalizedListing]:
    listings = []
    for file_path in sorted(data_dir.glob("*.json")):
        try:
            listings.append(normalize_file(file_path))
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")  # don't crash on one bad file
    return listings


def load_all(db: Session) -> dict:
    from app.service import item_listing  
    processed = 0
    price_changes = 0
    changes = []

    for file_path in sorted(DATA_DIR.glob("*.json")):
        try:
            normalized = normalize_file(file_path)
            result = item_listing(db, normalized)  # ← ONE call, store in result
            processed += 1

            if result["changed"]:                  # ← use result directly
                price_changes += 1
                changes.append(result["detail"])

        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")

    return {
        "processed": processed,
        "price_changes": price_changes,
        "changes": changes
    }