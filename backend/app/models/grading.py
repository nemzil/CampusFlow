from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Grade Model
# ---------------------------------------------------------
class Grade(Document):
    # ═══ Student & Course ═══
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    course_id: str  # Reference to courses
    course_code: str  # "CS-101T"
    term: str  # "2024F"
    credit_hours: int  # 3
    
    # ═══ Component Marks ═══
    components: Dict[str, Optional[float]] = Field(default_factory=dict)
    # {
    #   "quiz1": 3.0,
    #   "quiz2": 2.5,
    #   "quiz3": 3.5,
    #   "assignment1": 2.5,
    #   "assignment2": 3.0,
    #   "assignment3": 4.0,
    #   "midterm": 25.0,
    #   "final": 43.0
    # }
    
    # ═══ Calculated Grade ═══
    total_marks: Optional[float] = None  # 86.5
    letter_grade: Optional[str] = None  # "A"
    grade_points: Optional[float] = None  # 4.0
    
    # ═══ Status ═══
    status: str = Field(default="CALCULATED")  # "CALCULATED", "PUBLISHED"
    is_complete: bool = Field(default=False)  # All components graded
    published_at: Optional[datetime] = None
    published_by: Optional[str] = None
    
    # ═══ Override ═══
    is_overridden: bool = Field(default=False)
    override_reason: Optional[str] = None
    overridden_by: Optional[str] = None
    overridden_at: Optional[datetime] = None
    original_marks: Optional[float] = None
    original_grade: Optional[str] = None
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "grades"
        indexes = [
            IndexModel([("student_id", ASCENDING), ("course_id", ASCENDING), ("term", ASCENDING)], unique=True),
            IndexModel([("course_id", ASCENDING), ("term", ASCENDING), ("status", ASCENDING)]),
            IndexModel([("student_id", ASCENDING), ("term", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Semester GPA Model
# ---------------------------------------------------------
class SemesterGPA(Document):
    # ═══ Student & Term ═══
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    term: str  # "2024F"
    
    # ═══ GPA Calculation ═══
    courses: List[Dict] = Field(default_factory=list)
    # [
    #   {
    #     "course_id": "...",
    #     "course_code": "CS-101T",
    #     "credit_hours": 3,
    #     "grade_points": 4.0
    #   }
    # ]
    semester_gpa: Optional[float] = None  # 3.77
    total_credits: int = Field(default=0)  # 5
    
    # ═══ Metadata ═══
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "semester_gpa"
        indexes = [
            IndexModel([("student_id", ASCENDING), ("term", ASCENDING)], unique=True),
            IndexModel([("term", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# CGPA Model
# ---------------------------------------------------------
class CGPA(Document):
    # ═══ Student ═══
    student_id: str  # Reference to users
    student_username: str  # "2024F-BSE-001"
    
    # ═══ CGPA Calculation ═══
    semesters: List[Dict] = Field(default_factory=list)
    # [
    #   {
    #     "term": "2024F",
    #     "gpa": 3.77,
    #     "credits": 5
    #   }
    # ]
    cgpa: Optional[float] = None  # 3.77
    total_credits: int = Field(default=0)  # 5
    credits_required: int = Field(default=130)  # For graduation
    
    # ═══ Metadata ═══
    calculated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "cgpa"
        indexes = [
            IndexModel([("student_id", ASCENDING)], unique=True),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class ComponentMarks(BaseModel):
    """Schema for component marks"""
    quiz1: Optional[float] = None
    quiz2: Optional[float] = None
    quiz3: Optional[float] = None
    assignment1: Optional[float] = None
    assignment2: Optional[float] = None
    assignment3: Optional[float] = None
    midterm: Optional[float] = None
    final: Optional[float] = None

class GradeResponse(BaseModel):
    """Schema for grade response"""
    student_id: str
    student_username: str
    course_code: str
    term: str
    components: Dict[str, Optional[float]]
    total_marks: Optional[float]
    letter_grade: Optional[str]
    grade_points: Optional[float]
    status: str
    is_complete: bool

    class Config:
        from_attributes = True

class GradeOverride(BaseModel):
    """Schema for admin grade override"""
    student_id: str = Field(..., description="Student ID")
    course_id: str = Field(..., description="Course ID")
    term: str = Field(..., description="Term")
    new_total_marks: float = Field(..., ge=0, le=100, description="New total marks")
    new_letter_grade: str = Field(..., description="New letter grade")
    new_grade_points: float = Field(..., ge=0, le=4, description="New grade points")
    reason: str = Field(..., description="Reason for override")

class SemesterGPAResponse(BaseModel):
    """Schema for semester GPA response"""
    student_id: str
    term: str
    courses: List[Dict]
    semester_gpa: Optional[float]
    total_credits: int

    class Config:
        from_attributes = True

class CGPAResponse(BaseModel):
    """Schema for CGPA response"""
    student_id: str
    semesters: List[Dict]
    cgpa: Optional[float]
    total_credits: int
    credits_required: int
    progress_percentage: float

    class Config:
        from_attributes = True

# GPA Scale mapping
GPA_SCALE = {
    (86, 100): ("A", 4.0),
    (80, 85): ("A-", 3.66),
    (75, 79): ("B+", 3.33),
    (70, 74): ("B", 3.0),
    (67, 69): ("B-", 2.66),
    (63, 66): ("C+", 2.33),
    (60, 62): ("C", 2.0),
    (57, 59): ("C-", 1.66),
    (54, 56): ("D+", 1.3),
    (50, 53): ("D", 1.0),
    (0, 49): ("F", 0.0),
}

def convert_to_letter_grade(total_marks: float) -> tuple:
    """
    Convert total marks to letter grade and GPA
    
    Args:
        total_marks: Total marks out of 100
    
    Returns:
        Tuple of (letter_grade, grade_points)
    """
    for (min_marks, max_marks), (letter, gpa) in GPA_SCALE.items():
        if min_marks <= total_marks <= max_marks:
            return (letter, gpa)
    
    # Default to F if not in range
    return ("F", 0.0)
