from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.team import Team

router = APIRouter(prefix="/public", tags=["Public"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/teams")
def get_public_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()

    return [
        {
            "id": team.id,
            "name": team.name
        }
        for team in teams
    ]