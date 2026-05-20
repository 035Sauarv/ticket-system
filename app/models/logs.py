from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database.database import Base

class LoginLog(Base):
    __tablename__ = "login_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))

    ip_address = Column(String(100))  # FIXED

    login_time = Column(DateTime(timezone=True), server_default=func.now())

    logout_time = Column(DateTime(timezone=True), nullable=True)

    duration = Column(String(50), nullable=True)  # ALSO GOOD PRACTICE

    status = Column(String(20), default="ACTIVE")