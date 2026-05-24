from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT

# ---------------------------------------------------------
# Forum Channel Model
# ---------------------------------------------------------
class ForumChannel(Document):
    # ═══ Channel Details ═══
    channel_id: str  # "CH-CS-101T-2024F"
    course_code: str  # "CS-101T"
    course_name: str  # "Programming Fundamentals"
    semester: str  # "2024F"
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "forum_channels"
        indexes = [
            IndexModel([("channel_id", ASCENDING)], unique=True),
            IndexModel([("course_code", ASCENDING), ("semester", ASCENDING)], unique=True),
            IndexModel([("last_activity", DESCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Forum Thread Model
# ---------------------------------------------------------
class ForumThread(Document):
    # ═══ Thread Details ═══
    thread_id: str  # "THR-001"
    channel_id: str  # "CH-CS-101T-2024F"
    course_code: str  # "CS-101T"
    
    # ═══ Content ═══
    title: str = Field(..., max_length=200)
    content: str  # Rich HTML content
    
    # ═══ Author ═══
    author_id: str  # User ID
    author_name: str  # "Ahmed Ali"
    author_role: str  # "student", "teacher"
    
    # ═══ Attachments ═══
    attachments: List[dict] = Field(default_factory=list)
    # [{filename, url, type, size}]
    
    # ═══ Status ═══
    pinned: bool = Field(default=False)
    pinned_by: Optional[str] = None
    pinned_at: Optional[datetime] = None
    deleted: bool = Field(default=False)
    deleted_by: Optional[str] = None
    deleted_at: Optional[datetime] = None
    
    # ═══ Metadata ═══
    reply_count: int = Field(default=0)
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "forum_threads"
        indexes = [
            IndexModel([("thread_id", ASCENDING)], unique=True),
            IndexModel([("channel_id", ASCENDING), ("pinned", DESCENDING), ("last_activity", DESCENDING)]),
            IndexModel([("author_id", ASCENDING)]),
            IndexModel([("deleted", ASCENDING)]),
            IndexModel([("title", TEXT), ("content", TEXT)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Forum Reply Model
# ---------------------------------------------------------
class ForumReply(Document):
    # ═══ Reply Details ═══
    reply_id: str  # "REP-001"
    thread_id: str  # "THR-001"
    channel_id: str  # "CH-CS-101T-2024F"
    
    # ═══ Content ═══
    content: str  # Rich HTML content
    
    # ═══ Author ═══
    author_id: str  # User ID
    author_name: str  # "Dr. Sarah Khan"
    author_role: str  # "student", "teacher"
    
    # ═══ Attachments ═══
    attachments: List[dict] = Field(default_factory=list)
    # [{filename, url, type, size}]
    
    # ═══ Status ═══
    deleted: bool = Field(default=False)
    deleted_by: Optional[str] = None
    deleted_at: Optional[datetime] = None
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "forum_replies"
        indexes = [
            IndexModel([("reply_id", ASCENDING)], unique=True),
            IndexModel([("thread_id", ASCENDING), ("created_at", ASCENDING)]),
            IndexModel([("author_id", ASCENDING)]),
            IndexModel([("deleted", ASCENDING)]),
            IndexModel([("content", TEXT)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Forum Read Status Model
# ---------------------------------------------------------
class ForumReadStatus(Document):
    # ═══ Read Status ═══
    user_id: str  # User ID
    thread_id: str  # "THR-001"
    last_read_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "forum_read_status"
        indexes = [
            IndexModel([("user_id", ASCENDING), ("thread_id", ASCENDING)], unique=True),
            IndexModel([("thread_id", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------

class AttachmentSchema(BaseModel):
    """Schema for file attachment"""
    filename: str
    url: str
    type: str
    size: int

class ThreadCreate(BaseModel):
    """Schema for creating thread"""
    title: str = Field(..., min_length=1, max_length=200, description="Thread title")
    content: str = Field(..., min_length=1, description="Thread content (HTML)")
    attachment_urls: List[AttachmentSchema] = Field(default_factory=list, description="File attachments")

class ThreadUpdate(BaseModel):
    """Schema for updating thread"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)

class ThreadResponse(BaseModel):
    """Schema for thread response"""
    thread_id: str
    channel_id: str
    course_code: str
    title: str
    content: str
    author: dict
    attachments: List[dict]
    pinned: bool
    deleted: bool
    reply_count: int
    last_activity: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class ThreadListItem(BaseModel):
    """Schema for thread list item"""
    thread_id: str
    title: str
    author: dict
    content_preview: str
    reply_count: int
    last_activity: datetime
    created_at: datetime
    pinned: bool
    has_attachments: bool
    unread: bool = False

class ReplyCreate(BaseModel):
    """Schema for creating reply"""
    content: str = Field(..., min_length=1, description="Reply content (HTML)")
    attachment_urls: List[AttachmentSchema] = Field(default_factory=list, description="File attachments")

class ReplyResponse(BaseModel):
    """Schema for reply response"""
    reply_id: str
    thread_id: str
    content: str
    author: dict
    attachments: List[dict]
    deleted: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ChannelResponse(BaseModel):
    """Schema for channel response"""
    channel_id: str
    course_code: str
    course_name: str
    semester: str
    unread_count: int = 0
    last_activity: datetime
    role: str  # "student" or "teacher"

    class Config:
        from_attributes = True

class SearchResult(BaseModel):
    """Schema for search result"""
    type: str  # "thread" or "reply"
    thread_id: str
    title: Optional[str] = None  # For threads
    thread_title: Optional[str] = None  # For replies
    content_snippet: str
    author: str
    created_at: datetime
