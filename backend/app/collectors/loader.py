# loader.py
from pathlib import Path
from sqlalchemy.orm import Session
from app.collectors.normalizers import normalize_file
from app.schemas import NormalizedListing
from app.service import item_listing  


DATA_DIR = Path(__file__).parent.parent.parent / "data" / "sample_products" 

def load_normalized_listings(data_dir: Path) -> list[NormalizedListing]:
    listings = []
    for file_path in sorted(data_dir.glob("*.json")):
        try:
            listings.append(normalize_file(file_path))
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")  # don't crash on one bad file
    return listings



def load_all(db: Session) -> dict:          # ← NEW function for refresh
    processed = 0
    price_changes = 0

    # print(f"Looking for JSON files in: {DATA_DIR}")        # ← add this
    print(f"Files found: {list(DATA_DIR.glob('*.json'))}") 
    for file_path in sorted(DATA_DIR.glob("*.json")):
        try:
            normalized = normalize_file(file_path)
            changed = item_listing(db, normalized)  # saves to DB, returns True/False
            processed += 1
            if changed:
                price_changes += 1
        except Exception as e:
            print(f"Skipping {file_path.name}: {e}")

    return {"processed": processed, "price_changes": price_changes}