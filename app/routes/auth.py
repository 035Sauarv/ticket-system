from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.team import Team
from app.schemas.user import UserCreate, UserLogin, LoginResponse,UserResponse
from app.core.security import hash_password, verify_password, create_token
from app.core.dependencies import get_current_user
from fastapi import Request
from datetime import datetime
from app.models.logs import LoginLog

from app.core.dependencies import require_role
from app.utils.email import send_email

from fastapi import BackgroundTasks

router = APIRouter(prefix="/auth", tags=["Auth"])


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

@router.post("/register")
async def register(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    role = db.query(Role).filter(Role.id == user_data.role_id).first()

    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing_user = db.query(User).filter(
        User.email == user_data.email
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    team_id = None
    manager = None

    # ADMIN
    if role.name == "ADMIN":
        status = "APPROVED"

    # MANAGER
    elif role.name == "MANAGER":
        status = "PENDING"

    # TEAM MEMBER
    elif role.name == "TEAM_MEMBER":

        status = "PENDING"

        if not user_data.team_id:
            raise HTTPException(status_code=400, detail="Team required")

        team = db.query(Team).filter(
            Team.id == user_data.team_id
        ).first()

        if not team:
            raise HTTPException(status_code=400, detail="Invalid team")

        team_id = user_data.team_id

        # ✅ Get manager of that team
        manager = db.query(User).join(Role).filter(
            User.team_id == team_id,
            Role.id == User.role_id,
            Role.name == "MANAGER"
        ).first()

    else:
        raise HTTPException(status_code=400, detail="Invalid role")

    # Create user
    user = User(
        name=user_data.name,
        email=user_data.email,
        password=hash_password(user_data.password),
        role_id=user_data.role_id,
        team_id=team_id,
        status=status
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ Send email to manager
    if role.name == "TEAM_MEMBER" and manager:

        background_tasks.add_task(
            send_email,
            manager.email,
            "New Team Member Approval",
            f"""
            <h3>New User Registration</h3>
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <p>Please approve or reject this user.</p>
            """
        )

    return {"msg": "Registration successful"} 
@router.post("/login", response_model=LoginResponse)
def login(request: Request,user_data: UserLogin, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == user_data.email).first()

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.status != "APPROVED":
        raise HTTPException(status_code=403, detail="User not approved yet")

    role = db.query(Role).filter(Role.id == user.role_id).first()

    team = None
    if user.team_id:
        team = db.query(Team).filter(Team.id == user.team_id).first()

    token = create_token({
        "user_id": user.id,
        "role": role.name,
        "team_id": user.team_id,
        "user_name": user.name
    })

    ip = request.client.host

    log = LoginLog(
    user_id=user.id,
    ip_address=ip
    )

    db.add(log)
    db.commit()

    return {
    "access_token": token,
    "token_type": "bearer",
    "user": {
        "id": user.id,
        "name": user.name,
        "role": role.name,
        "team": team.name if team else None,
        "status": user.status,              
        "approved_by": user.approved_by     
    }
}

@router.get("/pending")
def get_pending_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMIN", "MANAGER"]))
):
    return db.query(User).filter(User.status == "PENDING").all()

@router.put("/approve/{user_id}")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMIN", "MANAGER"]))
):

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = db.query(Role).filter(Role.id == user.role_id).first()

    if role.name == "MANAGER" and current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admin can approve manager")


    user.status = "APPROVED"
    user.approved_by = current_user["user_id"]

    db.commit()

    return {"msg": "User approved"}

@router.put("/reject/{user_id}")
def reject_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMIN", "MANAGER"]))
):
    

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.status = "REJECTED"
    user.approved_by = current_user["user_id"]

    db.commit()

    return {"msg": "User rejected"}

@router.post("/logout")
def logout(
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):

    log = db.query(LoginLog).filter(
        LoginLog.user_id == current_user["user_id"],
        LoginLog.status == "ACTIVE"
    ).order_by(LoginLog.id.desc()).first()

    if log:

        log.logout_time = datetime.utcnow()

        diff = log.logout_time - log.login_time

        seconds = int(diff.total_seconds())

        hours = seconds // 3600
        minutes = (seconds % 3600) // 60

        log.duration = f"{hours}h {minutes}m"

        log.status = "LOGOUT"

        db.commit()

    return {
        "msg": "Logout successful"
    }

