from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Assignment Question (for AI-generated assignments)
# ---------------------------------------------------------
class AssignmentQuestion(BaseModel):
    id: int
    question: str
    original_question: Optional[str] = None  # for undo support
    max_marks: int = Field(default=5)

# ---------------------------------------------------------
# Assignment Model
# ---------------------------------------------------------
class Assignment(Document):
    # ═══ Course & Teacher ═══
    course_id: str
    course_code: str
    teacher_id: str
    teacher_name: str
    
    # ═══ Assignment Details ═══
    type: str  # "ASSIGNMENT", "QUIZ"
    number: int = Field(..., ge=1, le=3)
    title: str
    description: str
    max_marks: int
    deadline: datetime
    attachment_urls: List[str] = Field(default_factory=list)
    
    # ═══ Creation Mode ═══
    creation_mode: str = Field(default="MANUAL")  # "MANUAL" or "AI"
    questions: List[AssignmentQuestion] = Field(default_factory=list)  # AI-generated questions
    
    # ═══ Status ═══
    status: str = Field(default="DRAFT")  # "DRAFT", "PUBLISHED"
    term: str
    
    # ═══ Statistics ═══
    submission_count: int = Field(default=0)
    graded_count: int = Field(default=0)
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

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
    creation_mode: str = Field(default="MANUAL", description="MANUAL or AI")
    questions: List[Any] = Field(default_factory=list, description="AI-generated questions")

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

class AiGenerateAssignmentRequest(BaseModel):
    """Schema for AI assignment generation"""
    title: str = Field(..., min_length=1, max_length=200)
    num_questions: int = Field(..., ge=1, le=20)
    course_id: str
    type: str = Field(..., description="ASSIGNMENT or QUIZ")
    number: int = Field(..., ge=1, le=3)
    deadline: datetime
    status: str = Field(default="DRAFT")

class UpdateAssignmentQuestionRequest(BaseModel):
    """Schema for updating a single AI-generated question"""
    question: str = Field(..., min_length=1)
