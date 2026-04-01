import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import Base, Product, Listing, PriceHistory
from app.service import item_listing
from app.schemas import NormalizedListing


def make_item(**kwargs):
    defaults = {
        "source": "grailed",
        "source_product_id": "test-001",
        "title": "Test Jacket",
        "brand": "Amiri",
        "category": "apparel",
        "price": 500.0,
        "currency": "USD",
        "listing_url": "https://grailed.com/test",
        "image_url": None,
        "metadata": {},
    }
    defaults.update(kwargs)
    return NormalizedListing(**defaults)


# Fresh isolated DB per test — no shared state between tests
@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_new_product_is_created(db):
    item_listing(db, make_item())
    assert db.query(Product).count() == 1


def test_new_listing_is_created(db):
    item_listing(db, make_item(source_product_id="list-001"))
    assert db.query(Listing).count() >= 1


def test_first_refresh_no_price_change(db):
    result = item_listing(db, make_item(source_product_id="first-001"))
    assert result["changed"] == False


def test_same_price_no_duplicate_history(db):
    item = make_item(source_product_id="same-price-001")
    item_listing(db, item)
    item_listing(db, item)
    listing = db.query(Listing).filter_by(source_product_id="same-price-001").first()
    history = db.query(PriceHistory).filter_by(listing_id=listing.id).all()
    assert len(history) == 1


def test_price_change_detected(db):
    item_listing(db, make_item(source_product_id="change-001", price=500.0))
    result = item_listing(db, make_item(source_product_id="change-001", price=600.0))
    assert result["changed"] == True


def test_price_change_creates_history_row(db):
    item_listing(db, make_item(source_product_id="history-001", price=500.0))
    item_listing(db, make_item(source_product_id="history-001", price=700.0))
    listing = db.query(Listing).filter_by(source_product_id="history-001").first()
    history = db.query(PriceHistory).filter_by(listing_id=listing.id).all()
    assert len(history) == 2


def test_price_change_detail_has_correct_values(db):
    item_listing(db, make_item(source_product_id="detail-001", price=500.0))
    result = item_listing(db, make_item(source_product_id="detail-001", price=600.0))
    assert result["detail"]["old_price"] == 500.0
    assert result["detail"]["new_price"] == 600.0
    assert result["detail"]["change_pct"] == 20.0


def test_invalid_price_zero_handled(db):
    result = item_listing(db, make_item(source_product_id="zero-001", price=0.0))
    assert result is not None


def test_multiple_sources_same_product(db):
    item_listing(db, make_item(source="grailed", source_product_id="multi-001"))
    item_listing(db, make_item(source="fashionphile", source_product_id="multi-002"))
    assert db.query(Listing).count() >= 2