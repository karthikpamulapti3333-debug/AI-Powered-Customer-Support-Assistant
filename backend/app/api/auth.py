from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import uuid
from app.config.database import get_db
from app.config.settings import settings
from app.models import User, Role, Agent, PasswordResetToken
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Pydantic Schemas
class RegisterRequest(BaseModel):
    username: str
    password: str
    email: EmailStr
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "ROLE_CUSTOMER"
    departmentId: Optional[int] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    type: str = "Bearer"
    id: int
    username: str
    email: str
    roles: List[str]

class UserProfileUpdateRequest(BaseModel):
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    oldPassword: str
    newPassword: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check username/email existence
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email is already in use")

    # Format role name
    r_input = req.role.strip().upper() if req.role else "ROLE_CUSTOMER"
    if not r_input.startswith("ROLE_"):
        r_input = f"ROLE_{r_input}"
    
    role_name = r_input if r_input in ["ROLE_ADMIN", "ROLE_MANAGER", "ROLE_AGENT", "ROLE_CUSTOMER"] else "ROLE_CUSTOMER"
    role_obj = db.query(Role).filter(Role.name == role_name).first()
    if not role_obj:
        role_obj = Role(name=role_name)
        db.add(role_obj)
        db.commit()
        db.refresh(role_obj)

    # Create user
    user = User(
        username=req.username,
        password=hash_password(req.password),
        email=req.email,
        first_name=req.firstName,
        last_name=req.lastName,
        phone=req.phone,
        department_id=req.departmentId
    )
    user.roles.append(role_obj)
    db.add(user)
    db.commit()
    db.refresh(user)

    # If role is AGENT, also create Agent profile
    if role_name == "ROLE_AGENT":
        agent = Agent(
            user_id=user.id,
            department_id=req.departmentId,
            status="AVAILABLE",
            max_concurrent_complaints=5,
            current_complaints_count=0
        )
        db.add(agent)
        db.commit()

    return {"message": "User registered successfully"}

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    from sqlalchemy import func
    u_clean = req.username.strip().lower() if req.username else ""
    p_clean = req.password.strip() if req.password else ""

    user = db.query(User).filter(func.lower(User.username) == u_clean).first()
    if not user:
        user = db.query(User).filter(func.lower(User.email) == u_clean).first()

    # If demo user is missing from DB, trigger auto-seeding
    from app.services.auth import DEMO_PASSWORDS
    if not user and u_clean in DEMO_PASSWORDS:
        from app.main import seed_database
        try:
            seed_database(db)
            user = db.query(User).filter(func.lower(User.username) == u_clean).first()
        except Exception:
            pass

    if not user or not verify_password(p_clean, user.password, username=u_clean):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    roles = [r.name for r in user.roles]
    token = create_access_token(user.id, user.username, roles)
    return LoginResponse(
        token=token,
        type="Bearer",
        id=user.id,
        username=user.username,
        email=user.email,
        roles=roles
    )

@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "phone": user.phone,
        "department": {
            "id": user.department.id,
            "name": user.department.name,
            "description": user.department.description
        } if user.department else None,
        "roles": [r.name for r in user.roles]
    }

@router.put("/profile/update")
def update_profile(req: UserProfileUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.email and req.email != user.email:
        if db.query(User).filter(User.email == req.email).first():
            raise HTTPException(status_code=400, detail="Email is already in use")
        user.email = req.email
    if req.firstName is not None:
        user.first_name = req.firstName
    if req.lastName is not None:
        user.last_name = req.lastName
    if req.phone is not None:
        user.phone = req.phone
    db.commit()
    return {"message": "Profile updated successfully"}

@router.put("/change-password")
def change_password(req: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.oldPassword, user.password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    user.password = hash_password(req.newPassword)
    db.commit()
    return {"message": "Password changed successfully"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email address not found")
        
    token = str(uuid.uuid4())
    expiry = datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    
    # Remove existing reset token if any
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    
    reset_token = PasswordResetToken(
        token=token,
        user_id=user.id,
        expiry_date=expiry
    )
    db.add(reset_token)
    db.commit()
    
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    print("====================================================================")
    print(f"PASSWORD RESET REQUESTED FOR: {user.email}")
    print(f"RESET LINK: {reset_link}")
    print("====================================================================")
    
    return {"message": "Password reset link generated and output to console successfully"}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    reset_token = db.query(PasswordResetToken).filter(PasswordResetToken.token == req.token).first()
    if not reset_token or reset_token.expiry_date < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = hash_password(req.newPassword)
    db.delete(reset_token)
    db.commit()
    
    return {"message": "Password reset successfully"}
