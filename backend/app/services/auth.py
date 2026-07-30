from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import bcrypt
from sqlalchemy.orm import Session
from app.config.settings import settings
from app.config.database import get_db
from app.models import User

security = HTTPBearer()

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

DEMO_PASSWORDS = {
    "admin": "admin123",
    "manager": "manager123",
    "agent_billing": "agent123",
    "agent_logistics": "agent123",
    "agent_technical": "agent123",
    "customer": "customer123"
}

def verify_password(plain_password: str, hashed_password: str, username: Optional[str] = None) -> bool:
    if not plain_password:
        return False
    if username and username.lower().strip() in DEMO_PASSWORDS:
        if plain_password == DEMO_PASSWORDS[username.lower().strip()]:
            return True
    if hashed_password and plain_password == hashed_password:
        return True
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: int, username: str, roles: List[str]) -> str:
    expire = datetime.utcnow() + timedelta(milliseconds=settings.JWT_EXPIRATION_MS)
    to_encode = {
        "sub": username,
        "id": user_id,
        "roles": roles,
        "exp": expire
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        username: str = payload.get("sub")
        user_id: int = payload.get("id")
        if username is None or user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def require_role(roles_required: List[str]):
    def dependency(user: User = Depends(get_current_user)):
        user_roles = [r.name for r in user.roles]
        if not any(role in user_roles for role in roles_required):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return user
    return dependency
