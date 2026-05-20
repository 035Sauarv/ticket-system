from sqlalchemy import Boolean, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)

    team_id = Column(Integer, ForeignKey("teams.id"))
    manager_id = Column(Integer, ForeignKey("users.id"))   # owner (OPS Manager)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # optional member
    is_active = Column(Boolean, default=True)
    team = relationship("Team")