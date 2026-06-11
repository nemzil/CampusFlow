from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING

# ---------------------------------------------------------
# The Document Model (Interacts directly with MongoDB)
# ---------------------------------------------------------
class Course(Document):
    # ═══ Core Course Identity ═══
    course_code: str  # "SE102T", "SE102L" (unique)
    course_name: str  # "PROGRAMMING FUNDAMENTALS"
    course_type: str  # "core" or "elective"
    category: str  # "TH" (Theory) or "LAB" (Laboratory)
    
    # ═══ Academic Details ═══
    semester: int  # 1-8
    credit_hours: int  # 1 (lab), 2-3 (theory)
    prerequisites: List[str] = Field(default_factory=list)  # ["SE101T", "SE100T"]
    
    # ═══ Grading Configuration ═══
    max_marks: int  # 100 (TH), 50 (LAB)
    grading_scale: str  # "theory" or "lab"
    
    # ═══ Course Description ═══
    description: Optional[str] = None
    objectives: Optional[List[str]] = Field(default_factory=list)
    
    # ═══ Teacher Assignment ═══
    teacher_id: Optional[str] = None  # username of assigned teacher
    teacher_name: Optional[str] = None  # Full name for display
    
    # ═══ Term/Semester Offering ═══
<<<<<<< HEAD
    term: str  # Auto-resolved: "Fall" -> "2025F", "Spring" -> "2025S"
=======
    term: str  # "2024F", "2025S" (Fall/Spring)
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
    # ═══ Enrollment Management ═══
    max_students: int = 60  # Maximum enrollment capacity
    enrolled_count: int = 0  # Current enrollment count
    
    # ═══ Status ═══
    is_active: bool = True  # Active courses appear in registration
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # Admin username who created

    class Settings:
        name = "courses"
        indexes = [
            IndexModel([("course_code", ASCENDING), ("term", ASCENDING)], unique=True),
            IndexModel([("semester", ASCENDING), ("term", ASCENDING)]),
            IndexModel([("category", ASCENDING)]),
            IndexModel([("teacher_id", ASCENDING)]),
            IndexModel([("course_type", ASCENDING)]),
            IndexModel([("is_active", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas (Used for data validation)
# ---------------------------------------------------------

class CourseCreate(BaseModel):
    """Schema for creating a new course"""
    course_code: str
    course_name: str
    course_type: str  # "core" or "elective"
    category: str  # "TH" or "LAB"
    semester: int  # 1-8
    credit_hours: int
    prerequisites: List[str] = []
    description: Optional[str] = None
    objectives: Optional[List[str]] = []
<<<<<<< HEAD
    term: str  # "Fall" or "Spring" (auto-resolved to "2025F", "2025S")
=======
    term: str  # "2024F", "2025S"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    max_students: int = 60

class CourseUpdate(BaseModel):
    """Schema for updating course details"""
    course_name: Optional[str] = None
    course_type: Optional[str] = None
    category: Optional[str] = None
    semester: Optional[int] = None
    credit_hours: Optional[int] = None
    prerequisites: Optional[List[str]] = None
    description: Optional[str] = None
    objectives: Optional[List[str]] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None

class TeacherAssignment(BaseModel):
    """Schema for assigning teacher to course"""
    teacher_username: str

class CourseResponse(BaseModel):
    """Schema for course response"""
    course_code: str
    course_name: str
    course_type: str
    category: str
    semester: int
    credit_hours: int
    prerequisites: List[str]
    max_marks: int
    grading_scale: str
    description: Optional[str] = None
    objectives: Optional[List[str]] = []
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    term: str
    max_students: int
    enrolled_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
