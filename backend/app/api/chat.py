"""
Chat API - Enhanced with pagination, user info, and message status
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId
from beanie.operators import NotIn

from app.models.message import (
    Conversation, Message, ParticipantMetadata,
    ConversationResponse, MessageResponse, PaginatedMessagesResponse
)
from app.models.user import User
from app.schemas.chat import (
    SendMessageRequest, EditMessageRequest, 
    StartGroupConversationRequest, GetMessagesRequest
)
from app.services.chat_service import (
    build_conversation_response, build_message_response,
    get_paginated_messages, update_conversation_last_message,
    mark_messages_as_delivered, mark_messages_as_read,
    initialize_participant_metadata, get_users_info
)
from app.api.deps import get_current_user
from app.utils.datetime_utils import utc_now

router = APIRouter()


# Get my conversations with user info and unread counts
@router.get("/conversations", response_model=List[ConversationResponse])
async def get_my_conversations(
    username: str = Depends(get_current_user),
    include_archived: bool = Query(default=False)
):
    """
    Get all conversations for current user
    Includes user info, unread counts, and metadata
    """
    conversations = await Conversation.find(
        {"participants": username}
    ).sort(-Conversation.updated_at).to_list()
    
    # Filter archived conversations
    filtered_conversations = []
    for conv in conversations:
        user_meta = conv.participant_metadata.get(username)
        if user_meta and user_meta.archived and not include_archived:
            continue
        filtered_conversations.append(conv)
    
    # Batch fetch all user info at once
    all_participants = set()
    for conv in filtered_conversations:
        all_participants.update(conv.participants)
    
    users_info_dict = await get_users_info(list(all_participants))
    
    # Build responses
    responses = []
    for conv in filtered_conversations:
        # Get participant info from cached dict
        participant_info = [users_info_dict[username] for username in conv.participants if username in users_info_dict]
        
        # Get current user's metadata
        user_meta = conv.participant_metadata.get(username)
        
        # Calculate unread count (simplified - only if there's a last message)
        unread_count = 0
        if conv.last_message and user_meta:
            # Only count messages from OTHER users that haven't been read
            if user_meta.last_read_message_id:
                # Has read tracking - count messages after last read from other users
                try:
                    last_read_id = PydanticObjectId(user_meta.last_read_message_id)
                    unread_count = await Message.find(
                        Message.conversation_id == conv.id,
                        Message.id > last_read_id,
                        Message.sender_username != username,  # Exclude own messages
                        NotIn(Message.deleted_by, [username])
                    ).count()
                except:
                    unread_count = 0
            else:
                # No read tracking - count all messages from other users
                unread_count = await Message.find(
                    Message.conversation_id == conv.id,
                    Message.sender_username != username,  # Exclude own messages
                    NotIn(Message.deleted_by, [username])
                ).count()
        
        # Check if muted
        is_muted = False
        if user_meta and user_meta.muted_until:
            is_muted = user_meta.muted_until > utc_now()
        
        response = ConversationResponse(
            id=str(conv.id),
            participants=conv.participants,
            participant_info=participant_info,
            is_group=conv.is_group,
            group_name=conv.group_name,
            group_description=conv.group_description,
            created_by=conv.created_by,
            last_message=conv.last_message.dict() if conv.last_message else None,
            unread_count=unread_count,
            is_muted=is_muted,
            is_archived=user_meta.archived if user_meta else False,
            is_pinned=user_meta.pinned if user_meta else False,
            updated_at=conv.updated_at
        )
        responses.append(response)
    
    return responses


# Get messages with pagination
@router.get("/conversations/{conv_id}/messages", response_model=PaginatedMessagesResponse)
async def get_messages(
    conv_id: str,
    username: str = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    before_id: Optional[str] = Query(default=None),
    after_id: Optional[str] = Query(default=None)
):
    """
    Get paginated messages for a conversation
    Supports cursor-based pagination for efficient loading
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    # Verify user is participant
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Mark messages as delivered when user opens conversation
    delivered_ids = await mark_messages_as_delivered(conversation_id, username)
    
    if delivered_ids:
        # Broadcast real-time delivery receipts to the sender over WebSocket
        from app.services.websocket_manager import manager
        await manager.broadcast_to_conversation(
            conv_id,
            {
                "type": "message_status",
                "status": "delivered",
                "username": username,
                "message_ids": delivered_ids,
                "conversation_id": conv_id
            },
            exclude_user=username
        )
    
    # Get paginated messages
    return await get_paginated_messages(
        conversation_id, username, limit, before_id, after_id
    )


# Send a message
@router.post("/messages", response_model=MessageResponse)
async def send_message(
    body: SendMessageRequest, 
    username: str = Depends(get_current_user)
):
    """
    Send a message to existing conversation or start new 1:1 chat
    """
    conv = None
    
    # Case A: Reply to existing conversation
    if body.conversation_id:
        try:
            conv_id = PydanticObjectId(body.conversation_id)
            conv = await Conversation.get(conv_id)
        except:
            raise HTTPException(status_code=400, detail="Invalid conversation ID")
            
        if not conv or username not in conv.participants:
            raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Case B: Start new 1:1 chat
    elif body.recipient_username:
        if body.recipient_username == username:
            raise HTTPException(status_code=400, detail="Cannot message yourself")
        
        # Check if 1:1 already exists
        conv = await Conversation.find_one({
            "is_group": False,
            "participants": {"$all": [username, body.recipient_username]}
        })
        
        # Create new conversation if doesn't exist
        if not conv:
            recipient = await User.find_one(User.username == body.recipient_username)
            if not recipient:
                raise HTTPException(status_code=404, detail="Recipient not found")
            
            conv = Conversation(
                participants=[username, body.recipient_username],
                created_by=username
            )
            await conv.insert()
            
            # Initialize metadata for both participants
            await initialize_participant_metadata(conv, username)
            await initialize_participant_metadata(conv, body.recipient_username)
    else:
        raise HTTPException(status_code=400, detail="Must provide conversation_id or recipient_username")
    
    # Create message
    msg = Message(
        conversation_id=conv.id,
        sender_username=username,
        text=body.text,
        status="sent",
        read_by=[username]  # Sender has read their own message
    )
    await msg.insert()
    
    # Update conversation last message
    await update_conversation_last_message(conv, msg)
    
    # Build response with sender info
    return await build_message_response(msg)


# Edit a message
@router.put("/messages/{msg_id}", response_model=MessageResponse)
async def edit_message(
    msg_id: str,
    body: EditMessageRequest,
    username: str = Depends(get_current_user)
):
    """
    Edit a message (only your own messages)
    """
    try:
        message_id = PydanticObjectId(msg_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    msg = await Message.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if msg.sender_username != username:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    
    if msg.is_deleted_for_everyone:
        raise HTTPException(status_code=400, detail="Cannot edit deleted message")
    
    msg.text = body.text
    msg.is_edited = True
    msg.edited_at = utc_now()
    await msg.save()
    
    return await build_message_response(msg)


# Delete a message
@router.delete("/messages/{msg_id}")
async def delete_message(
    msg_id: str,
    type: str = Query(..., pattern="^(for_me|for_everyone)$"),
    username: str = Depends(get_current_user)
):
    """
    Delete a message for yourself or for everyone
    """
    try:
        message_id = PydanticObjectId(msg_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid message ID")
    
    msg = await Message.get(message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Verify user is participant
    conv = await Conversation.get(msg.conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    if type == "for_everyone":
        if msg.sender_username != username:
            raise HTTPException(status_code=403, detail="Can only delete own messages for everyone")
        
        msg.is_deleted_for_everyone = True
        msg.text = ""
        await msg.save()
        return {"message": "Message deleted for everyone"}
    
    elif type == "for_me":
        if username not in msg.deleted_by:
            msg.deleted_by.append(username)
            await msg.save()
        return {"message": "Message deleted for you"}


# Mark conversation as read
@router.put("/conversations/{conv_id}/read")
async def mark_conversation_as_read(
    conv_id: str,
    username: str = Depends(get_current_user)
):
    """
    Mark all messages in conversation as read
    Updates last_read_message_id for accurate unread tracking
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    message_ids = await mark_messages_as_read(conversation_id, username)
    
    if message_ids:
        # Broadcast real-time read receipts to the sender over WebSocket
        from app.services.websocket_manager import manager
        await manager.broadcast_to_conversation(
            conv_id,
            {
                "type": "message_status",
                "status": "read",
                "username": username,
                "message_ids": message_ids,
                "conversation_id": conv_id
            },
            exclude_user=username
        )
        
        # Broadcast conversation update (unread count changed) to all participants
        await manager.broadcast_conversation_update(conv_id, conv.participants)
    
    return {"message": "Conversation marked as read"}


# Mark conversation as unread
@router.put("/conversations/{conv_id}/unread")
async def mark_conversation_as_unread(
    conv_id: str,
    username: str = Depends(get_current_user)
):
    """
    Mark conversation as unread by clearing last_read_message_id
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Clear last_read_message_id to make conversation appear unread
    if username in conv.participant_metadata:
        conv.participant_metadata[username].last_read_message_id = None
        await conv.save()
    
    return {"message": "Conversation marked as unread"}


# Archive conversation
@router.put("/conversations/{conv_id}/archive")
async def archive_conversation(
    conv_id: str,
    archive: bool = Query(default=True),
    username: str = Depends(get_current_user)
):
    """
    Archive or unarchive a conversation
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Initialize metadata if not exists
    if username not in conv.participant_metadata:
        conv.participant_metadata[username] = ParticipantMetadata(username=username)
    
    conv.participant_metadata[username].archived = archive
    await conv.save()
    
    return {"message": f"Conversation {'archived' if archive else 'unarchived'}"}


# Pin conversation
@router.put("/conversations/{conv_id}/pin")
async def pin_conversation(
    conv_id: str,
    pin: bool = Query(default=True),
    username: str = Depends(get_current_user)
):
    """
    Pin or unpin a conversation
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Initialize metadata if not exists
    if username not in conv.participant_metadata:
        conv.participant_metadata[username] = ParticipantMetadata(username=username)
    
    conv.participant_metadata[username].pinned = pin
    await conv.save()
    
    return {"message": f"Conversation {'pinned' if pin else 'unpinned'}"}


# Mute conversation
@router.put("/conversations/{conv_id}/mute")
async def mute_conversation(
    conv_id: str,
    mute: bool = Query(default=True),
    hours: Optional[int] = Query(default=None),
    username: str = Depends(get_current_user)
):
    """
    Mute or unmute a conversation
    If hours is provided, mute for that duration. Otherwise, mute indefinitely.
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Initialize metadata if not exists
    if username not in conv.participant_metadata:
        conv.participant_metadata[username] = ParticipantMetadata(username=username)
    
    # Set muted_until based on hours parameter
    if mute:
        from datetime import datetime, timedelta
        if hours:
            # Mute for specific hours
            conv.participant_metadata[username].muted_until = datetime.utcnow() + timedelta(hours=hours)
        else:
            # Mute indefinitely (10 years)
            conv.participant_metadata[username].muted_until = datetime.utcnow() + timedelta(days=365 * 10)
    else:
        conv.participant_metadata[username].muted_until = None
    
    await conv.save()
    
    return {"message": f"Conversation {'muted' if mute else 'unmuted'}"}


# Search users (directory)
@router.get("/directory")
async def search_directory(
    query: str = Query(..., min_length=1),
    username: str = Depends(get_current_user)
):
    """
    Search for users to start a conversation
    """
    users = await User.find({
        "$or": [
            {"username": {"$regex": query, "$options": "i"}},
            {"first_name": {"$regex": query, "$options": "i"}},
            {"last_name": {"$regex": query, "$options": "i"}}
        ]
    }).to_list()
    
    # Exclude current user
    return [
        {
            "username": u.username,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "role": u.role,
            "profile_picture_url": u.profile_picture_url
        }
        for u in users if u.username != username
    ]


# Leave conversation
@router.delete("/conversations/{conv_id}")
async def leave_conversation(
    conv_id: str,
    username: str = Depends(get_current_user)
):
    """
    Leave a conversation (removes user from participants)
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Remove user from participants
    conv.participants.remove(username)
    
    # If no participants left, delete conversation and messages
    if len(conv.participants) == 0:
        await conv.delete()
        await Message.find(Message.conversation_id == conversation_id).delete()
    else:
        await conv.save()
    
    return {"message": "Left conversation successfully"}


# Clear chat (delete all messages for current user)
@router.delete("/conversations/{conv_id}/clear")
async def clear_chat(
    conv_id: str,
    username: str = Depends(get_current_user)
):
    """
    Clear all messages in a conversation for the current user
    Marks all messages as deleted for this user
    """
    try:
        conversation_id = PydanticObjectId(conv_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    conv = await Conversation.get(conversation_id)
    if not conv or username not in conv.participants:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    
    # Mark all messages as deleted for this user
    messages = await Message.find(Message.conversation_id == conversation_id).to_list()
    for msg in messages:
        if username not in msg.deleted_by:
            msg.deleted_by.append(username)
            await msg.save()
    
    # Broadcast conversation update to refresh left panel
    from app.services.websocket_manager import manager
    await manager.broadcast_conversation_update(conv_id, conv.participants)
    
    return {"message": "Chat cleared successfully"}
