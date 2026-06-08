from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId
from datetime import datetime, timezone

from app.models.todo import Todo, Priority, TodoSource
from app.schemas.todo import CreateTodoRequest, UpdateTodoRequest, TodoResponse, TodoStatsResponse, todo_to_response
from app.api.deps import get_current_user
from app.services.todo_service import get_todo_statistics

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# GET /api/todos/stats - Get todo statistics (MUST BE BEFORE /{todo_id})
# ═══════════════════════════════════════════════════════════════════
@router.get("/stats", response_model=TodoStatsResponse)
async def get_stats(username: str = Depends(get_current_user)):
    """
    Get statistics about user's todos
    """
    return await get_todo_statistics(username)


# ═══════════════════════════════════════════════════════════════════
# GET /api/todos - List todos with filtering and sorting
# ═══════════════════════════════════════════════════════════════════
@router.get("/", response_model=List[TodoResponse])
async def get_todos(
    username: str = Depends(get_current_user),
    completed: Optional[bool] = Query(None, description="Filter by completion status"),
    priority: Optional[Priority] = Query(None, description="Filter by priority"),
    source: Optional[TodoSource] = Query(None, description="Filter by source type"),
    sort_by: str = Query("due_date", description="Sort by: due_date, priority, created_at"),
    sort_order: str = Query("asc", description="Sort order: asc or desc")
):
    """
    Get user's todos with optional filtering and sorting
    """
    # Build query
    query = {"username": username}
    
    if completed is not None:
        query["completed"] = completed
    
    if priority:
        query["priority"] = priority
    
    if source:
        query["source"] = source
    
    # Build sort
    sort_field = sort_by if sort_by in ["due_date", "priority", "created_at"] else "due_date"
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Execute query
    todos = await Todo.find(query).sort([(sort_field, sort_direction)]).to_list()
    
    return [todo_to_response(todo) for todo in todos]


# ═══════════════════════════════════════════════════════════════════
# POST /api/todos - Create a new todo
# ═══════════════════════════════════════════════════════════════════
@router.post("/", response_model=TodoResponse)
async def create_todo(todo_in: CreateTodoRequest, username: str = Depends(get_current_user)):
    """Create a new manual todo"""
    new_todo = Todo(
        username=username,
        title=todo_in.title,
        description=todo_in.description,
        priority=todo_in.priority,
        due_date=todo_in.due_date,
        source=todo_in.source,
        source_course=todo_in.source_course,
        source_id=todo_in.source_id,
        completed=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    await new_todo.insert()
    return todo_to_response(new_todo)


# ═══════════════════════════════════════════════════════════════════
# GET /api/todos/{id} - Get single todo
# ═══════════════════════════════════════════════════════════════════
@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(todo_id: str, username: str = Depends(get_current_user)):
    """Get a single todo by ID"""
    try:
        oid = PydanticObjectId(todo_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid todo ID")
    
    todo = await Todo.get(oid)
    if not todo or todo.username != username:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    return todo_to_response(todo)


# ═══════════════════════════════════════════════════════════════════
# PUT /api/todos/{id} - Update a todo
# ═══════════════════════════════════════════════════════════════════
@router.put("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: str, 
    todo_in: UpdateTodoRequest, 
    username: str = Depends(get_current_user)
):
    """Update a todo (cannot update auto-generated todos)"""
    try:
        oid = PydanticObjectId(todo_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid todo ID")
    
    todo = await Todo.get(oid)
    if not todo or todo.username != username:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    if todo.is_auto_generated:
        raise HTTPException(status_code=403, detail="Cannot edit auto-generated todos")
    
    update_data = {}
    if todo_in.title is not None:
        update_data[Todo.title] = todo_in.title
    if todo_in.description is not None:
        update_data[Todo.description] = todo_in.description
    if todo_in.priority is not None:
        update_data[Todo.priority] = todo_in.priority
    if todo_in.due_date is not None:
        update_data[Todo.due_date] = todo_in.due_date
    if todo_in.completed is not None:
        update_data[Todo.completed] = todo_in.completed
    
    update_data[Todo.updated_at] = datetime.now(timezone.utc)
    
    await todo.set(update_data)
    await todo.sync()
    return todo_to_response(todo)


# ═══════════════════════════════════════════════════════════════════
# DELETE /api/todos/{id} - Delete a todo
# ═══════════════════════════════════════════════════════════════════
@router.delete("/{todo_id}")
async def delete_todo(todo_id: str, username: str = Depends(get_current_user)):
    """Delete a todo"""
    try:
        oid = PydanticObjectId(todo_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid todo ID")
    
    todo = await Todo.get(oid)
    if not todo or todo.username != username:
        raise HTTPException(status_code=404, detail="Todo not found")
    
    await todo.delete()
    return {"message": "Todo deleted"}
