from sqlalchemy import Column, Row, Integer,String
from app.database.database import Base

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer,primary_key=True,index=True)
    name = Column(String(50), unique=True)