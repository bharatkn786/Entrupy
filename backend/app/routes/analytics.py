from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Product, Listing, PriceHistory

router = APIRouter()

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):

    # Total products per source
    by_source = (
        db.query(Listing.source, func.count(Listing.id))
        .group_by(Listing.source)
        .all()
    )

    # Average price per category
    by_category = (
        db.query(Product.category, func.avg(Listing.current_price))
        .join(Listing, Listing.product_id == Product.id)
        .group_by(Product.category)
        .all()
    )

    # Total price changes detected
    total_changes = (
        db.query(func.count(PriceHistory.id))
        .filter(PriceHistory.old_price != None)
        .scalar()
    )

    return {
        "by_source": [{"source": s, "total_listings": c} for s, c in by_source],
        "by_category": [{"category": c, "avg_price": round(a, 2)} for c, a in by_category],
        "total_price_changes_detected": total_changes
    }