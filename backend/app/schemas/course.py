from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════
# Request Schemas
# ═══════════════════════════════════════════════════════════════════

class CourseCreate(BaseModel):
    """Schema for creating a new course"""
    course_code: str = Field(..., description="Unique course code (e.g., SE102T)")
    course_name: str = Field(..., description="Course name")
    course_type: str = Field(..., description="core or elective")
    category: str = Field(..., description="TH or LAB")
    semester: int = Field(..., ge=1, le=8, description="Semester number (1-8)")
    credit_hours: int = Field(..., ge=1, le=3, description="Credit hours (1-3)")
    prerequisites: List[str] = Field(default_factory=list, description="List of prerequisite course codes")
    description: Optional[str] = Field(None, description="Course description")
    objectives: Optional[List[str]] = Field(default_factory=list, description="Learning objectives")
    term: str = Field(..., description="Term (e.g., 2024F, 2025S)")
    max_students: int = Field(60, ge=1, description="Maximum enrollment capacity")

class CourseUpdate(BaseModel):
    """Schema for updating course details"""
    course_name: Optional[str] = None
    course_type: Optional[str] = None
    category: Optional[str] = None
    semester: Optional[int] = Field(None, ge=1, le=8)
    credit_hours: Optional[int] = Field(None, ge=1, le=3)
    prerequisites: Optional[List[str]] = None
    description: Optional[str] = None
    objectives: Optional[List[str]] = None
    max_students: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

class TeacherAssignment(BaseModel):
    """Schema for assigning teacher to course"""
    teacher_username: str = Field(..., description="Username of teacher to assign")

# ═══════════════════════════════════════════════════════════════════
# Response Schemas
# ═══════════════════════════════════════════════════════════════════

class CourseResponse(BaseModel):
    """Schema for course response"""
    id: str
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
    created_by: Optional[str] = None

    class Config:
        from_attributes = True
