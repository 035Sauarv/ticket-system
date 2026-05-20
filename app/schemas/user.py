from pydantic import BaseModel, field_validator 
from typing import Optional
import re

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role_id: int
    team_id: Optional[int] = None

    @field_validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")

        if not re.search(r"[A-Z]", v):
            raise ValueError("At least one uppercase letter required")

        if not re.search(r"[0-9]", v):
            raise ValueError("At least one number required")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("At least one special character required")

        return v


class UserLogin(BaseModel):
    email:str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    team: Optional[str]=None
    status : str
    approved_by : Optional[int] = None



class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse