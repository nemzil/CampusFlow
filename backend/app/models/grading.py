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
<<<<<<< HEAD
    term: str  # Auto-resolved: "Fall" -> "2025F", "Spring" -> "2025S"
=======
    term: str  # "2024F"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    credit_hours: int  # 3
    
    # ═══ Component Marks ═══
    components: Dict[str, Optional[float]] = Field(default_factory=lambda: {
        "quiz1": None, "quiz2": None, "quiz3": None,
        "assignment1": None, "assignment2": None, "assignment3": None,
        "midterm": None, "final": None
    })
    
    # Component max marks (for reference)
    midterm_max: Optional[int] = 30
    final_max: Optional[int] = 30
    
    # ═══ Calculated Grade ═══
    total_marks: Optional[float] = None  # 86.5
    letter_grade: Optional[str] = None  # "A"
    grade_points: Optional[float] = None  # 4.0
    
    # ═══ Status ═══
    status: str = Field(default="CALCULATED")  # "CALCULATED", "PUBLISHED"
<<<<<<< HEAD
    workflow_status: str = Field(default="DRAFT")  # DRAFT, SUBMITTED, EXAM_REVIEWED, PUBLISHED
    is_complete: bool = Field(default=False)  # All components graded
    component_feedback: Dict[str, Optional[str]] = Field(default_factory=dict)
    teacher_remarks: Optional[str] = None
    submitted_to_exam_at: Optional[datetime] = None
    submitted_by: Optional[str] = None
    exam_reviewed_at: Optional[datetime] = None
    exam_reviewed_by: Optional[str] = None
=======
    is_complete: bool = Field(default=False)  # All components graded
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
<<<<<<< HEAD
    term: str  # Auto-resolved: "Fall" -> "2025F", "Spring" -> "2025S"
=======
    term: str  # "2024F"
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    
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
    quiz1: Optional[float] = Field(None, ge=0, le=10)
    quiz2: Optional[float] = Field(None, ge=0, le=10)
    quiz3: Optional[float] = Field(None, ge=0, le=10)
    assignment1: Optional[float] = Field(None, ge=0, le=10)
    assignment2: Optional[float] = Field(None, ge=0, le=10)
    assignment3: Optional[float] = Field(None, ge=0, le=10)
    midterm: Optional[float] = Field(None, ge=0, le=50)
    final: Optional[float] = Field(None, ge=0, le=50)

class GradeResponse(BaseModel):
    """Schema for grade response"""
    student_id: str
    student_username: str
    course_code: str
    term: str
    quiz1: Optional[float]
    quiz2: Optional[float]
    quiz3: Optional[float]
    assignment1: Optional[float]
    assignment2: Optional[float]
    assignment3: Optional[float]
    midterm: Optional[float]
    midterm_max: int
    final: Optional[float]
    final_max: int
    total_marks: Optional[float]
    letter_grade: Optional[str]
    grade_points: Optional[float]
    status: str
    is_complete: bool

    class Config:
        from_attributes = True

<<<<<<< HEAD
class UpdateResultMarks(BaseModel):
    """Teacher/exam dept update for component marks and feedback"""
    student_id: str
    course_id: str
    term: str
    components: Optional[Dict[str, Optional[float]]] = None
    component_feedback: Optional[Dict[str, Optional[str]]] = None
    teacher_remarks: Optional[str] = None


=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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
