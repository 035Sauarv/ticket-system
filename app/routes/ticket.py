from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os
import shutil

from app.database.database import SessionLocal
from app.core.dependencies import require_role

from app.models.ticket import Ticket
from app.models.client import Client
from app.models.user import User
from app.models.team import Team
from app.models.role import Role
from app.utils.email import send_email

router = APIRouter(prefix="/tickets", tags=["TICKETS"])


# ===========================
# DB SESSION
# ===========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================
# CREATE TICKET
# Manager / Team Member
# ===========================
@router.post("/create")
def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    client_id: int = Form(...),
    priority: str = Form("MEDIUM"),

    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER", "TEAM_MEMBER"]))
):

    team = db.query(Team).filter(
        Team.id == current_user["team_id"]
    ).first()

    # OPS team cannot raise ticket
    if team and team.name == "Operational Support":
        raise HTTPException(
            status_code=403,
            detail="OPS team cannot create tickets"
        )

    client = db.query(Client).filter(
        Client.id == client_id
    ).first()

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found"
        )

    if not client.assigned_to:
        raise HTTPException(
            status_code=400,
            detail="Client not assigned to OPS member"
        )

    ticket = Ticket(
        title=title,
        description=description,
        client_id=client.id,
        priority=priority,
        status="OPEN",
        raised_by=current_user["user_id"],
        raised_team_id=current_user["team_id"],
        assigned_to=client.assigned_to
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    assigned_user = db.query(User).filter(
        User.id == ticket.assigned_to
    ).first()

    raiser = db.query(User).filter(
        User.id == current_user["user_id"]
    ).first()

    manager = None

    if assigned_user and assigned_user.team_id:

        manager = db.query(User).join(Role).filter(
            User.team_id == assigned_user.team_id,
            Role.id == User.role_id,
            Role.name == "MANAGER"
        ).first()

    created_time = datetime.now().strftime("%d-%m-%Y %I:%M %p")

    subject = f"New Ticket Assigned - #{ticket.id}"

    body = f"""
Hello,

A new ticket has been created.

====================================

Ticket ID: {ticket.id}

Title: {ticket.title}

Description:
{ticket.description}

Priority: {ticket.priority}

Client: {client.name}

Raised By: {raiser.name if raiser else "-"}

Assigned To: {assigned_user.name if assigned_user else "-"}

Created Time: {created_time}

Status: OPEN

====================================

Please login to the system.

"""

    # Send email to assigned user
    if assigned_user:
        send_email(
            to_email=assigned_user.email,
            subject=subject,
            body=body
        )

    # Send email to OPS manager
    if manager:
        send_email(
            to_email=manager.email,
            subject=subject,
            body=body
        )

    return {
        "msg": "Ticket created successfully",
        "ticket_id": ticket.id
    }


# ===========================
# USER OWN RAISED TICKETS
# ===========================
@router.get("/my-raised")
def my_raised_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER", "TEAM_MEMBER"]))
):

    tickets = db.query(Ticket).filter(
        Ticket.raised_by == current_user["user_id"]
    ).all()

    result = []

    for ticket in tickets:

        client = db.query(Client).filter(
            Client.id == ticket.client_id
        ).first()

        assigned_user = db.query(User).filter(
            User.id == ticket.assigned_to
        ).first()

        result.append({
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "priority": ticket.priority,
            "status": ticket.status,
            "client_name": client.name if client else None,
            "assigned_to": assigned_user.name if assigned_user else None,
            "excel_file": ticket.excel_file
        })

    return result


# ===========================
# TEAM MEMBER ASSIGNED TICKETS
# ===========================
@router.get("/my-assigned")
def my_assigned_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    tickets = db.query(Ticket).filter(
        Ticket.assigned_to == current_user["user_id"]
    ).all()

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
            "excel_file": ticket.excel_file
        })

    return result


# ===========================
# OPS MANAGER TEAM TICKETS
# ===========================
@router.get("/ops-team-tickets")
def ops_team_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    team_id = current_user["team_id"]

    users = db.query(User).filter(
        User.team_id == team_id
    ).all()

    user_ids = [user.id for user in users]

    tickets = db.query(Ticket).filter(
        Ticket.assigned_to.in_(user_ids)
    ).all()

    result = []

    for ticket in tickets:

        assigned_user = db.query(User).filter(
            User.id == ticket.assigned_to
        ).first()

        result.append({
            "id": ticket.id,
            "title": ticket.title,
            "priority": ticket.priority,
            "status": ticket.status,
            "assigned_to": assigned_user.name if assigned_user else None
        })

    return result


# ===========================
# RESOLVE TICKET
# ===========================
@router.put("/{ticket_id}/resolve")
def resolve_ticket(
    ticket_id: int,
    excel_file: UploadFile = File(...),

    db: Session = Depends(get_db),
    current_user=Depends(require_role(["TEAM_MEMBER"]))
):

    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    if ticket.assigned_to != current_user["user_id"]:
        raise HTTPException(
            status_code=403,
            detail="Not your assigned ticket"
        )

    upload_dir = "uploads/resolved_excel"
    os.makedirs(upload_dir, exist_ok=True)

    file_path = f"{upload_dir}/{excel_file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(excel_file.file, buffer)

    ticket.status = "RESOLVED"
    ticket.resolved_at = datetime.utcnow()
    ticket.excel_file = file_path

    db.commit()
    db.refresh(ticket)

    raiser = db.query(User).filter(
        User.id == ticket.raised_by
    ).first()

    resolver = db.query(User).filter(
        User.id == current_user["user_id"]
    ).first()

    client = db.query(Client).filter(
        Client.id == ticket.client_id
    ).first()

    manager = None

    if raiser and raiser.team_id:

        manager = db.query(User).join(Role).filter(
            User.team_id == raiser.team_id,
            Role.id == User.role_id,
            Role.name == "MANAGER"
        ).first()

    resolved_time = datetime.now().strftime("%d-%m-%Y %I:%M %p")

    subject = f"Ticket Resolved - #{ticket.id}"

    body = f"""
Hello,

Ticket has been resolved successfully.

====================================

Ticket ID: {ticket.id}

Title: {ticket.title}

Client: {client.name if client else "-"}

Priority: {ticket.priority}

Raised By: {raiser.name if raiser else "-"}

Resolved By: {resolver.name if resolver else "-"}

Resolved Time: {resolved_time}

Status: RESOLVED

====================================

Excel file is now available in system.

"""

    # Email to ticket raiser
    if raiser:
        send_email(
            to_email=raiser.email,
            subject=subject,
            body=body
        )

    # Email to raiser manager
    if manager:
        send_email(
            to_email=manager.email,
            subject=subject,
            body=body
        )

    return {
        "msg": "Ticket resolved successfully",
        "file_path": file_path
    }


# ===========================
# TEAM RESOLVED TICKETS
# ===========================
@router.get("/team-resolved")
def team_resolved_tickets(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER"]))
):

    tickets = db.query(Ticket).filter(
        Ticket.raised_team_id == current_user["team_id"],
        Ticket.status == "RESOLVED"
    ).all()

    return tickets


# ===========================
# DOWNLOAD RESOLVED FILE
# ===========================
@router.get("/{ticket_id}/download")
def download_resolved_file(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["MANAGER", "TEAM_MEMBER"]))
):

    ticket = db.query(Ticket).filter(
        Ticket.id == ticket_id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=404,
            detail="Ticket not found"
        )

    if (
        ticket.raised_by != current_user["user_id"]
        and ticket.assigned_to != current_user["user_id"]
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    if not ticket.excel_file:
        raise HTTPException(
            status_code=404,
            detail="No resolved file available"
        )

    return FileResponse(
        path=ticket.excel_file,
        filename=os.path.basename(ticket.excel_file),
        media_type="application/octet-stream"
    )