"""
Todo Service Layer
Business logic for todo operations
"""
from datetime import datetime, timezone
from typing import Optional
from app.models.todo import Todo, TodoSource, Priority


async def create_auto_todo(
    username: str,
    title: str,
    description: str,
    due_date: datetime,
    source: TodoSource,
    source_id: str,
    source_course: Optional[str] = None,
    priority: Priority = Priority.MEDIUM
) -> Todo:
    """
    Create an auto-generated todo from another module (assignment, exam, etc.)
    
    Args:
        username: User who owns the todo
        title: Todo title
        description: Todo description
        due_date: When the todo is due
        source: Source type (assignment, exam, quiz, attendance)
        source_id: ID of the source entity
        source_course: Optional course name for context
        priority: Priority level (default: MEDIUM)
    
    Returns:
        Created or updated Todo document
    
    Note:
        If a todo already exists for this source, it will be updated instead of creating a duplicate
    """
    # Check if todo already exists for this source
    existing = await Todo.find_one(
        Todo.username == username,
        Todo.source == source,
        Todo.source_id == source_id
    )
    
    if existing:
        # Update existing todo instead of creating duplicate
        existing.title = title
        existing.description = description
        existing.due_date = due_date
        existing.priority = priority
        existing.source_course = source_course
        await existing.save()
        return existing
    
    # Create new auto-generated todo
    todo = Todo(
        username=username,
        title=title,
        description=description,
        due_date=due_date,
        priority=priority,
        source=source,
        source_id=source_id,
        source_course=source_course,
        is_auto_generated=True,
        completed=False
    )
    
    await todo.insert()
    return todo


async def delete_auto_todos_by_source(source: TodoSource, source_id: str) -> int:
    """
    Delete all auto-generated todos linked to a specific source
    
    Args:
        source: Source type (assignment, exam, quiz, attendance)
        source_id: ID of the source entity
    
    Returns:
        Number of todos deleted
    
    Usage:
        - When assignment is deleted: delete_auto_todos_by_source(TodoSource.ASSIGNMENT, assignment_id)
        - When exam is cancelled: delete_auto_todos_by_source(TodoSource.EXAM, exam_id)
    """
    result = await Todo.find(
        Todo.source == source,
        Todo.source_id == source_id,
        Todo.is_auto_generated == True
    ).delete()
    
    return result.deleted_count if result else 0


async def get_todo_statistics(username: str) -> dict:
    """
    Calculate statistics about user's todos
    
    Args:
        username: User to get statistics for
    
    Returns:
        Dictionary with todo counts and breakdowns
    """
    from datetime import timedelta
    
    all_todos = await Todo.find(Todo.username == username).to_list()
    
    now = datetime.now(timezone.utc)
    today_end = now.replace(hour=23, minute=59, second=59)
    week_end = now + timedelta(days=7)
    
    stats = {
        "total": len(all_todos),
        "completed": sum(1 for t in all_todos if t.completed),
        "pending": sum(1 for t in all_todos if not t.completed),
        "overdue": 0,
        "due_today": 0,
        "due_this_week": 0,
        "by_priority": {
            "high": sum(1 for t in all_todos if t.priority == Priority.HIGH and not t.completed),
            "medium": sum(1 for t in all_todos if t.priority == Priority.MEDIUM and not t.completed),
            "low": sum(1 for t in all_todos if t.priority == Priority.LOW and not t.completed),
        },
        "by_source": {
            "manual": sum(1 for t in all_todos if t.source == TodoSource.MANUAL),
            "assignment": sum(1 for t in all_todos if t.source == TodoSource.ASSIGNMENT),
            "exam": sum(1 for t in all_todos if t.source == TodoSource.EXAM),
            "quiz": sum(1 for t in all_todos if t.source == TodoSource.QUIZ),
            "attendance": sum(1 for t in all_todos if t.source == TodoSource.ATTENDANCE),
        }
    }
    
    # Calculate time-based stats
    for todo in all_todos:
        if todo.completed or not todo.due_date:
            continue
        
        due_date = todo.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        
        if due_date < now:
            stats["overdue"] += 1
        elif due_date <= today_end:
            stats["due_today"] += 1
        elif due_date <= week_end:
            stats["due_this_week"] += 1
    
    return stats
