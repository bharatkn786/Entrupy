from pathlib import Path
from app.db.database import SessionLocal, engine
from app.db.models import Base
from app.db import models   # ✅ ADD THIS
from app.collectors.loader import load_normalized_listings
from app.service import item_listing


def run():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    data = load_normalized_listings(Path("data/sample_products"))

    print(f"Loaded {len(data)} items")   # debug

    for item in data:
        item_listing(db, item)

    db.close()


if __name__ == "__main__":
    run()