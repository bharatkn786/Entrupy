from datetime import datetime, UTC
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.orm import relationship
from .database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)

    # Because when you read each JSON file, you don’t know if product already exists.
    # So:

    # If normalized_key NOT in products → create product row
    # If normalized_key already exists → reuse that product row
    # Either way → insert listing row for that JSON file
    #     So we create normalized_key like:
    # "chanel|belts|chanel 5 rows belt" (brand + category + title)
    normalized_key = Column(String(255), unique=True, index=True)#it prevents duplicates
    title = Column(String(500))
    brand = Column(String(255))
    brand_id = Column(String(255), nullable=True)
    category = Column(String(255), nullable=True)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    listings = relationship("Listing", back_populates="product")




# Do you need the Listings table?
# Yes, and here's exactly why.
# Look at your data. You have three sources — Grailed, Fashionphile, 1stdibs. The assignment specifically says:

# "Think about what happens when the same product appears in multiple sources."

# This is the key hint. Without the Listings table, you cannot answer: "Show me all the places this Chanel belt is listed and at what price on each platform."
# Here's the concrete example from your data. A Chanel CC chain belt could appear on both 1stdibs at $7,550 and Fashionphile at $6,200.'

# That's one Product, two Listings, two different prices. If you collapse everything into one table, you either lose one price or duplicate all the product info.
class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), index=True)
    source = Column(String(50), index=True)
    source_product_id = Column(String(255), index=True)
    listing_url = Column(Text, nullable=True)
    current_price = Column(Float)
    currency = Column(String(10), default="USD")
    last_seen_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    product = relationship("Product", back_populates="listings")
    price_history = relationship("PriceHistory", back_populates="listing")

    __table_args__ = (
        Index("ix_listings_source_product", "source", "source_product_id"),
    )


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id"), index=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    old_price = Column(Float, nullable=True)
    new_price = Column(Float)

    listing = relationship("Listing", back_populates="price_history")

    __table_args__ = (
        Index("ix_price_history_listing_observed", "listing_id", "observed_at"),
    )

class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True)
    key = Column(String(64), unique=True, index=True)
    name = Column(String(100))
    request_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))