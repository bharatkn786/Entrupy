from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.database import get_db
from app.db.models import PriceHistory, Listing, Product

router = APIRouter()

@router.get("/price-changes")
def get_price_changes(
    db: Session = Depends(get_db),
    since: datetime = Query(None),    # optional filter by time
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    query = (
        db.query(PriceHistory)
        .filter(PriceHistory.old_price != None)  # skip first-time inserts
    )

    if since:
        query = query.filter(PriceHistory.observed_at > since)

    events = query.order_by(PriceHistory.observed_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "listing_id": e.listing_id,
            "old_price": e.old_price,
            "new_price": e.new_price,
            "changed_at": e.observed_at,
            "change_pct": round(((e.new_price - e.old_price) / e.old_price) * 100, 2)
        }
        for e in events
    ]