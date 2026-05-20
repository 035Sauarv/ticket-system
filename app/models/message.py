from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from datetime import datetime

from app.database.database import Base

class Message(Base):

    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)

    sender_id = Column(Integer, ForeignKey("users.id"))

    receiver_id = Column(Integer, ForeignKey("users.id"))

    message = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)

    delivered = Column(Boolean, default=False)

    seen = Column(Boolean, default=False)