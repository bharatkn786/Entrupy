from pathlib import Path
from app.db.database import SessionLocal, engine
from app.db.models import Base
from app.db import models   # ✅ ADD THIS
from app.collectors.loader import load_normalized_listings
from app.service import item_listing
from fastapi import FastAPI
from app.routes import refresh, products, price_changes, analytics,auth
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev (later restrict)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(refresh.router, prefix="/api")

app.include_router(products.router, prefix="/api")
app.include_router(price_changes.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(auth.router,prefix="/api")

@app.on_event("startup")
def startup_event():
    print("Starting server...")
    run()


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