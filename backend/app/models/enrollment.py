from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Registration Window Model
# ---------------------------------------------------------
class RegistrationWindow(Document):
    # ═══ Window Details ═══
    semester: int = Field(..., ge=1, le=8)  # 1-8
<<<<<<< HEAD
    term: str  # Auto-resolved: "Fall" -> "2025F", "Spring" -> "2025S"
=======
    term: str  # "2024F", "2025S"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    start_date: datetime
    end_date: datetime
    status: str = Field(default="OPEN")  # "OPEN", "CLOSED"
    
    # ═══ Metadata ═══
    created_by: str  # Admin username
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None

    class Settings:
        name = "registration_windows"
        indexes = [
            IndexModel([("term", ASCENDING)], unique=True),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("start_date", DESCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Enrollment Model
# ---------------------------------------------------------
class Enrollment(Document):
    # ═══ Student & Course ═══
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    course_id: str  # Reference to courses
    course_code: str  # "CS-101T" (denormalized for quick access)
<<<<<<< HEAD
    term: str  # Auto-resolved: "Fall" -> "2025F"
=======
    term: str  # "2024F"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # ═══ Status ═══
    status: str = Field(default="ENROLLED")  # "ENROLLED", "DROPPED", "COMPLETED"
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    dropped_at: Optional[datetime] = None
    
    # ═══ Admin Override ═══
    is_forced: bool = Field(default=False)  # Admin forced enrollment
    force_reason: Optional[str] = None
    forced_by: Optional[str] = None
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "enrollments"
        indexes = [
            IndexModel([("student_id", ASCENDING), ("term", ASCENDING)]),
            IndexModel([("course_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("student_id", ASCENDING), ("course_id", ASCENDING), ("term", ASCENDING)], unique=True),
            IndexModel([("term", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class RegistrationWindowCreate(BaseModel):
    """Schema for creating registration window"""
    semester: int = Field(..., ge=1, le=8, description="Semester number (1-8)")
<<<<<<< HEAD
    term: str = Field(..., description="Term: 'Fall' or 'Spring' (auto-resolved with current year)")
=======
    term: str = Field(..., description="Term (e.g., 2024F, 2025S)")
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    start_date: datetime = Field(..., description="Registration start date")
    end_date: datetime = Field(..., description="Registration end date")

class RegistrationWindowResponse(BaseModel):
    """Schema for registration window response"""
    id: str
    semester: int
    term: str
    start_date: datetime
    end_date: datetime
    status: str
    created_by: str
    created_at: datetime
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    """Schema for student enrollment"""
    course_id: str = Field(..., description="Course ID to enroll in")

class EnrollmentResponse(BaseModel):
    """Schema for enrollment response"""
    id: str
    student_id: str
    student_username: str
    course_id: str
    course_code: str
    term: str
    status: str
    enrolled_at: datetime
    dropped_at: Optional[datetime] = None
    is_forced: bool = False

    class Config:
        from_attributes = True

class ForceEnrollmentCreate(BaseModel):
    """Schema for admin force enrollment"""
    student_id: str = Field(..., description="Student ID to enroll")
    course_id: str = Field(..., description="Course ID")
    reason: str = Field(..., description="Reason for forced enrollment")

class RemoveEnrollmentRequest(BaseModel):
    """Schema for admin removing enrollment"""
    enrollment_id: str = Field(..., description="Enrollment ID to remove")
    reason: str = Field(..., description="Reason for removal")
