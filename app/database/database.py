from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker,declarative_base
import os
# DATABASE_URL = "mysql+pymysql://root:Saurav%40353535@host.docker.internal/ticket_system"
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()