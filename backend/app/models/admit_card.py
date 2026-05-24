from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Admit Card Model
# ---------------------------------------------------------
class AdmitCard(Document):
    """Admit card record for student"""
    # ═══ Identification ═══
    admit_card_id: str  # "ADM-2024F-FINAL-001"
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    semester: str  # "2024F"
    exam_type: str  # "midterm", "final"
    
    # ═══ Eligibility ═══
    fee_status: str  # "paid", "pending"
    eligible_courses: List[Dict] = Field(default_factory=list)
    ineligible_courses: List[Dict] = Field(default_factory=list)
    
    # ═══ Admin Override ═══
    admin_override: Dict = Field(default_factory=lambda: {
        "enabled": False,
        "reason": None,
        "overridden_by": None,
        "overridden_at": None,
        "override_courses": []  # Empty = all courses, or specific course codes
    })
    
    # ═══ PDF & QR Code ═══
    pdf_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    
    # ═══ Metadata ═══
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    downloaded_at: Optional[datetime] = None
    is_valid: bool = Field(default=True)  # False if invalidated/regenerated

    class Settings:
        name = "admit_cards"
        indexes = [
            IndexModel([("student_id", ASCENDING), ("semester", ASCENDING), ("exam_type", ASCENDING)]),
            IndexModel([("admit_card_id", ASCENDING)], unique=True),
            IndexModel([("semester", ASCENDING), ("exam_type", ASCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
        ]
        keep_nulls = False


# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class EligibleCourse(BaseModel):
    """Schema for eligible course"""
    course_code: str
    course_name: str
    attendance_percentage: float
    exam_date: Optional[str] = None
    exam_time: Optional[str] = None
    room: Optional[str] = None

class IneligibleCourse(BaseModel):
    """Schema for ineligible course"""
    course_code: str
    course_name: str
    attendance_percentage: float
    reason: str

class EligibilityCheckResponse(BaseModel):
    """Schema for eligibility check response"""
    student_id: str
    student_username: str
    semester: str
    exam_type: str
    fee_status: str
    overall_eligible: bool
    eligible_courses: List[EligibleCourse]
    ineligible_courses: List[IneligibleCourse]
    admin_override: Optional[Dict] = None

class AdmitCardGenerateRequest(BaseModel):
    """Schema for admit card generation request"""
    student_id: str = Field(..., description="Student ID")
    semester: str = Field(..., description="Semester")
    exam_type: str = Field(..., description="Exam type: midterm or final")

class AdmitCardResponse(BaseModel):
    """Schema for admit card response"""
    admit_card_id: str
    student_id: str
    student_username: str
    semester: str
    exam_type: str
    eligible_courses: List[EligibleCourse]
    pdf_url: Optional[str] = None
    qr_code_url: Optional[str] = None
    generated_at: datetime

class AdmitCardHistoryItem(BaseModel):
    """Schema for admit card history item"""
    admit_card_id: str
    semester: str
    exam_type: str
    generated_at: datetime
    pdf_url: Optional[str] = None
    is_valid: bool

class AdmitCardHistoryResponse(BaseModel):
    """Schema for admit card history response"""
    student_id: str
    student_username: str
    admit_cards: List[AdmitCardHistoryItem]

class AdminOverrideRequest(BaseModel):
    """Schema for admin override request"""
    student_id: str = Field(..., description="Student ID")
    semester: str = Field(..., description="Semester")
    exam_type: str = Field(..., description="Exam type")
    reason: str = Field(..., min_length=10, description="Override reason (min 10 chars)")
    override_courses: List[str] = Field(default_factory=list, description="Specific courses to override (empty = all)")

class AdminOverrideResponse(BaseModel):
    """Schema for admin override response"""
    student_id: str
    semester: str
    exam_type: str
    overridden: bool
    overridden_by: str
    overridden_at: datetime
    reason: str
    message: str

class IneligibleStudentCourse(BaseModel):
    """Schema for ineligible student course"""
    course_code: str
    course_name: str
    attendance_percentage: float
    reason: str

class IneligibleStudent(BaseModel):
    """Schema for ineligible student"""
    student_id: str
    student_name: str
    registration_no: str
    ineligible_courses_count: int
    reasons: List[str]
    fee_status: str
    courses: List[IneligibleStudentCourse]

class IneligibleStudentsResponse(BaseModel):
    """Schema for ineligible students response"""
    semester: str
    exam_type: str
    ineligible_students: List[IneligibleStudent]
    total_ineligible: int
