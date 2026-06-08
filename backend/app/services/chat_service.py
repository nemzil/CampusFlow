"""
Chat service - Business logic for messaging system
"""
from typing import List, Optional, Dict
from beanie import PydanticObjectId
from beanie.operators import NotIn
from datetime import datetime

from app.models.message import (
    Conversation, Message, ParticipantMetadata, 
    LastMessageInfo, UserInfo, MessageResponse, 
    ConversationResponse, PaginatedMessagesResponse
)
from app.models.user import User
from app.utils.datetime_utils import utc_now


async def get_user_info(username: str) -> Optional[UserInfo]:
    """
    Fetch basic user information for chat display
    """
    user = await User.find_one(User.username == username)
    if not user:
        return None
    
    from app.services.websocket_manager import manager
    is_online = manager.is_user_online(username)
    
    return UserInfo(
        username=user.username,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        profile_picture_url=user.profile_picture_url,
        registration_no=user.registration_no if hasattr(user, 'registration_no') else None,
        employee_id=user.employee_id if hasattr(user, 'employee_id') else None,
        email=user.email,
        department=user.department if hasattr(user, 'department') else None,
        is_online=is_online
    )


async def get_users_info(usernames: List[str]) -> Dict[str, UserInfo]:
    """
    Fetch user info for multiple users
    Returns dict mapping username to UserInfo
    """
    users = await User.find({"username": {"$in": usernames}}).to_list()
    from app.services.websocket_manager import manager
    
    return {
        user.username: UserInfo(
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            profile_picture_url=user.profile_picture_url,
            registration_no=user.registration_no if hasattr(user, 'registration_no') else None,
            employee_id=user.employee_id if hasattr(user, 'employee_id') else None,
            email=user.email,
            department=user.department if hasattr(user, 'department') else None,
            is_online=manager.is_user_online(user.username)
        )
        for user in users
    }


async def build_conversation_response(
    conversation: Conversation, 
    current_username: str
) -> ConversationResponse:
    """
    Build conversation response with user info and metadata
    """
    # Get user info for all participants
    users_info_dict = await get_users_info(conversation.participants)
    participant_info = [users_info_dict[username] for username in conversation.participants if username in users_info_dict]
    
    # Get current user's metadata
    user_meta = conversation.participant_metadata.get(current_username)
    
    # Calculate unread count
    unread_count = 0
    if user_meta and user_meta.last_read_message_id:
        # Count messages after last read message
        last_read_id = PydanticObjectId(user_meta.last_read_message_id)
        unread_count = await Message.find(
            Message.conversation_id == conversation.id,
            Message.id > last_read_id,
            NotIn(Message.deleted_by, [current_username])
        ).count()
    elif conversation.last_message:
        # No read tracking yet, count all messages
        unread_count = await Message.find(
            Message.conversation_id == conversation.id,
            NotIn(Message.deleted_by, [current_username])
        ).count()
    
    # Check if muted
    is_muted = False
    if user_meta and user_meta.muted_until:
        is_muted = user_meta.muted_until > utc_now()
    
    return ConversationResponse(
        id=str(conversation.id),
        participants=conversation.participants,
        participant_info=participant_info,
        is_group=conversation.is_group,
        group_name=conversation.group_name,
        group_description=conversation.group_description,
        created_by=conversation.created_by,
        last_message=conversation.last_message.dict() if conversation.last_message else None,
        unread_count=unread_count,
        is_muted=is_muted,
        is_archived=user_meta.archived if user_meta else False,
        is_pinned=user_meta.pinned if user_meta else False,
        updated_at=conversation.updated_at
    )


async def build_message_response(message: Message, sender_info: Optional[UserInfo] = None) -> MessageResponse:
    """
    Build message response with sender info
    """
    if not sender_info:
        sender_info = await get_user_info(message.sender_username)
    
    return MessageResponse(
        id=str(message.id),
        conversation_id=str(message.conversation_id),
        sender_username=message.sender_username,
        sender_info=sender_info,
        text=message.text,
        status=message.status,
        delivered_to=message.delivered_to,
        read_by=message.read_by,
        delivered_at=message.delivered_at,
        read_at=message.read_at,
        deleted_by=message.deleted_by,
        is_deleted_for_everyone=message.is_deleted_for_everyone,
        is_edited=message.is_edited,
        edited_at=message.edited_at,
        timestamp=message.timestamp
    )


async def get_paginated_messages(
    conversation_id: PydanticObjectId,
    username: str,
    limit: int = 50,
    before_id: Optional[str] = None,
    after_id: Optional[str] = None
) -> PaginatedMessagesResponse:
    """
    Get paginated messages for a conversation
    Uses cursor-based pagination for efficient loading
    
    Args:
        conversation_id: Conversation ID
        username: Current user (for filtering deleted messages)
        limit: Number of messages to fetch
        before_id: Fetch messages before this message ID (older messages)
        after_id: Fetch messages after this message ID (newer messages)
    """
    query = Message.find(
        Message.conversation_id == conversation_id,
        NotIn(Message.deleted_by, [username])
    )
    
    # Apply cursor pagination
    if before_id:
        cursor_id = PydanticObjectId(before_id)
        query = query.find(Message.id < cursor_id)
    elif after_id:
        cursor_id = PydanticObjectId(after_id)
        query = query.find(Message.id > cursor_id)
    
    # Sort by timestamp descending (newest first) and limit
    messages = await query.sort(-Message.timestamp).limit(limit + 1).to_list()
    
    # Check if there are more messages
    has_more = len(messages) > limit
    if has_more:
        messages = messages[:limit]
    
    # Build response with user info
    sender_usernames = list({msg.sender_username for msg in messages})
    users_info_dict = await get_users_info(sender_usernames)
    
    message_responses = []
    for msg in messages:
        sender_info = users_info_dict.get(msg.sender_username)
        msg_response = await build_message_response(msg, sender_info=sender_info)
        message_responses.append(msg_response)
    
    # Get next cursor (ID of last message)
    next_cursor = str(messages[-1].id) if messages and has_more else None
    
    return PaginatedMessagesResponse(
        messages=message_responses,
        has_more=has_more,
        next_cursor=next_cursor
    )


async def update_conversation_last_message(
    conversation: Conversation,
    message: Message
):
    """
    Update conversation's last message cache
    """
    conversation.last_message = LastMessageInfo(
        id=str(message.id),
        sender_username=message.sender_username,
        text=message.text[:100],  # Truncate for preview
        timestamp=message.timestamp
    )
    conversation.updated_at = utc_now()
    await conversation.save()


async def mark_messages_as_delivered(
    conversation_id: PydanticObjectId,
    username: str
) -> List[str]:
    """
    Mark all undelivered messages in a conversation as delivered to user
    Also sets delivered_at timestamp on first delivery
    """
    from app.utils.datetime_utils import utc_now
    
    messages = await Message.find(
        Message.conversation_id == conversation_id,
        Message.sender_username != username,
        NotIn(Message.delivered_to, [username])
    ).to_list()
    
    message_ids = []
    for msg in messages:
        msg.delivered_to.append(username)
        # Set delivered_at timestamp if this is the first delivery
        if not msg.delivered_at:
            msg.delivered_at = utc_now()
        await msg.save()
        message_ids.append(str(msg.id))
        
    return message_ids


async def mark_messages_as_read(
    conversation_id: PydanticObjectId,
    username: str
) -> List[str]:
    """
    Mark all unread messages in a conversation as read by user
    Also updates user's last_read_message_id in conversation metadata
    Sets read_at timestamp on first read
    """
    from app.utils.datetime_utils import utc_now
    
    # Get latest message in conversation
    latest_message = await Message.find(
        Message.conversation_id == conversation_id
    ).sort(-Message.timestamp).first_or_none()
    
    if not latest_message:
        return []
    
    # Mark all messages as read
    messages = await Message.find(
        Message.conversation_id == conversation_id,
        Message.sender_username != username,
        NotIn(Message.read_by, [username])
    ).to_list()
    
    message_ids = []
    for msg in messages:
        msg.read_by.append(username)
        # Set read_at timestamp if this is the first read
        if not msg.read_at:
            msg.read_at = utc_now()
        await msg.save()
        message_ids.append(str(msg.id))
    
    # Update conversation metadata
    conversation = await Conversation.get(conversation_id)
    if conversation:
        if username not in conversation.participant_metadata:
            conversation.participant_metadata[username] = ParticipantMetadata(username=username)
        
        conversation.participant_metadata[username].last_read_message_id = str(latest_message.id)
        await conversation.save()
        
    return message_ids


async def initialize_participant_metadata(
    conversation: Conversation,
    username: str
):
    """
    Initialize metadata for a new participant
    """
    if username not in conversation.participant_metadata:
        conversation.participant_metadata[username] = ParticipantMetadata(username=username)
        await conversation.save()
