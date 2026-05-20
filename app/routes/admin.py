from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database.database import SessionLocal
from app.models.team import Team
from app.models.user import User
from app.models.role import Role
from app.models.logs import LoginLog
from fastapi.responses import FileResponse
from datetime import datetime
import pandas as pd
import os


router = APIRouter(prefix="/admin", tags=["ADMIN"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===============================
# CREATE TEAM
# ===============================
@router.post("/teams")
def create_team(
    name: str,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    existing = db.query(Team).filter(Team.name == name).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Team already exists"
        )

    team = Team(name=name)

    try:
        db.add(team)
        db.commit()
        db.refresh(team)
    except Exception:
        db.rollback()
        raise HTTPException(500, "Failed to create team")

    return {
        "msg": "Team created",
        "team_id": team.id
    }


# ===============================
# GET ALL TEAMS
# ===============================
@router.get("/teams")
def get_teams(
    db: Session = Depends(get_db),
    # user=Depends(require_role(["ADMIN"]))
):
    teams = db.query(Team).all()

    result = []

    for team in teams:

        manager = db.query(User).join(Role).filter(
            User.team_id == team.id,
            Role.id == User.role_id,
            Role.name == "MANAGER"
        ).first()

        member_count = db.query(User).filter(
            User.team_id == team.id
        ).count()

        result.append({
            "id": team.id,
            "name": team.name,
            "manager_id": manager.id if manager else None,
            "manager_name": manager.name if manager else "Not Assigned",
            "member_count": member_count
        })

    return result


# ===============================
# GET TEAM BY ID
# ===============================
@router.get("/teams/{team_id}")
def get_team_by_id(
    team_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(404, "Team not found")

    return team


# ===============================
# UPDATE TEAM NAME
# ===============================
@router.put("/teams/{team_id}")
def update_team(
    team_id: int,
    name: str,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(404, "Team not found")

    duplicate = db.query(Team).filter(
        Team.name == name,
        Team.id != team_id
    ).first()

    if duplicate:
        raise HTTPException(400, "Team already exists")

    team.name = name

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Failed to update team")

    return {"msg": "Team updated successfully"}


# ===============================
# GET ALL MANAGERS
# ===============================
@router.get("/managers")
def get_managers(
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    managers = db.query(User).join(Role).filter(
        Role.id == User.role_id,
        Role.name == "MANAGER"
    ).all()

    return [
        {
            "id": manager.id,
            "name": manager.name,
            "email": manager.email
        }
        for manager in managers
    ]


# ===============================
# ASSIGN / UPDATE TEAM MANAGER
# ===============================
@router.put("/teams/{team_id}/assign-manager")
def assign_manager(
    team_id: int,
    manager_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    team = db.query(Team).filter(Team.id == team_id).first()

    if not team:
        raise HTTPException(404, "Team not found")

    manager = db.query(User).filter(
        User.id == manager_id
    ).first()

    if not manager:
        raise HTTPException(404, "Manager not found")

    role = db.query(Role).filter(
        Role.id == manager.role_id
    ).first()

    if not role or role.name != "MANAGER":
        raise HTTPException(400, "Selected user is not manager")

    # ✅ Check if manager already assigned to another team
    if manager.team_id and manager.team_id != team_id:
        raise HTTPException(
            status_code=400,
            detail="Manager is already assigned to another team"
        )

    # Remove current manager from this team
    old_manager = db.query(User).join(Role).filter(
        User.team_id == team_id,
        Role.id == User.role_id,
        Role.name == "MANAGER"
    ).first()

    if old_manager:
        old_manager.team_id = None

    # Assign manager
    manager.team_id = team_id

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(500, "Manager assignment failed")

    return {"msg": "Manager assigned successfully"}


# ===============================
# GET ALL USERS
# ===============================
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):
    users = db.query(User).all()

    result = []

    for u in users:

        role = db.query(Role).filter(
            Role.id == u.role_id
        ).first()

        team_name = None
        manager_name = None

        if u.team_id:

            team = db.query(Team).filter(
                Team.id == u.team_id
            ).first()

            if team:
                team_name = team.name

                manager = db.query(User).join(Role).filter(
                    User.team_id == team.id,
                    Role.id == User.role_id,
                    Role.name == "MANAGER"
                ).first()

                if manager:
                    manager_name = manager.name

        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": role.name if role else None,
            "team_name": team_name,
            "manager_name": manager_name,
            "status": u.status
        })

    return result

# ===============================
# DELETE USER
# ===============================
@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMIN"]))
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Get role
    role = db.query(Role).filter(Role.id == user.role_id).first()

    # ❌ Prevent deleting ADMIN
    if role and role.name == "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Admin user cannot be deleted"
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
        "msg": "User deleted successfully"
    }

# ===============================
# GET LOGIN LOGS
# ===============================
@router.get("/login-logs")
def get_login_logs(
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):

    logs = db.query(LoginLog).all()

    result = []

    for log in logs:

        user_data = db.query(User).filter(
            User.id == log.user_id
        ).first()

        role_name = None

        if user_data:

            role = db.query(Role).filter(
                Role.id == user_data.role_id
            ).first()

            role_name = role.name if role else None

        result.append({
            "id": log.id,
            "user_name": user_data.name if user_data else "",
            "email": user_data.email if user_data else "",
            "role": role_name,
            "ip_address": log.ip_address,
            "login_time": log.login_time,
            "logout_time": log.logout_time,
            "duration": log.duration,
            "status": log.status
        })

    return result


# ===============================
# EXPORT LOGIN LOGS EXCEL
# ===============================
@router.get("/login-logs/export")
def export_login_logs(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db),
    user=Depends(require_role(["ADMIN"]))
):

    try:

        start = datetime.strptime(start_date, "%Y-%m-%d")

        end = datetime.strptime(end_date, "%Y-%m-%d")

        end = end.replace(
            hour=23,
            minute=59,
            second=59
        )

    except:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format"
        )

    logs = db.query(LoginLog).filter(
        LoginLog.login_time >= start,
        LoginLog.login_time <= end
    ).all()

    data = []

    for log in logs:

        user_data = db.query(User).filter(
            User.id == log.user_id
        ).first()

        role_name = None

        if user_data:

            role = db.query(Role).filter(
                Role.id == user_data.role_id
            ).first()

            role_name = role.name if role else None

        data.append({
            "User Name": user_data.name if user_data else "",
            "Email": user_data.email if user_data else "",
            "Role": role_name,
            "IP Address": log.ip_address,
            "Login Time": str(log.login_time),
            "Logout Time": str(log.logout_time),
            "Duration": log.duration,
            "Status": log.status
        })

    if not data:
        raise HTTPException(
            status_code=404,
            detail="No logs found"
        )

    df = pd.DataFrame(data)

    os.makedirs("exports", exist_ok=True)

    file_name = f"login_logs_{start_date}_to_{end_date}.xlsx"

    file_path = os.path.join(
        "exports",
        file_name
    )

    df.to_excel(file_path, index=False)

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )