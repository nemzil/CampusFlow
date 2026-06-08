"""
Chat and messaging request and response schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# Request schemas
class SendMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    recipient_username: Optional[str] = None
    text: str


class EditMessageRequest(BaseModel):
    text: str


class StartGroupConversationRequest(BaseModel):
    participants: List[str]
    group_name: Optional[str] = None
    initial_message: str


class GetMessagesRequest(BaseModel):
    """
    Pagination parameters for fetching messages
    """
    limit: int = Field(default=50, ge=1, le=100)
    before_id: Optional[str] = None  # Cursor for pagination (message ID)
    after_id: Optional[str] = None
