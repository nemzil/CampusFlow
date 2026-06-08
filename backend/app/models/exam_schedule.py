from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING
import uuid


def gen_schedule_id() -> str:
    return f"EXS-{uuid.uuid4().hex[:8].upper()}"


class ExamSchedule(Document):
    schedule_id: str = Field(default_factory=gen_schedule_id)

    # Academic identifiers
    department: str           # "Software Engineering"
    semester: int             # 1-8

    # Course info (denormalised from catalog)
    course_code: str          # "SE101T"
    course_name: str          # "Programming Fundamentals"

    # Invigilator
    invigilator_username: str
    invigilator_name: str     # display name

    # Exam schedule
    exam_date: str            # "2025-06-15"
    exam_day: str             # "monday" … "sunday"
    exam_time_start: str      # "09:00"
    exam_time_end: str        # "11:00"
    room_no: str              # "CS-101"

    # Meta
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "exam_schedules"
        indexes = [
            IndexModel([("schedule_id", ASCENDING)], unique=True),
            IndexModel([("department", ASCENDING), ("semester", ASCENDING)]),
            IndexModel([("course_code", ASCENDING)]),
            IndexModel([("invigilator_username", ASCENDING)]),
        ]
        keep_nulls = False


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ExamScheduleCreate(BaseModel):
    department: str
    semester: int
    course_code: str
    course_name: str
    invigilator_username: str
    exam_date: str
    exam_day: str
    exam_time_start: str
    exam_time_end: str
    room_no: str


class ExamScheduleUpdate(BaseModel):
    invigilator_username: Optional[str] = None
    exam_date: Optional[str] = None
    exam_day: Optional[str] = None
    exam_time_start: Optional[str] = None
    exam_time_end: Optional[str] = None
    room_no: Optional[str] = None
