from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
# from sqlalchemy import func

from app.database.database import SessionLocal
from app.core.dependencies import require_role

from app.models.user import User
from app.models.team import Team
from app.models.role import Role
from app.models.client import Client
from app.models.ticket import Ticket
from fastapi import BackgroundTasks
from app.utils.email import send_email

router = APIRouter(prefix="/manager", tags=["MANAGER"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ====================================
# MANAGER DASHBOARD
# ====================================
@router.get("/dashboard")
def manager_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    team_id = current_user["team_id"]

    total_members = db.query(User).filter(
        User.team_id == team_id
    ).count()

    total_clients = db.query(Client).filter(
        Client.team_id == team_id
    ).count()

    pending_tickets = db.query(Ticket).join(User).filter(
        User.team_id == team_id,
        Ticket.status == "PENDING"
    ).count()

    completed_tickets = db.query(Ticket).join(User).filter(
        User.team_id == team_id,
        Ticket.status == "COMPLETED"
    ).count()

    return {
        "team_members": total_members,
        "clients": total_clients,
        "pending_tickets": pending_tickets,
        "completed_tickets": completed_tickets
    }


# ====================================
# TEAM MEMBERS
# ====================================
@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    team_id = current_user["team_id"]

    users = db.query(User).join(Role).filter(
        User.team_id == team_id,
        Role.id == User.role_id,
        Role.name == "TEAM_MEMBER"
    ).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "status": user.status
        }
        for user in users
    ]


# ====================================
# MANAGER CLIENTS
# ====================================

@router.get("/clients")
def manager_clients(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    manager_team_id = current_user["team_id"]

    manager_team = db.query(Team).filter(
        Team.id == manager_team_id
    ).first()

    if manager_team.name.upper() == "Operational Support":

        clients = db.query(Client).filter(
            Client.team_id == manager_team_id
        ).all()

        can_assign = True

    else:

        clients = db.query(Client).all()

        can_assign = False

    result = []

    for client in clients:

        assigned_member = None

        if client.assigned_to:
            assigned_member = db.query(User).filter(
                User.id == client.assigned_to
            ).first()

        result.append({
            "id": client.id,
            "name": client.name,
            "is_active": client.is_active,
            "assigned_member_name": assigned_member.name if assigned_member else None,
            "assigned_member_id": assigned_member.id if assigned_member else None,
            "can_assign": can_assign
        })

    return result



# ====================================
# REASSIGN TICKET
# ====================================
@router.put("/tickets/{ticket_id}/assign")
def assign_ticket(
    ticket_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(404, "Ticket not found")

    member = db.query(User).filter(
        User.id == member_id
    ).first()

    if not member:
        raise HTTPException(404, "Member not found")

    ticket.assigned_to = member.id

    db.commit()

    return {"msg": "Ticket reassigned successfully"}



# =========================
# MANAGER - PENDING USERS
# =========================
@router.get("/pending")
def manager_pending_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    team_id = current_user["team_id"]

    users = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(
            User.status == "PENDING",
            User.team_id == team_id,
            Role.name == "TEAM_MEMBER"
        )
        .all()
    )

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "status": user.status
        }
        for user in users
    ]

# =========================
# MANAGER - APPROVE USER
# =========================
@router.put("/approve/{user_id}")
def manager_approve_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    manager_team_id = current_user["team_id"]

    # Only same team user
    if user.team_id != manager_team_id:
        raise HTTPException(
            status_code=403,
            detail="You can only approve users from your team"
        )

    role = db.query(Role).filter(Role.id == user.role_id).first()

    # Only TEAM_MEMBER
    if role.name != "TEAM_MEMBER":
        raise HTTPException(
            status_code=403,
            detail="Manager can only approve team members"
        )

    user.status = "APPROVED"
    user.approved_by = current_user["user_id"]

    db.commit()

    # SEND EMAIL TO USER
    background_tasks.add_task(
        send_email,
        user.email,
        "Account Approved",
        f"""
        <h2>Your account has been approved</h2>

        <p>Hello {user.name},</p>

        <p>Your account has been approved by your manager.</p>

        <p>You can now login using the application.</p>

        <a href="http://localhost:3000">
            Open Application
        </a>
        """
    )

    return {"msg": "User approved"}


# =========================
# MANAGER - REJECT USER
# =========================
@router.put("/reject/{user_id}")
def manager_reject_user(
    user_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    manager_team_id = current_user["team_id"]

    # Only same team
    if user.team_id != manager_team_id:
        raise HTTPException(
            status_code=403,
            detail="You can only reject users from your team"
        )

    role = db.query(Role).filter(Role.id == user.role_id).first()

    if role.name != "TEAM_MEMBER":
        raise HTTPException(
            status_code=403,
            detail="Manager can only reject team members"
        )

    user.status = "REJECTED"
    user.approved_by = current_user["user_id"]

    db.commit()

    # SEND EMAIL TO USER
    background_tasks.add_task(
        send_email,
        user.email,
        "Account Rejected",
        f"""
        <h2>Your account registration was rejected</h2>

        <p>Hello {user.name},</p>

        <p>Your manager rejected your registration request.</p>

        <p>Please contact your manager/admin.</p>
        """
    )

    return {"msg": "User rejected"}

# =========================
# MANAGER - DELETE TEAM MEMBER
# =========================
@router.delete("/users/{user_id}")
def delete_team_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    manager_team_id = current_user["team_id"]

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Security check
    if user.team_id != manager_team_id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete users from your own team"
        )

    # Only TEAM_MEMBER can be deleted
    role = db.query(Role).filter(
        Role.id == user.role_id
    ).first()

    if not role or role.name != "TEAM_MEMBER":
        raise HTTPException(
            status_code=403,
            detail="Manager can only delete team members"
        )

    try:
        db.delete(user)
        db.commit()

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to delete user"
        )

    return {
        "msg": "Team member deleted successfully"
    }


# ====================================
# OPS MANAGER ASSIGN CLIENT TO TEAM MEMBER
# ====================================
@router.put("/client/{client_id}/assign")
def assign_client_member(
    client_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    manager_team_id = current_user["team_id"]

    manager_team = db.query(Team).filter(
        Team.id == manager_team_id
    ).first()

    if not manager_team:
        raise HTTPException(
            status_code=404,
            detail="Manager team not found"
        )

    # ONLY OPS MANAGER
    if manager_team.name != "Operational Support":
        raise HTTPException(
            status_code=403,
            detail="Only OPS Manager can assign clients"
        )

    # Client must belong to OPS team
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.team_id == manager_team_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found in OPS team"
        )

    # Member must belong to OPS team
    member = db.query(User).join(Role).filter(
        User.id == member_id,
        User.team_id == manager_team_id,
        Role.id == User.role_id,
        Role.name == "TEAM_MEMBER"
    ).first()

    if not member:
        raise HTTPException(
            status_code=404,
            detail="Team member not found in OPS team"
        )

    # UPDATE / ASSIGN
    client.assigned_to = member.id

    db.commit()

    return {
        "msg": "Client assigned successfully"
    }