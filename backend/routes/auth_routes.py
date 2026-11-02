import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, ApiResponse
from backend.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api", tags=["Authentication"])

def normalize_contact(contact: str) -> tuple[str, bool]:
    """Clean contact and detect whether it is an email address."""
    clean = contact.strip()
    is_email = "@" in clean
    if is_email:
        clean = clean.lower()
    return clean, is_email

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user and store the credentials in MySQL database.
    """
    fullname = payload.fullname.strip()
    raw_contact = payload.email.strip()
    password = payload.password.strip()

    if len(fullname) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name must be at least 2 characters long."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    identifier, is_email = normalize_contact(raw_contact)

    existing = db.query(User).filter(
        (User.identifier == identifier) | 
        (User.email == identifier) | 
        (User.phone == identifier)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email or mobile number already exists."
        )

    password_hash = hash_password(password)

    new_user = User(
        fullname=fullname,
        identifier=identifier,
        email=identifier if is_email else None,
        phone=identifier if not is_email else None,
        password_hash=password_hash
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    access_token = create_access_token(
        data={"sub": str(new_user.id), "identifier": new_user.identifier, "fullname": new_user.fullname}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate a user with email/mobile and password against MySQL database.
    """
    raw_contact = payload.email.strip()
    password = payload.password.strip()

    identifier, _ = normalize_contact(raw_contact)

    user = db.query(User).filter(
        (User.identifier == identifier) | 
        (User.email == identifier) | 
        (User.phone == identifier)
    ).first()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/mobile number or password."
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "identifier": user.identifier, "fullname": user.fullname}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Return currently authenticated user's profile.
    """
    return UserResponse.model_validate(current_user)

@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """
    List all registered users from MySQL database (for administration and testing).
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]
