from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime
from app.database.database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255))
    description = Column(String(1000))

    client_id = Column(Integer, ForeignKey("clients.id"))

    raised_by = Column(Integer, ForeignKey("users.id"))
    raised_team_id = Column(Integer, ForeignKey("teams.id"))

    assigned_to = Column(Integer, ForeignKey("users.id"))

    excel_file = Column(String(255), nullable=True)

    priority = Column(String(20), default="MEDIUM")

    status = Column(String(20), default="OPEN")

    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)