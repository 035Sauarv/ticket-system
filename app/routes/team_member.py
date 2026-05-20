from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.core.dependencies import require_role

from app.models.client import Client
from app.models.ticket import Ticket
from app.models.team import Team
from sqlalchemy import or_
from app.models.user import User
from app.models.role import Role

router = APIRouter(prefix="/team-member", tags=["TEAM MEMBER"])


# ==========================
# DB SESSION
# ==========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================
# TEAM MEMBER DASHBOARD
# ==========================
@router.get("/dashboard")
def team_member_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    user_id = current_user["user_id"]
    team_id = current_user["team_id"]


    team = db.query(Team).filter(
        Team.id == team_id
    ).first()

    if team and team.name == "Operational Support":
        total_clients = db.query(Client).filter(
            Client.team_id == team_id
        ).count()
    else:
        total_clients = db.query(Client).count()


    open_tickets = db.query(Ticket).filter(
        Ticket.assigned_to == user_id,
        Ticket.status == "OPEN"
    ).count()

    team_members = db.query(User).join(Role).filter(
        User.team_id == team_id,
        Role.id == User.role_id,
        Role.name == "TEAM_MEMBER"
    ).count()

    return {
        "clients": total_clients,
        "open_tickets": open_tickets,
        "team_members": team_members
    }


# ==========================
# TEAM MEMBER CLIENTS
# ==========================
@router.get("/clients")
def team_member_clients(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    team_id = current_user["team_id"]

    from app.models.team import Team

    current_team = db.query(Team).filter(
        Team.id == team_id
    ).first()

    # OPS team -> only own clients
    if current_team and current_team.name == "Operational Support":

        clients = db.query(Client).filter(
            Client.team_id == team_id
        ).all()

    # Other teams -> show all clients
    else:

        clients = db.query(Client).all()

    result = []

    for client in clients:
        result.append({
            "id": client.id,
            "name": client.name,
            "is_active": client.is_active,
            "assigned_to": client.assigned_to
        })

    return result


# ==========================
# TEAM MEMBER ASSIGNED TICKETS
# ==========================

@router.get("/tickets")
def team_member_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    user_id = current_user["user_id"]

    # Show both:
    # 1. Tickets assigned to OPS member
    # 2. Tickets raised by requester member

    tickets = db.query(Ticket).filter(
        or_(
            Ticket.assigned_to == user_id,
            Ticket.raised_by == user_id
        )
    ).order_by(Ticket.id.desc()).all()

    result = []

    for ticket in tickets:

        client = db.query(Client).filter(
            Client.id == ticket.client_id
        ).first()

        result.append({
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "client_name": client.name if client else None,
            "excel_file": ticket.excel_file,

            # permission flags
            "is_assigned": ticket.assigned_to == user_id,
            "is_requester": ticket.raised_by == user_id
        })

    return result

# ==========================
# TEAM MEMBERS LIST
# ==========================
@router.get("/members")
def get_team_members(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    team_id = current_user["team_id"]

    members = db.query(User).join(Role).filter(
        User.team_id == team_id,
        Role.id == User.role_id,
        Role.name == "TEAM_MEMBER"
    ).all()

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email
        }
        for member in members
    ]