from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.collectors.loader import load_all

router = APIRouter()

@router.post("/refresh")
def refresh(db: Session = Depends(get_db)):
    results = load_all(db)
    return {
        "status": "ok",
        "processed": results["processed"],
        "price_changes": results["price_changes"],
        "changes": results["changes"] 
    }