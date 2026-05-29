from fastapi import FastAPI
from app.database.database import Base, engine
from app.models import user, role, team
from app.routes import auth, test , admin,client
from app.core.exceptions import AppException,app_exception_handler
from app.routes import manager
from app.routes import ticket
from app.routes import team_member
from app.routes import chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


origins = [
    "http://localhost:3000",
    "http://13.204.14.205",
    "http://13.204.14.205:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# this will now work
Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(test.router)
app.include_router(admin.router)
app.include_router(client.router)
app.include_router(manager.router)
app.include_router(ticket.router)
app.include_router(team_member.router)
app.include_router(chat.router)
app.add_exception_handler(AppException, app_exception_handler)

