from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ApiKey


def get_api_key(x_api_key: str = Header(...), db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter_by(key=x_api_key).first()
    if not key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    try:
        key.request_count += 1
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to track request")
    return key