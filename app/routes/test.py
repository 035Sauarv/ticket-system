from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user, require_role

router = APIRouter(prefix="/test", tags=["Test"])


@router.get("/me")
def get_me(user=Depends(get_current_user)):
    return user


@router.get("/admin")
def admin_only(user=Depends(require_role(["ADMIN"]))):
    return {"msg": "Admin access granted"}

