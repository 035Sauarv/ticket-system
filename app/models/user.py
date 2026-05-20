from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100), unique=True)
    password = Column(String(255))

    role_id = Column(Integer, ForeignKey("roles.id"))

    # ✅ ONLY ONE team_id
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    status = Column(String(20), default="PENDING")
    approved_by = Column(Integer, nullable=True)

    role = relationship("Role")
    team = relationship("Team")