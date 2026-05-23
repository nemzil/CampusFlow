from beanie import Document
from pydantic import Field
from datetime import datetime, timezone
from typing import Optional
from enum import Enum
from pymongo import IndexModel, ASCENDING

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TodoSource(str, Enum):
    """Where the todo came from"""
    MANUAL = "manual"              # User created
    ASSIGNMENT = "assignment"      # Auto-generated from assignment
    EXAM = "exam"                  # Auto-generated from exam
    QUIZ = "quiz"                  # Auto-generated from quiz
    ATTENDANCE = "attendance"      # Auto-generated from attendance warning

# ---------------------------------------------------------
# The Document Model (Internal - Database)
# ---------------------------------------------------------
class Todo(Document):
    username: str  # Identifies which user owns this task
    title: str
    description: Optional[str] = None
    completed: bool = False
    priority: Priority = Priority.MEDIUM
    due_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Source tracking (for auto-generated todos)
    source: TodoSource = TodoSource.MANUAL
    source_id: Optional[str] = None  # ID of related assignment/exam/quiz
    source_course: Optional[str] = None  # Course name for context
    
    # Auto-generated todos can't be edited (only marked complete/deleted)
    is_auto_generated: bool = False

    class Settings:
        name = "todos"
        indexes = [
            IndexModel([("username", ASCENDING)]),
            IndexModel([("username", ASCENDING), ("completed", ASCENDING)]),
            IndexModel([("username", ASCENDING), ("due_date", ASCENDING)]),  # For sorting by due date
            IndexModel([("source", ASCENDING), ("source_id", ASCENDING)]),  # For linking
        ]
        keep_nulls = False
