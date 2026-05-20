import hashlib
from passlib.context import CryptContext
from jose import jwt

SECRET_KEY = "secret"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    # prevent bcrypt 72-byte limit
    hashed_input = hashlib.sha256(password.encode()).hexdigest()
    return pwd_context.hash(hashed_input)

def verify_password(plain, hashed):
    hashed_input = hashlib.sha256(plain.encode()).hexdigest()
    return pwd_context.verify(hashed_input, hashed)

def create_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)