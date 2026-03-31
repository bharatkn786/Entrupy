from typing import Any, Optional
from pydantic import BaseModel


class NormalizedListing(BaseModel):
    source: str
    source_product_id: str
    title: str
    brand: str
    condition: Optional[str] = None
    brand_id: Optional[str] = None
    category: Optional[str] = None
    price: float
    currency: str
    listing_url: Optional[str] = None
    image_url: Optional[str] = None
    metadata: dict = {}
