from beanie import Document
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from pymongo import IndexModel, ASCENDING, DESCENDING

# ---------------------------------------------------------
# The Document Model (Interacts directly with MongoDB)
# ---------------------------------------------------------
class Announcement(Document):
    # ═══ Core Content ═══
    title: str
    content: str  # Rich HTML content
    
    # ═══ Categorization ═══
    category: str  # "general", "academic", "events", "rules", "emergency"
    
    # ═══ Author Information ═══
    author_id: str  # username of creator (admin)
    author_name: str  # Full name for display
    
    # ═══ Priority & Visibility ═══
    pinned: bool = False  # Pinned announcements appear at top
    deleted: bool = False  # Soft delete (archived)
    
    # ═══ Engagement Metrics ═══
    read_count: int = 0  # Number of users who marked as read
    read_by: List[str] = Field(default_factory=list)  # List of usernames who read
    
    # ═══ Metadata ═══
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "announcements"
        indexes = [
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("category", ASCENDING)]),
            IndexModel([("pinned", DESCENDING), ("created_at", DESCENDING)]),
            IndexModel([("deleted", ASCENDING)]),
            IndexModel([("author_id", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Pydantic Schemas (Used for data validation)
# ---------------------------------------------------------

class AnnouncementCreate(BaseModel):
    """Schema for creating a new announcement"""
    title: str = Field(..., min_length=10, description="Announcement title (min 10 chars)")
    content: str = Field(..., min_length=15, description="Rich HTML content (min 15 chars)")
    category: str = Field("general", description="Category: general, academic, events, rules, emergency")
    pinned: bool = Field(False, description="Pin to top")

class AnnouncementUpdate(BaseModel):
    """Schema for updating announcement"""
    title: Optional[str] = Field(None, min_length=10)
    content: Optional[str] = Field(None, min_length=15)
    category: Optional[str] = None
    pinned: Optional[bool] = None

class AnnouncementResponse(BaseModel):
    """Schema for announcement response"""
    announcement_id: str
    title: str
    content: str
    category: str
    author_id: str
    author_name: str
    pinned: bool
    deleted: bool
    read_count: int
    is_read: bool = False  # Whether current user has read it
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
