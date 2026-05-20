from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from collections import defaultdict

from app.database.database import SessionLocal

from app.models.message import Message
from app.models.user import User
from app.models.role import Role
from sqlalchemy import or_, and_

router = APIRouter(prefix="/chat", tags=["CHAT"])

active_connections = defaultdict(list)


# =========================
# DB SESSION
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# CHECK CHAT PERMISSION
# =========================
def can_chat(sender, receiver):

    # manager -> manager = allow
    if (
        sender.role.name == "MANAGER"
        and receiver.role.name == "MANAGER"
    ):
        return True

    # manager -> team member = same team only
    if (
        sender.role.name == "MANAGER"
        and receiver.role.name == "TEAM_MEMBER"
    ):
        return sender.team_id == receiver.team_id

    # team member -> manager = same team only
    if (
        sender.role.name == "TEAM_MEMBER"
        and receiver.role.name == "MANAGER"
    ):
        return sender.team_id == receiver.team_id

    # team member -> team member = allow all
    if (
        sender.role.name == "TEAM_MEMBER"
        and receiver.role.name == "TEAM_MEMBER"
    ):
        return True

    return False


# =========================
# WEBSOCKET
# =========================
@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int
):

    await websocket.accept()

    active_connections[user_id].append(websocket)

    db = SessionLocal()

    try:

        while True:

            data = await websocket.receive_json()

            sender = db.query(User).filter(
                User.id == user_id
            ).first()

            receiver = db.query(User).filter(
                User.id == data["receiver_id"]
            ).first()

            if not sender or not receiver:
                continue

            # permission
            if not can_chat(sender, receiver):

                await websocket.send_json({
                    "type": "error",
                    "message": "Chat not allowed"
                })

                continue

            # save message
            new_message = Message(
                sender_id=user_id,
                receiver_id=receiver.id,
                message=data["message"],
                delivered=False,
                seen=False
            )

            db.add(new_message)
            db.commit()
            db.refresh(new_message)

            # receiver online?
            delivered = False

            if receiver.id in active_connections:

                delivered = True

                new_message.delivered = True

                db.commit()

                for connection in active_connections[receiver.id]:

                    await connection.send_json({
                        "type": "new_message",
                        "id": new_message.id,
                        "sender_id": user_id,
                        "receiver_id": receiver.id,
                        "message": new_message.message,
                        "created_at": str(new_message.created_at),
                        "delivered": True,
                        "seen": False
                    })

            # sender own update
            await websocket.send_json({
                "type": "message_sent",
                "id": new_message.id,
                "sender_id": user_id,
                "receiver_id": receiver.id,
                "message": new_message.message,
                "created_at": str(new_message.created_at),
                "delivered": delivered,
                "seen": False
            })

    except WebSocketDisconnect:

        active_connections[user_id].remove(websocket)

        db.close()

@router.get("/users/{user_id}")
def get_chat_users(
    user_id: int,
    db: Session = Depends(get_db)
):

    current_user = db.query(User).filter(
        User.id == user_id
    ).first()

    users = db.query(User).all()

    result = []

    for user in users:

        if user.id == current_user.id:
            continue

        if can_chat(current_user, user):

            result.append({
                "id": user.id,
                "name": user.name,
                "team_id": user.team_id,
                "role": user.role.name
            })

    return result

@router.put("/seen/{sender_id}/{receiver_id}")
def mark_seen(
    sender_id: int,
    receiver_id: int,
    db: Session = Depends(get_db)
):

    messages = db.query(Message).filter(
        Message.sender_id == sender_id,
        Message.receiver_id == receiver_id,
        Message.seen == False
    ).all()

    for msg in messages:

        msg.seen = True

    db.commit()

    return {
        "msg": "Seen updated"
    }

# =========================
# GET CHAT MESSAGES
# =========================
@router.get("/messages/{user_id}/{receiver_id}")
def get_messages(
    user_id: int,
    receiver_id: int,
    db: Session = Depends(get_db)
):

    messages = db.query(Message).filter(

        or_(

            and_(
                Message.sender_id == user_id,
                Message.receiver_id == receiver_id
            ),

            and_(
                Message.sender_id == receiver_id,
                Message.receiver_id == user_id
            )

        )

    ).order_by(Message.created_at.asc()).all()

    result = []

    for msg in messages:

        result.append({
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "message": msg.message,
            "created_at": str(msg.created_at),
            "delivered": msg.delivered,
            "seen": msg.seen
        })

    return result