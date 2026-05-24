from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from app.models.forum import (
    ForumChannel, ForumThread, ForumReply,
    ThreadCreate, ThreadUpdate, ThreadResponse,
    ReplyCreate, ReplyResponse,
    ChannelResponse
)
from app.models.user import User
from app.api.deps import get_current_user
from app.services import forum_service

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

async def get_current_user_object(username: str) -> User:
    """Get full user object from username"""
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ═══════════════════════════════════════════════════════════════════
# CHANNELS
# ═══════════════════════════════════════════════════════════════════

@router.get("/channels")
async def get_channels(
    current_user: str = Depends(get_current_user)
):
    """
    Get all course channels for current user
    Students see enrolled courses, teachers see teaching courses
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get channels
    channels = await forum_service.get_user_channels(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username
    )
    
    return {
        "channels": channels
    }

@router.get("/channels/{channel_id}/threads")
async def get_channel_threads(
    channel_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    pinned_only: bool = Query(False, description="Only return pinned threads"),
    current_user: str = Depends(get_current_user)
):
    """
    Get all threads in a channel with pagination
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check access
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to access this channel")
    
    # Get threads
    result = await forum_service.get_channel_threads(
        channel_id=channel_id,
        user_id=str(user.id),
        page=page,
        limit=limit,
        pinned_only=pinned_only
    )
    
    # Get channel info
    channel = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
    
    return {
        "channel_id": channel_id,
        "course_code": channel.course_code if channel else None,
        "threads": result["threads"],
        "total": result["total"],
        "page": result["page"],
        "pages": result["pages"]
    }

# ═══════════════════════════════════════════════════════════════════
# THREADS
# ═══════════════════════════════════════════════════════════════════

@router.post("/channels/{channel_id}/threads", status_code=status.HTTP_201_CREATED)
async def create_thread(
    channel_id: str,
    thread_data: ThreadCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Create new thread in channel
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check access
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to post in this channel")
    
    # Create thread
    author_name = f"{user.first_name} {user.last_name}"
    thread = await forum_service.create_thread(
        channel_id=channel_id,
        title=thread_data.title,
        content=thread_data.content,
        author_id=str(user.id),
        author_name=author_name,
        author_role=user.role.lower(),
        attachments=[att.model_dump() for att in thread_data.attachment_urls]
    )
    
    return {
        "thread_id": thread.thread_id,
        "channel_id": thread.channel_id,
        "title": thread.title,
        "author": {
            "user_id": thread.author_id,
            "name": thread.author_name,
            "role": thread.author_role
        },
        "created_at": thread.created_at,
        "message": "Thread created successfully"
    }

@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get thread with all replies
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check access to channel
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=thread.channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to view this thread")
    
    # Get thread with replies
    result = await forum_service.get_thread_with_replies(
        thread_id=thread_id,
        user_id=str(user.id)
    )
    
    return result

@router.put("/threads/{thread_id}")
async def update_thread(
    thread_id: str,
    update_data: ThreadUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update thread (author only)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check authorization (only author can edit)
    if thread.author_id != str(user.id):
        raise HTTPException(status_code=403, detail="You can only edit your own threads")
    
    # Update thread
    update_dict = update_data.model_dump(exclude_unset=True)
    if update_dict:
        from datetime import datetime, timezone
        update_dict["updated_at"] = datetime.now(timezone.utc)
        await thread.set(update_dict)
    
    return {
        "thread_id": thread_id,
        "message": "Thread updated successfully"
    }

@router.delete("/threads/{thread_id}")
async def delete_thread(
    thread_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete thread (soft delete)
    Author can delete own thread, teacher can delete any thread in their course
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Delete thread
    result = await forum_service.delete_thread(
        thread_id=thread_id,
        user_id=str(user.id),
        user_role=user.role
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# REPLIES
# ═══════════════════════════════════════════════════════════════════

@router.post("/threads/{thread_id}/replies", status_code=status.HTTP_201_CREATED)
async def create_reply(
    thread_id: str,
    reply_data: ReplyCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Add reply to thread
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Get thread to check channel access
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check access to channel
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=thread.channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to reply in this channel")
    
    # Create reply
    author_name = f"{user.first_name} {user.last_name}"
    reply = await forum_service.create_reply(
        thread_id=thread_id,
        content=reply_data.content,
        author_id=str(user.id),
        author_name=author_name,
        author_role=user.role.lower(),
        attachments=[att.model_dump() for att in reply_data.attachment_urls]
    )
    
    return {
        "reply_id": reply.reply_id,
        "thread_id": reply.thread_id,
        "author": {
            "user_id": reply.author_id,
            "name": reply.author_name,
            "role": reply.author_role
        },
        "created_at": reply.created_at,
        "message": "Reply posted successfully"
    }

@router.delete("/replies/{reply_id}")
async def delete_reply(
    reply_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Delete reply (soft delete)
    Author can delete own reply, teacher can delete any reply in their course
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Delete reply
    result = await forum_service.delete_reply(
        reply_id=reply_id,
        user_id=str(user.id),
        user_role=user.role
    )
    
    return result

# ═══════════════════════════════════════════════════════════════════
# PIN/UNPIN (TEACHER ONLY)
# ═══════════════════════════════════════════════════════════════════

@router.post("/threads/{thread_id}/pin")
async def pin_thread(
    thread_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Pin thread to top of channel (TEACHER ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check if teacher or admin
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers can pin threads")
    
    # Get thread to check if teaching this course
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if teaching this course (for teachers)
    if user.role == "TEACHER":
        has_access = await forum_service.check_channel_access(
            user_id=str(user.id),
            user_role=user.role,
            username=user.username,
            channel_id=thread.channel_id
        )
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Not authorized to pin threads in this channel")
    
    # Pin thread
    result = await forum_service.pin_thread(
        thread_id=thread_id,
        user_id=str(user.id)
    )
    
    return result

@router.delete("/threads/{thread_id}/pin")
async def unpin_thread(
    thread_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Unpin thread (TEACHER ONLY)
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check if teacher or admin
    if user.role not in ["TEACHER", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only teachers can unpin threads")
    
    # Get thread to check if teaching this course
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if teaching this course (for teachers)
    if user.role == "TEACHER":
        has_access = await forum_service.check_channel_access(
            user_id=str(user.id),
            user_role=user.role,
            username=user.username,
            channel_id=thread.channel_id
        )
        
        if not has_access:
            raise HTTPException(status_code=403, detail="Not authorized to unpin threads in this channel")
    
    # Unpin thread
    result = await forum_service.unpin_thread(thread_id=thread_id)
    
    return result

# ═══════════════════════════════════════════════════════════════════
# SEARCH
# ═══════════════════════════════════════════════════════════════════

@router.get("/channels/{channel_id}/search")
async def search_channel(
    channel_id: str,
    q: str = Query(..., min_length=1, description="Search query"),
    author: Optional[str] = Query(None, description="Filter by author name"),
    current_user: str = Depends(get_current_user)
):
    """
    Search threads and replies in channel
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check access
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to search this channel")
    
    # Search
    results = await forum_service.search_channel(
        channel_id=channel_id,
        query=q,
        author=author
    )
    
    return {
        "channel_id": channel_id,
        "query": q,
        "results": results,
        "total": len(results)
    }

# ═══════════════════════════════════════════════════════════════════
# READ STATUS
# ═══════════════════════════════════════════════════════════════════

@router.post("/threads/{thread_id}/mark-read")
async def mark_thread_read(
    thread_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Mark thread as read
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Mark as read
    await forum_service.mark_thread_as_read(
        user_id=str(user.id),
        thread_id=thread_id
    )
    
    return {
        "message": "Thread marked as read",
        "thread_id": thread_id
    }

@router.get("/channels/{channel_id}/unread-count")
async def get_unread_count(
    channel_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get unread thread count for channel
    """
    # Get user
    user = await get_current_user_object(current_user)
    
    # Check access
    has_access = await forum_service.check_channel_access(
        user_id=str(user.id),
        user_role=user.role,
        username=user.username,
        channel_id=channel_id
    )
    
    if not has_access:
        raise HTTPException(status_code=403, detail="Not authorized to access this channel")
    
    # Get unread count
    unread_count = await forum_service.get_unread_count(
        user_id=str(user.id),
        channel_id=channel_id
    )
    
    return {
        "channel_id": channel_id,
        "unread_count": unread_count
    }
