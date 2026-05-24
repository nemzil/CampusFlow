from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Assignment Model
# ---------------------------------------------------------
class Assignment(Document):
    # ═══ Course & Teacher ═══
    course_id: str  # Reference to courses
    course_code: str  # "CS-101T" (denormalized)
    teacher_id: str  # Reference to users
    teacher_name: str  # Denormalized for quick access
    
    # ═══ Assignment Details ═══
    type: str  # "ASSIGNMENT", "QUIZ"
    number: int = Field(..., ge=1, le=3)  # 1, 2, or 3
    title: str
    description: str
    max_marks: int  # 3, 3, or 4 based on number
    deadline: datetime
    attachment_urls: List[str] = Field(default_factory=list)  # Cloudinary URLs
    
    # ═══ Status ═══
    status: str = Field(default="DRAFT")  # "DRAFT", "PUBLISHED"
    term: str  # "2024F"
    
    # ═══ Statistics ═══
    submission_count: int = Field(default=0)
    graded_count: int = Field(default=0)
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Teacher username

    class Settings:
        name = "assignments"
        indexes = [
            IndexModel([("course_id", ASCENDING), ("type", ASCENDING), ("number", ASCENDING)], unique=True),
            IndexModel([("teacher_id", ASCENDING), ("term", ASCENDING)]),
            IndexModel([("deadline", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("course_id", ASCENDING), ("status", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Submission Model
# ---------------------------------------------------------
class Submission(Document):
    # ═══ Assignment & Student ═══
    assignment_id: str  # Reference to assignments
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    course_id: str  # Reference to courses
    
    # ═══ Submission Data ═══
    file_url: Optional[str] = None  # Cloudinary URL
    text_answer: Optional[str] = None
    comments: Optional[str] = None
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_late: bool = Field(default=False)
    
    # ═══ Grading ═══
    status: str = Field(default="SUBMITTED")  # "SUBMITTED", "GRADED"
    marks_obtained: Optional[float] = None
    max_marks: int  # Denormalized from assignment
    feedback: Optional[str] = None
    graded_at: Optional[datetime] = None
    graded_by: Optional[str] = None  # Teacher username
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "submissions"
        indexes = [
            IndexModel([("assignment_id", ASCENDING), ("student_id", ASCENDING)], unique=True),
            IndexModel([("student_id", ASCENDING), ("course_id", ASCENDING)]),
            IndexModel([("assignment_id", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("submitted_at", DESCENDING)]),
            IndexModel([("student_username", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class AssignmentCreate(BaseModel):
    """Schema for creating assignment/quiz"""
    course_id: str = Field(..., description="Course ID")
    type: str = Field(..., description="ASSIGNMENT or QUIZ")
    number: int = Field(..., ge=1, le=3, description="Assignment/Quiz number (1, 2, or 3)")
    title: str = Field(..., min_length=1, max_length=200, description="Assignment title")
    description: str = Field(..., description="Assignment description")
    deadline: datetime = Field(..., description="Submission deadline")
    attachment_urls: List[str] = Field(default_factory=list, description="Cloudinary URLs for attachments")
    status: str = Field(default="DRAFT", description="DRAFT or PUBLISHED")

class AssignmentUpdate(BaseModel):
    """Schema for updating assignment"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    attachment_urls: Optional[List[str]] = None
    status: Optional[str] = None

class AssignmentResponse(BaseModel):
    """Schema for assignment response"""
    id: str
    course_id: str
    course_code: str
    teacher_id: str
    teacher_name: str
    type: str
    number: int
    title: str
    description: str
    max_marks: int
    deadline: datetime
    attachment_urls: List[str]
    status: str
    term: str
    submission_count: int
    graded_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubmissionCreate(BaseModel):
    """Schema for creating submission"""
    file_url: Optional[str] = Field(None, description="Cloudinary URL for uploaded file")
    text_answer: Optional[str] = Field(None, description="Text answer")
    comments: Optional[str] = Field(None, description="Optional comments")

class SubmissionResponse(BaseModel):
    """Schema for submission response"""
    id: str
    assignment_id: str
    student_id: str
    student_username: str
    file_url: Optional[str]
    text_answer: Optional[str]
    comments: Optional[str]
    submitted_at: datetime
    is_late: bool
    status: str
    marks_obtained: Optional[float]
    max_marks: int
    feedback: Optional[str]
    graded_at: Optional[datetime]
    graded_by: Optional[str]

    class Config:
        from_attributes = True

class GradeSubmission(BaseModel):
    """Schema for grading submission"""
    marks_obtained: float = Field(..., ge=0, description="Marks obtained (must be >= 0)")
    feedback: Optional[str] = Field(None, description="Feedback for student")

class BulkGrade(BaseModel):
    """Schema for bulk grading"""
    submission_id: str
    marks_obtained: float = Field(..., ge=0)
    feedback: Optional[str] = None

class BulkGradeRequest(BaseModel):
    """Schema for bulk grading request"""
    grades: List[BulkGrade]
