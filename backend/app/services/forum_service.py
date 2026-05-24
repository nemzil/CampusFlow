"""
Forum Service
Handles business logic for discussion forum
"""

from datetime import datetime, timezone
from typing import List, Dict, Optional
from fastapi import HTTPException
from app.models.forum import ForumChannel, ForumThread, ForumReply, ForumReadStatus
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
import uuid


def generate_thread_id() -> str:
    """Generate unique thread ID"""
    return f"THR-{uuid.uuid4().hex[:8].upper()}"


def generate_reply_id() -> str:
    """Generate unique reply ID"""
    return f"REP-{uuid.uuid4().hex[:8].upper()}"


def generate_channel_id(course_code: str, semester: str) -> str:
    """Generate channel ID from course code and semester"""
    return f"CH-{course_code}-{semester}"


async def create_channel_for_course(course: Course) -> ForumChannel:
    """
    Create forum channel for a course
    Called automatically when course is created
    
    Args:
        course: Course object
    
    Returns:
        ForumChannel object
    """
    channel_id = generate_channel_id(course.course_code, course.term)
    
    # Check if channel already exists
    existing = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
    if existing:
        return existing
    
    # Create new channel
    channel = ForumChannel(
        channel_id=channel_id,
        course_code=course.course_code,
        course_name=course.course_name,
        semester=course.term
    )
    
    await channel.insert()
    return channel


async def get_user_channels(user_id: str, user_role: str, username: str) -> List[Dict]:
    """
    Get all channels accessible to user
    
    Args:
        user_id: User's ID
        user_role: User's role (student, teacher, admin)
        username: User's username
    
    Returns:
        List of channels with metadata
    """
    channels = []
    
    if user_role == "STUDENT":
        # Get enrolled courses
        enrollments = await Enrollment.find(
            Enrollment.student_id == user_id,
            Enrollment.status == "ENROLLED"
        ).to_list()
        
        for enrollment in enrollments:
            channel_id = generate_channel_id(enrollment.course_code, enrollment.term)
            channel = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
            
            if channel:
                # Calculate unread count
                unread_count = await get_unread_count(user_id, channel_id)
                
                channels.append({
                    "channel_id": channel.channel_id,
                    "course_code": channel.course_code,
                    "course_name": channel.course_name,
                    "semester": channel.semester,
                    "unread_count": unread_count,
                    "last_activity": channel.last_activity,
                    "role": "student"
                })
    
    elif user_role == "TEACHER":
        # Get teaching courses
        courses = await Course.find(
            Course.teacher_id == username,
            Course.is_active == True
        ).to_list()
        
        for course in courses:
            channel_id = generate_channel_id(course.course_code, course.term)
            channel = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
            
            if channel:
                # Calculate unread count
                unread_count = await get_unread_count(user_id, channel_id)
                
                channels.append({
                    "channel_id": channel.channel_id,
                    "course_code": channel.course_code,
                    "course_name": channel.course_name,
                    "semester": channel.semester,
                    "unread_count": unread_count,
                    "last_activity": channel.last_activity,
                    "role": "teacher"
                })
    
    elif user_role == "ADMIN":
        # Get all channels
        all_channels = await ForumChannel.find().to_list()
        
        for channel in all_channels:
            channels.append({
                "channel_id": channel.channel_id,
                "course_code": channel.course_code,
                "course_name": channel.course_name,
                "semester": channel.semester,
                "unread_count": 0,
                "last_activity": channel.last_activity,
                "role": "admin"
            })
    
    # Sort by last activity
    channels.sort(key=lambda x: x["last_activity"], reverse=True)
    
    return channels


async def check_channel_access(user_id: str, user_role: str, username: str, channel_id: str) -> bool:
    """
    Check if user has access to channel
    
    Args:
        user_id: User's ID
        user_role: User's role
        username: User's username
        channel_id: Channel ID
    
    Returns:
        True if user has access, False otherwise
    """
    # Get channel
    channel = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
    if not channel:
        return False
    
    if user_role == "ADMIN":
        return True
    
    if user_role == "STUDENT":
        # Check if enrolled
        enrollment = await Enrollment.find_one(
            Enrollment.student_id == user_id,
            Enrollment.course_id == channel.course_code,
            Enrollment.status == "ENROLLED"
        )
        return enrollment is not None
    
    if user_role == "TEACHER":
        # Check if teaching
        course = await Course.find_one(
            Course.course_code == channel.course_code,
            Course.teacher_id == username
        )
        return course is not None
    
    return False


async def create_thread(
    channel_id: str,
    title: str,
    content: str,
    author_id: str,
    author_name: str,
    author_role: str,
    attachments: List[Dict]
) -> ForumThread:
    """
    Create new thread in channel
    
    Args:
        channel_id: Channel ID
        title: Thread title
        content: Thread content (HTML)
        author_id: Author's user ID
        author_name: Author's name
        author_role: Author's role
        attachments: List of attachments
    
    Returns:
        ForumThread object
    
    Raises:
        HTTPException: If validation fails
    """
    # Get channel
    channel = await ForumChannel.find_one(ForumChannel.channel_id == channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Validate attachments (max 5)
    if len(attachments) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 attachments allowed")
    
    # Generate thread ID
    thread_id = generate_thread_id()
    
    # Create thread
    thread = ForumThread(
        thread_id=thread_id,
        channel_id=channel_id,
        course_code=channel.course_code,
        title=title,
        content=content,
        author_id=author_id,
        author_name=author_name,
        author_role=author_role,
        attachments=attachments
    )
    
    await thread.insert()
    
    # Update channel last activity
    await channel.set({ForumChannel.last_activity: datetime.now(timezone.utc)})
    
    return thread


async def get_channel_threads(
    channel_id: str,
    user_id: str,
    page: int = 1,
    limit: int = 20,
    pinned_only: bool = False
) -> Dict:
    """
    Get threads in channel with pagination
    
    Args:
        channel_id: Channel ID
        user_id: User ID (for unread status)
        page: Page number
        limit: Items per page
        pinned_only: Only return pinned threads
    
    Returns:
        Dict with threads and pagination info
    """
    # Build query
    query = ForumThread.find(
        ForumThread.channel_id == channel_id,
        ForumThread.deleted == False
    )
    
    if pinned_only:
        query = query.find(ForumThread.pinned == True)
    
    # Get total count
    total = await query.count()
    
    # Sort: pinned first, then by last activity
    threads = await query.sort([
        ("pinned", -1),
        ("last_activity", -1)
    ]).skip((page - 1) * limit).limit(limit).to_list()
    
    # Build response
    result = []
    for thread in threads:
        # Check if unread
        read_status = await ForumReadStatus.find_one(
            ForumReadStatus.user_id == user_id,
            ForumReadStatus.thread_id == thread.thread_id
        )
        
        is_unread = (
            read_status is None or
            read_status.last_read_at < thread.last_activity
        )
        
        # Content preview (first 150 chars)
        content_preview = thread.content[:150] + "..." if len(thread.content) > 150 else thread.content
        
        result.append({
            "thread_id": thread.thread_id,
            "title": thread.title,
            "author": {
                "user_id": thread.author_id,
                "name": thread.author_name,
                "role": thread.author_role
            },
            "content_preview": content_preview,
            "reply_count": thread.reply_count,
            "last_activity": thread.last_activity,
            "created_at": thread.created_at,
            "pinned": thread.pinned,
            "has_attachments": len(thread.attachments) > 0,
            "unread": is_unread
        })
    
    return {
        "threads": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


async def get_thread_with_replies(thread_id: str, user_id: str) -> Dict:
    """
    Get thread with all replies
    
    Args:
        thread_id: Thread ID
        user_id: User ID (for marking as read)
    
    Returns:
        Dict with thread and replies
    
    Raises:
        HTTPException: If thread not found
    """
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread or thread.deleted:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Get replies
    replies = await ForumReply.find(
        ForumReply.thread_id == thread_id,
        ForumReply.deleted == False
    ).sort("created_at", 1).to_list()
    
    # Mark as read
    await mark_thread_as_read(user_id, thread_id)
    
    # Build response
    return {
        "thread_id": thread.thread_id,
        "channel_id": thread.channel_id,
        "course_code": thread.course_code,
        "title": thread.title,
        "author": {
            "user_id": thread.author_id,
            "name": thread.author_name,
            "role": thread.author_role
        },
        "content": thread.content,
        "attachments": thread.attachments,
        "created_at": thread.created_at,
        "pinned": thread.pinned,
        "replies": [
            {
                "reply_id": reply.reply_id,
                "author": {
                    "user_id": reply.author_id,
                    "name": reply.author_name,
                    "role": reply.author_role
                },
                "content": reply.content,
                "attachments": reply.attachments,
                "created_at": reply.created_at,
                "deleted": reply.deleted
            }
            for reply in replies
        ],
        "reply_count": thread.reply_count
    }


async def create_reply(
    thread_id: str,
    content: str,
    author_id: str,
    author_name: str,
    author_role: str,
    attachments: List[Dict]
) -> ForumReply:
    """
    Create reply to thread
    
    Args:
        thread_id: Thread ID
        content: Reply content (HTML)
        author_id: Author's user ID
        author_name: Author's name
        author_role: Author's role
        attachments: List of attachments
    
    Returns:
        ForumReply object
    
    Raises:
        HTTPException: If validation fails
    """
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread or thread.deleted:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Validate attachments (max 5)
    if len(attachments) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 attachments allowed")
    
    # Generate reply ID
    reply_id = generate_reply_id()
    
    # Create reply
    reply = ForumReply(
        reply_id=reply_id,
        thread_id=thread_id,
        channel_id=thread.channel_id,
        content=content,
        author_id=author_id,
        author_name=author_name,
        author_role=author_role,
        attachments=attachments
    )
    
    await reply.insert()
    
    # Update thread reply count and last activity
    await thread.set({
        ForumThread.reply_count: thread.reply_count + 1,
        ForumThread.last_activity: datetime.now(timezone.utc),
        ForumThread.updated_at: datetime.now(timezone.utc)
    })
    
    # Update channel last activity
    channel = await ForumChannel.find_one(ForumChannel.channel_id == thread.channel_id)
    if channel:
        await channel.set({ForumChannel.last_activity: datetime.now(timezone.utc)})
    
    return reply


async def delete_thread(thread_id: str, user_id: str, user_role: str) -> Dict:
    """
    Delete thread (soft delete)
    
    Args:
        thread_id: Thread ID
        user_id: User ID
        user_role: User role
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If not authorized
    """
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check authorization
    if user_role == "STUDENT" and thread.author_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own threads")
    
    # Soft delete
    await thread.set({
        ForumThread.deleted: True,
        ForumThread.deleted_by: user_id,
        ForumThread.deleted_at: datetime.now(timezone.utc)
    })
    
    return {
        "message": "Thread deleted successfully",
        "thread_id": thread_id
    }


async def delete_reply(reply_id: str, user_id: str, user_role: str) -> Dict:
    """
    Delete reply (soft delete)
    
    Args:
        reply_id: Reply ID
        user_id: User ID
        user_role: User role
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If not authorized
    """
    # Get reply
    reply = await ForumReply.find_one(ForumReply.reply_id == reply_id)
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    # Check authorization
    if user_role == "STUDENT" and reply.author_id != user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own replies")
    
    # Soft delete
    await reply.set({
        ForumReply.deleted: True,
        ForumReply.deleted_by: user_id,
        ForumReply.deleted_at: datetime.now(timezone.utc)
    })
    
    # Decrement thread reply count
    thread = await ForumThread.find_one(ForumThread.thread_id == reply.thread_id)
    if thread:
        await thread.set({
            ForumThread.reply_count: max(0, thread.reply_count - 1)
        })
    
    return {
        "message": "Reply deleted successfully",
        "reply_id": reply_id
    }


async def pin_thread(thread_id: str, user_id: str) -> Dict:
    """
    Pin thread to top of channel
    
    Args:
        thread_id: Thread ID
        user_id: User ID (teacher)
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If validation fails
    """
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Check if already pinned
    if thread.pinned:
        raise HTTPException(status_code=400, detail="Thread is already pinned")
    
    # Check max pinned threads (5 per channel)
    pinned_count = await ForumThread.find(
        ForumThread.channel_id == thread.channel_id,
        ForumThread.pinned == True
    ).count()
    
    if pinned_count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 threads can be pinned per channel")
    
    # Pin thread
    await thread.set({
        ForumThread.pinned: True,
        ForumThread.pinned_by: user_id,
        ForumThread.pinned_at: datetime.now(timezone.utc)
    })
    
    return {
        "message": "Thread pinned successfully",
        "thread_id": thread_id
    }


async def unpin_thread(thread_id: str) -> Dict:
    """
    Unpin thread
    
    Args:
        thread_id: Thread ID
    
    Returns:
        Success message
    
    Raises:
        HTTPException: If thread not found
    """
    # Get thread
    thread = await ForumThread.find_one(ForumThread.thread_id == thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Unpin thread
    await thread.set({
        ForumThread.pinned: False,
        ForumThread.pinned_by: None,
        ForumThread.pinned_at: None
    })
    
    return {
        "message": "Thread unpinned successfully",
        "thread_id": thread_id
    }


async def mark_thread_as_read(user_id: str, thread_id: str) -> None:
    """
    Mark thread as read for user
    
    Args:
        user_id: User ID
        thread_id: Thread ID
    """
    # Check if read status exists
    read_status = await ForumReadStatus.find_one(
        ForumReadStatus.user_id == user_id,
        ForumReadStatus.thread_id == thread_id
    )
    
    if read_status:
        # Update timestamp
        await read_status.set({
            ForumReadStatus.last_read_at: datetime.now(timezone.utc)
        })
    else:
        # Create new read status
        read_status = ForumReadStatus(
            user_id=user_id,
            thread_id=thread_id
        )
        await read_status.insert()


async def get_unread_count(user_id: str, channel_id: str) -> int:
    """
    Get unread thread count for user in channel
    
    Args:
        user_id: User ID
        channel_id: Channel ID
    
    Returns:
        Unread count
    """
    # Get all threads in channel
    threads = await ForumThread.find(
        ForumThread.channel_id == channel_id,
        ForumThread.deleted == False
    ).to_list()
    
    unread_count = 0
    
    for thread in threads:
        # Check if user has read this thread
        read_status = await ForumReadStatus.find_one(
            ForumReadStatus.user_id == user_id,
            ForumReadStatus.thread_id == thread.thread_id
        )
        
        if not read_status:
            # Never read
            unread_count += 1
        elif read_status.last_read_at < thread.last_activity:
            # Read but has new activity
            unread_count += 1
    
    return unread_count


async def search_channel(channel_id: str, query: str, author: Optional[str] = None) -> List[Dict]:
    """
    Search threads and replies in channel
    
    Args:
        channel_id: Channel ID
        query: Search query
        author: Optional author filter
    
    Returns:
        List of search results
    """
    results = []
    
    # Search threads
    thread_query = ForumThread.find(
        ForumThread.channel_id == channel_id,
        ForumThread.deleted == False
    )
    
    # Add text search if supported
    # Note: This requires text index on title and content fields
    threads = await thread_query.to_list()
    
    for thread in threads:
        # Simple text matching (can be improved with MongoDB text search)
        if query.lower() in thread.title.lower() or query.lower() in thread.content.lower():
            if author is None or thread.author_name.lower() == author.lower():
                results.append({
                    "type": "thread",
                    "thread_id": thread.thread_id,
                    "title": thread.title,
                    "content_snippet": thread.content[:150] + "...",
                    "author": thread.author_name,
                    "created_at": thread.created_at
                })
    
    # Search replies
    reply_query = ForumReply.find(
        ForumReply.channel_id == channel_id,
        ForumReply.deleted == False
    )
    
    replies = await reply_query.to_list()
    
    for reply in replies:
        if query.lower() in reply.content.lower():
            if author is None or reply.author_name.lower() == author.lower():
                # Get thread title
                thread = await ForumThread.find_one(ForumThread.thread_id == reply.thread_id)
                thread_title = thread.title if thread else "Unknown"
                
                results.append({
                    "type": "reply",
                    "thread_id": reply.thread_id,
                    "thread_title": thread_title,
                    "content_snippet": reply.content[:150] + "...",
                    "author": reply.author_name,
                    "created_at": reply.created_at
                })
    
    # Sort by relevance (created_at for now)
    results.sort(key=lambda x: x["created_at"], reverse=True)
    
    return results
