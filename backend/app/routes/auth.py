
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import secrets
from app.db.database import get_db
from app.db.models import ApiKey

router = APIRouter()

@router.post("/auth/keys")
def create_key(name: str, db: Session = Depends(get_db)):
    key = ApiKey(key=secrets.token_hex(32), name=name)
    db.add(key)
    db.commit()
    return {"key": key.key, "name": key.name}