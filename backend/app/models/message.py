from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime
from pymongo import IndexModel, ASCENDING, DESCENDING
from app.utils.datetime_utils import utc_now

# ---------------------------------------------------------
# Embedded Models
# ---------------------------------------------------------
class ParticipantMetadata(BaseModel):
    """
    Metadata for each participant in a conversation
    Tracks individual user's interaction with the conversation
    """
    username: str
    joined_at: datetime = Field(default_factory=utc_now)
    last_read_message_id: Optional[str] = None
    muted_until: Optional[datetime] = None
    archived: bool = False
    pinned: bool = False


class LastMessageInfo(BaseModel):
    """
    Cached information about the last message in a conversation
    Avoids querying messages collection for conversation list
    """
    id: str
    sender_username: str
    text: str
    timestamp: datetime


# ---------------------------------------------------------
# Document Models (Internal - Database)
# ---------------------------------------------------------
class Conversation(Document):
    participants: List[str]
    is_group: bool = False
    group_name: Optional[str] = None
    group_description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    
    # Enhanced metadata per participant
    participant_metadata: Dict[str, ParticipantMetadata] = Field(default_factory=dict)
    
    # Cached last message info for performance
    last_message: Optional[LastMessageInfo] = None
    updated_at: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "conversations"
        indexes = [
            IndexModel([("participants", ASCENDING)]),
            IndexModel([("updated_at", DESCENDING)]),
        ]
        keep_nulls = False


class Message(Document):
    conversation_id: PydanticObjectId
    sender_username: str
    text: str
    
    # Message status tracking
    status: str = "sent"  # sent, delivered, read
    delivered_to: List[str] = Field(default_factory=list)
    read_by: List[str] = Field(default_factory=list)
    
    # Timestamp tracking for delivery receipts
    delivered_at: Optional[datetime] = None  # When first delivered to any recipient
    read_at: Optional[datetime] = None       # When first read by any recipient
    
    # Edit and delete tracking
    deleted_by: List[str] = Field(default_factory=list)
    is_deleted_for_everyone: bool = False
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    
    timestamp: datetime = Field(default_factory=utc_now)

    class Settings:
        name = "messages"
        indexes = [
            IndexModel([("conversation_id", ASCENDING), ("timestamp", DESCENDING)]),
            IndexModel([("conversation_id", ASCENDING), ("status", ASCENDING)]),
        ]
        keep_nulls = False

# ---------------------------------------------------------
# Response Schemas (External - API)
# ---------------------------------------------------------
class UserInfo(BaseModel):
    """
    Basic user information included in chat responses
    Avoids separate API calls to fetch user details
    """
    username: str
    first_name: str
    last_name: str
    role: str
    profile_picture_url: Optional[str] = None
    registration_no: Optional[str] = None  # For students
    employee_id: Optional[str] = None      # For teachers
    email: Optional[str] = None
    department: Optional[str] = None
    is_online: Optional[bool] = False


class ConversationResponse(BaseModel):
    id: str
    participants: List[str]
    participant_info: List[UserInfo]  # Full user details
    is_group: bool
    group_name: Optional[str] = None
    group_description: Optional[str] = None
    created_by: Optional[str] = None
    
    # Last message info
    last_message: Optional[Dict] = None
    
    # Current user's metadata
    unread_count: int = 0
    is_muted: bool = False
    is_archived: bool = False
    is_pinned: bool = False
    
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_username: str
    sender_info: UserInfo  # Full sender details
    text: str
    
    # Status tracking
    status: str
    delivered_to: List[str]
    read_by: List[str]
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    # Edit and delete
    deleted_by: List[str]
    is_deleted_for_everyone: bool
    is_edited: bool
    edited_at: Optional[datetime] = None
    
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedMessagesResponse(BaseModel):
    """
    Paginated message list with cursor-based pagination
    """
    messages: List[MessageResponse]
    has_more: bool
    next_cursor: Optional[str] = None
    total_count: Optional[int] = None

# ---------------------------------------------------------
# Request Schemas (External - API)
# ---------------------------------------------------------
class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None  # String ID instead of PydanticObjectId
    recipient_username: Optional[str] = None  # To start a new 1:1 chat
    text: str

class EditMessageRequest(BaseModel):
    text: str

class StartGroupConversationRequest(BaseModel):
    participants: List[str]
    group_name: Optional[str] = None
    initial_message: str
