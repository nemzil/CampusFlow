"""
Todo request and response schemas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime, timezone
from app.models.todo import Priority, TodoSource


# Request schemas
class CreateTodoRequest(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Priority = Priority.MEDIUM
    source: TodoSource = TodoSource.MANUAL
    source_course: Optional[str] = None
    source_id: Optional[str] = None


class UpdateTodoRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[Priority] = None
    completed: Optional[bool] = None


# Response schemas
class TodoResponse(BaseModel):
    id: str
    username: str
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Priority
    completed: bool
    source: TodoSource
    source_course: Optional[str] = None
    source_id: Optional[str] = None
    is_auto_generated: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields
    is_overdue: bool
    days_until_due: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TodoStatsResponse(BaseModel):
    total: int
    completed: int
    pending: int
    overdue: int
    due_today: int
    due_this_week: int
    by_priority: Dict[str, int]
    by_source: Dict[str, int]


# Helper function to convert Todo document to TodoResponse
def todo_to_response(doc) -> TodoResponse:
    """Convert a Todo document to a TodoResponse with computed fields"""
    from app.models.todo import Todo
    
    now = datetime.now(timezone.utc)
    
    # Calculate overdue status
    is_overdue = False
    days_until_due = None
    
    if doc.due_date and not doc.completed:
        # Make due_date timezone-aware if it isn't
        due_date = doc.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        
        is_overdue = due_date < now
        days_until_due = (due_date - now).days
    
    return TodoResponse(
        id=str(doc.id),
        username=doc.username,
        title=doc.title,
        description=doc.description,
        completed=doc.completed,
        priority=doc.priority,
        due_date=doc.due_date,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        source=doc.source,
        source_id=doc.source_id,
        source_course=doc.source_course,
        is_auto_generated=doc.is_auto_generated,
        is_overdue=is_overdue,
        days_until_due=days_until_due
    )
