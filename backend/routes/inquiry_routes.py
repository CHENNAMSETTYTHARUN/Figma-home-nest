from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Inquiry
from backend.schemas import InquiryCreate, InquiryResponse

router = APIRouter(prefix="/api", tags=["Inquiries & Contact Messages"])

@router.post("/inquiries", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
@router.post("/contact", response_model=InquiryResponse, status_code=status.HTTP_201_CREATED)
def create_inquiry(payload: InquiryCreate, db: Session = Depends(get_db)):
    """
    Save a new customer message / inquiry directly into the MySQL database.
    """
    name = payload.name.strip()
    email = payload.email.strip().lower()
    subject = payload.subject.strip()
    message = payload.message.strip()

    if len(name) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name must be at least 2 characters.")
    if "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please provide a valid email address.")
    if len(subject) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject must be at least 2 characters.")
    if len(message) < 5:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message must be at least 5 characters.")

    new_inquiry = Inquiry(
        name=name,
        email=email,
        subject=subject,
        message=message,
        status="New"
    )

    db.add(new_inquiry)
    db.commit()
    db.refresh(new_inquiry)

    print(f"[Inquiry Received] From: {name} ({email}) - Subject: {subject} (Saved with ID: {new_inquiry.id})")

    return InquiryResponse.model_validate(new_inquiry)

@router.get("/inquiries", response_model=List[InquiryResponse])
def list_inquiries(db: Session = Depends(get_db)):
    """
    Retrieve all inquiries / messages from MySQL database in reverse chronological order.
    """
    inquiries = db.query(Inquiry).order_by(Inquiry.created_at.desc()).all()
    return [InquiryResponse.model_validate(item) for item in inquiries]

@router.get("/inquiries/{inquiry_id}", response_model=InquiryResponse)
def get_inquiry(inquiry_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific inquiry by ID.
    """
    item = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inquiry not found")
    return InquiryResponse.model_validate(item)
