from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.client import Client
from app.models.team import Team
from app.models.user import User
from app.models.role import Role
from app.schemas.client import ClientCreate, ClientResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/clients", tags=["Clients"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ClientResponse)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    # find OPS team
    team = db.query(Team).filter(Team.name == "Operational Support").first()
    if not team:
        raise HTTPException(404, "OPS team not found")

    # find OPS manager
    manager = db.query(User).join(Role).filter(
        Role.name == "MANAGER",
        User.team_id == team.id
    ).first()

    if not manager:
        raise HTTPException(400, "OPS manager not found")

    # duplicate check
    existing = db.query(Client).filter(Client.name == data.name).first()
    if existing:
        raise HTTPException(400, "Client already exists")

    client = Client(
        name=data.name,
        team_id=team.id,
        manager_id=manager.id   # 🔥 auto assign
    )

    db.add(client)
    db.commit()
    db.refresh(client)

    return client

@router.get("/", response_model=list[ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    return db.query(Client).all()

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(404, "Client not found")

    return client

@router.put("/{client_id}")
def update_client(
    client_id: int,
    data: ClientCreate,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(404, "Client not found")

    # check team
    team = db.query(Team).filter(Team.id == data.team_id).first()
    if not team:
        raise HTTPException(404, "Team not found")

    client.name = data.name
    client.team_id = data.team_id

    db.commit()

    return {"msg": "Client updated"}

@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not client.is_active:
        raise HTTPException(status_code=400, detail="Client already deleted")

    client.is_active = False
    db.commit()

    return {"msg": "Client deleted successfully"}