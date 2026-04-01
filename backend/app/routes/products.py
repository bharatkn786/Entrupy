from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Product, Listing, PriceHistory

router = APIRouter()

# List all products with filters
@router.get("/products")
def get_products(
    db: Session = Depends(get_db),
    source: str = Query(None),          # filter by source e.g. grailed
    category: str = Query(None),        # filter by category
    min_price: float = Query(None),     # filter by price range
    max_price: float = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0)
):
    query = db.query(Product)

    if category:
        query = query.filter(Product.category == category)

    products = query.offset(offset).limit(limit).all()

    result = []
    for p in products:
        listings = db.query(Listing).filter_by(product_id=p.id)

        if source:
            listings = listings.filter(Listing.source == source)
        if min_price:
            listings = listings.filter(Listing.current_price >= min_price)
        if max_price:
            listings = listings.filter(Listing.current_price <= max_price)

        listings = listings.all()
        if not listings:
            continue

        result.append({
            "id": p.id,
            "title": p.title,
            "brand": p.brand,
            "category": p.category,
            "image_url": p.image_url,
            "listings": [
                {
                    "source": l.source,
                    "current_price": l.current_price,
                    "currency": l.currency,
                    "listing_url": l.listing_url
                }
                for l in listings
            ]
        })

    return result


# Single product detail
@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter_by(id=product_id).first()

    if not product:
        return {"error": "Product not found"}, 404

    listings = db.query(Listing).filter_by(product_id=product_id).all()

    return {
        "id": product.id,
        "title": product.title,
        "brand": product.brand,
        "category": product.category,
        "image_url": product.image_url,
        "listings": [
            {
                "id": l.id,
                "source": l.source,
                "current_price": l.current_price,
                "currency": l.currency,
                "listing_url": l.listing_url
            }
            for l in listings
        ]
    }


# Price history for a product
@router.get("/products/{product_id}/price-history")
def get_price_history(product_id: int, db: Session = Depends(get_db)):
    listings = db.query(Listing).filter_by(product_id=product_id).all()
    listing_ids = [l.id for l in listings]

    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.listing_id.in_(listing_ids))
        .order_by(PriceHistory.observed_at.desc())
        .all()
    )

    return [
        {
            "listing_id": h.listing_id,
            "old_price": h.old_price,
            "new_price": h.new_price,
            "observed_at": h.observed_at
        }
        for h in history
    ]