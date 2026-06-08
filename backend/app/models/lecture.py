from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING


class Lecture(Document):
    course_id: str
    course_code: str
    teacher_id: str
    teacher_name: str
    lecture_no: int
    topic: str
    description: Optional[str] = None
    file_url: str           # Cloudinary URL
    file_name: str          # Original filename
    expires_at: datetime    # 7 days after upload
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "lectures"
        indexes = [
            IndexModel([("course_id", ASCENDING), ("lecture_no", ASCENDING)]),
            IndexModel([("teacher_id", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)]),
        ]
        keep_nulls = False


# ── Pydantic schemas ──────────────────────────────────────────────

class LectureResponse(BaseModel):
    id: str
    course_id: str
    course_code: str
    teacher_name: str
    lecture_no: int
    topic: str
    description: Optional[str]
    file_url: str
    file_name: str
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
