from sqlalchemy.orm import Session
from datetime import datetime, UTC

from app.db.models import Product, Listing, PriceHistory
from app.collectors.normalizers import generate_normalized_key


def item_listing(db: Session, data)-> bool:

    price_changed = False
    change_detail = None

    normalized_key = generate_normalized_key(
        data.brand,
        data.title,
        data.category
        
    )

    # 🔹 Product
    product = db.query(Product).filter_by(
        normalized_key=normalized_key
    ).first()

    if not product:
        product = Product(
            normalized_key=normalized_key,
            title=data.title,
            brand=data.brand,
            brand_id=data.brand_id,
            category=data.category,
            image_url=data.image_url
        )
        db.add(product)
        db.flush()

    # 🔹 Listing
    listing = db.query(Listing).filter_by(
        source=data.source,
        source_product_id=data.source_product_id
    ).first()

    if not listing:
        listing = Listing(
            product_id=product.id,
            source=data.source,
            source_product_id=data.source_product_id,
            listing_url=data.listing_url,
            current_price=data.price,
            currency=data.currency
        )
        db.add(listing)

        db.add(PriceHistory(
            listing=listing,
            old_price=None,
            new_price=data.price
        ))

    else:
        if listing.current_price != data.price:
            db.add(PriceHistory(
                listing=listing,
                old_price=listing.current_price,
                new_price=data.price
            ))
            change_detail = {                    # ← build detail
                "title": data.title,
                "source": data.source,
                "listing_url": data.listing_url,
                "old_price": listing.current_price,
                "new_price": data.price,
                "change_pct": round(((data.price - listing.current_price) / listing.current_price) * 100, 2)
            }
            listing.current_price = data.price
            listing.last_seen_at = datetime.now(UTC)
            price_changed = True

    db.commit() 
    return {"changed": price_changed, "detail": change_detail}  # ← return dict