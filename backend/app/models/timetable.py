from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# Course Schedule Model
# ---------------------------------------------------------
class CourseSchedule(Document):
    # ═══ Schedule Details ═══
    schedule_id: str  # "SCH-001"
    course_code: str  # "CS-101T"
    semester: str  # "2024F"
    
    # ═══ Time & Location ═══
    day: str  # "monday", "tuesday", "wednesday", "thursday", "friday"
    period: int = Field(..., ge=1, le=9)  # 1-9
    time_start: str  # "08:00"
    time_end: str  # "09:00"
    room: str  # "301", "Lab 1"
    
    # ═══ Course Type ═══
    is_lab: bool = Field(default=False)  # Lab courses take 3 periods
    periods_span: int = Field(default=1)  # 1 for theory, 3 for lab
    
    # ═══ Metadata ═══
    created_by: str  # Admin username
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "course_schedules"
        indexes = [
            IndexModel([("schedule_id", ASCENDING)], unique=True),
            IndexModel([("course_code", ASCENDING), ("semester", ASCENDING)]),
            IndexModel([("day", ASCENDING), ("period", ASCENDING), ("room", ASCENDING), ("semester", ASCENDING)]),
            IndexModel([("semester", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class ScheduleSlot(BaseModel):
    """Schema for a single schedule slot"""
    day: str = Field(..., description="Day of week (monday-friday)")
    period: int = Field(..., ge=1, le=9, description="Period number (1-9)")
    room: str = Field(..., description="Room number or name")

class CourseScheduleCreate(BaseModel):
    """Schema for creating course schedule"""
    course_code: str = Field(..., description="Course code")
    semester: str = Field(..., description="Semester (e.g., 2024F)")
    schedule: List[ScheduleSlot] = Field(..., description="List of schedule slots")

class CourseScheduleUpdate(BaseModel):
    """Schema for updating schedule"""
    day: Optional[str] = None
    period: Optional[int] = Field(None, ge=1, le=9)
    room: Optional[str] = None

class TimetableSlot(BaseModel):
    """Schema for timetable slot"""
    period: int
    time: str
    course_code: Optional[str] = None
    course_name: Optional[str] = None
    room: Optional[str] = None
    teacher: Optional[str] = None
    color: Optional[str] = None
    is_lab: bool = False
    free: bool = True

class DayTimetable(BaseModel):
    """Schema for a day's timetable"""
    monday: List[TimetableSlot] = Field(default_factory=list)
    tuesday: List[TimetableSlot] = Field(default_factory=list)
    wednesday: List[TimetableSlot] = Field(default_factory=list)
    thursday: List[TimetableSlot] = Field(default_factory=list)
    friday: List[TimetableSlot] = Field(default_factory=list)

class TimetableResponse(BaseModel):
    """Schema for timetable response"""
    user_id: str
    user_type: str  # "student" or "teacher"
    semester: str
    timetable: DayTimetable

    class Config:
        from_attributes = True

class ConflictInfo(BaseModel):
    """Schema for schedule conflict"""
    type: str  # "room" or "teacher"
    message: str
    conflicting_course: Optional[str] = None

# Period timings mapping
PERIOD_TIMINGS = {
    1: ("08:00", "09:00"),
    2: ("09:00", "10:00"),
    3: ("10:00", "11:00"),
    4: ("11:00", "12:00"),
    5: ("12:00", "13:00"),
    6: ("13:00", "14:00"),
    7: ("14:00", "15:00"),
    8: ("15:00", "16:00"),
    9: ("16:00", "17:00"),
}

# Valid lab period ranges (3 consecutive periods)
VALID_LAB_PERIODS = [
    (1, 3),  # 08:00 - 11:00
    (4, 6),  # 11:00 - 14:00
    (7, 9),  # 14:00 - 17:00
]
