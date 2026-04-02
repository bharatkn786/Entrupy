
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db.models import Product, Listing, PriceHistory
from app.auth import get_api_key

router = APIRouter()


@router.get("/products")
def get_products(
    db: Session = Depends(get_db),
    source: str = Query(None),
    category: str = Query(None),
    min_price: float = Query(None),
    max_price: float = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    api_key=Depends(get_api_key),
):
    # Build a single joined query so filters and pagination work together
    query = (
        db.query(Product)
        .join(Listing, Listing.product_id == Product.id)
        .options(joinedload(Product.listings))
    )

    if category:
        query = query.filter(Product.category == category)
    if source:
        query = query.filter(Listing.source == source)
    if min_price is not None:
        query = query.filter(Listing.current_price >= min_price)
    if max_price is not None:
        query = query.filter(Listing.current_price <= max_price)

    # Deduplicate after join, then paginate
    products = query.distinct().offset(offset).limit(limit).all()

    result = []
    for p in products:
        # Filter the already-loaded listings to match requested source/price
        listings = p.listings
        if source:
            listings = [l for l in listings if l.source == source]
        if min_price is not None:
            listings = [l for l in listings if l.current_price >= min_price]
        if max_price is not None:
            listings = [l for l in listings if l.current_price <= max_price]

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
                    "listing_url": l.listing_url,
                }
                for l in listings
            ],
        })

    return result


@router.get("/products/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.listings))
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

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
                "listing_url": l.listing_url,
            }
            for l in product.listings
        ],
    }


@router.get("/products/{product_id}/price-history")
def get_price_history(
    product_id: int,
    db: Session = Depends(get_db),
    api_key=Depends(get_api_key),
):
    # Verify product exists first
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

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
            "observed_at": h.observed_at,
        }
        for h in history
    ]