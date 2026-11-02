from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class UserRegister(BaseModel):
    fullname: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: str = Field(..., min_length=3, max_length=150, description="Email address or mobile phone number")
    password: str = Field(..., min_length=6, max_length=100, description="Password (at least 6 characters)")

class UserLogin(BaseModel):
    email: str = Field(..., min_length=3, max_length=150, description="Registered email address or mobile number")
    password: str = Field(..., min_length=1, max_length=100, description="Account password")

class UserResponse(BaseModel):
    id: int
    fullname: str
    identifier: str
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class InquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Sender's full name")
    email: str = Field(..., min_length=3, max_length=150, description="Sender's email address")
    subject: str = Field(..., min_length=2, max_length=200, description="Inquiry subject / query type")
    message: str = Field(..., min_length=5, description="Inquiry message details")

class InquiryResponse(BaseModel):
    id: int
    name: str
    email: str
    subject: str
    message: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None
