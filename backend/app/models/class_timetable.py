from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING
import uuid


def gen_tt_id() -> str:
    return f"TT-{uuid.uuid4().hex[:8].upper()}"


# ─────────────────────────────────────────────────────────────────────
# MongoDB Document
# ─────────────────────────────────────────────────────────────────────
class ClassTimetable(Document):
    tt_id: str = Field(default_factory=gen_tt_id)

    # admin-set fields
    department: str          # "Software Engineering"
    semester: int            # 1-8
    class_no: str            # "A", "B", "1", …
    teacher_username: str    # links to User.username
    teacher_name: str        # display name

    # schedule
    days: List[str]          # ["monday", "wednesday"]
    time_start: str          # "08:00"
    time_end: str            # "09:00"

    # optional course info
    subject: Optional[str] = None   # "Data Structures"

    # meta
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "class_timetables"
        indexes = [
            IndexModel([("tt_id", ASCENDING)], unique=True),
            IndexModel([("department", ASCENDING), ("semester", ASCENDING)]),
            IndexModel([("teacher_username", ASCENDING)]),
        ]
        keep_nulls = False


# ─────────────────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────────────────
class ClassTimetableCreate(BaseModel):
    department: str
    semester: int
    class_no: str
    teacher_username: str
    days: List[str]
    time_start: str
    time_end: str
    subject: Optional[str] = None


class ClassTimetableUpdate(BaseModel):
    department: Optional[str] = None
    semester: Optional[int] = None
    class_no: Optional[str] = None
    teacher_username: Optional[str] = None
    days: Optional[List[str]] = None
    time_start: Optional[str] = None
    time_end: Optional[str] = None
    subject: Optional[str] = None
