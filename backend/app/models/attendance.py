from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, date
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Attendance Session Model
# ---------------------------------------------------------
class AttendanceSession(Document):
    # ═══ Session Details ═══
    course_id: str  # Reference to courses
    course_code: str  # "CS-101T" (denormalized)
    teacher_id: str  # Reference to users
    date: date  # Session date
    periods: List[int]  # [1] or [1,2,3] for lab
    session_type: str  # "LECTURE", "LAB", "TUTORIAL"
    term: str  # "2024F"
    
    # ═══ Status ═══
    is_locked: bool = Field(default=False)  # Admin locked
    locked_at: Optional[datetime] = None
    locked_by: Optional[str] = None
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Teacher username

    class Settings:
        name = "attendance_sessions"
        indexes = [
            IndexModel([("course_id", ASCENDING), ("date", ASCENDING), ("periods", ASCENDING)], unique=True),
            IndexModel([("teacher_id", ASCENDING), ("term", ASCENDING)]),
            IndexModel([("date", DESCENDING)]),
            IndexModel([("is_locked", ASCENDING)]),
            IndexModel([("course_id", ASCENDING), ("date", DESCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Attendance Record Model
# ---------------------------------------------------------
class AttendanceRecord(Document):
    # ═══ Record Details ═══
    session_id: str  # Reference to attendance_sessions
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    course_id: str  # Reference to courses
    date: date  # Session date (denormalized)
    periods: List[int]  # [1] or [1,2,3]
    status: str = Field(default="ABSENT")  # "PRESENT", "ABSENT"
    
    # ═══ Metadata ═══
    marked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    marked_by: str  # Teacher username
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "attendance_records"
        indexes = [
            IndexModel([("session_id", ASCENDING), ("student_id", ASCENDING)], unique=True),
            IndexModel([("student_id", ASCENDING), ("course_id", ASCENDING)]),
            IndexModel([("course_id", ASCENDING), ("date", DESCENDING)]),
            IndexModel([("student_id", ASCENDING), ("date", DESCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class AttendanceSessionCreate(BaseModel):
    """Schema for creating attendance session"""
    course_id: str = Field(..., description="Course ID")
    session_date: date = Field(..., description="Session date")
    periods: List[int] = Field(..., description="Period numbers (1-9)")
    session_type: str = Field(..., description="LECTURE, LAB, or TUTORIAL")

class AttendanceMarkRequest(BaseModel):
    """Schema for marking attendance"""
    student_id: str
    status: str = Field(..., description="PRESENT or ABSENT")

class AttendanceMarkBulkRequest(BaseModel):
    """Schema for bulk marking attendance"""
    attendance: List[AttendanceMarkRequest]

class AttendanceMarkAllRequest(BaseModel):
    """Schema for marking all students"""
    status: str = Field(..., description="PRESENT or ABSENT")

class AttendanceLockRequest(BaseModel):
    """Schema for locking attendance"""
    course_id: str
    term: str

class AttendanceUnlockRequest(BaseModel):
    """Schema for unlocking attendance"""
    course_id: str
    reason: str

class AttendanceSessionResponse(BaseModel):
    """Schema for session response"""
    id: str
    course_id: str
    course_code: str
    date: date
    periods: List[int]
    session_type: str
    is_locked: bool
    present_count: int = 0
    absent_count: int = 0
    total_students: int = 0

    class Config:
        from_attributes = True

class AttendanceRecordResponse(BaseModel):
    """Schema for attendance record response"""
    student_id: str
    registration_no: str
    student_name: str
    status: str

    class Config:
        from_attributes = True

class StudentAttendanceSummary(BaseModel):
    """Schema for student attendance summary"""
    course_code: str
    course_name: str
    total_sessions: int
    present_count: int
    absent_count: int
    attendance_percentage: float
    meets_requirement: bool  # >= 75%
    sessions_needed: int  # To reach 75%

class AttendanceReportStudent(BaseModel):
    """Schema for student in attendance report"""
    registration_no: str
    student_name: str
    present: int
    absent: int
    percentage: float
    meets_requirement: bool
