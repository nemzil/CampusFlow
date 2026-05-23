"""
WebSocket endpoint for real-time chat
Handles message delivery, typing indicators, and presence
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from beanie import PydanticObjectId
import json

from app.models.message import Message, Conversation
from app.services.websocket_manager import manager
from app.services.chat_service import (
    build_message_response,
    update_conversation_last_message,
    mark_messages_as_delivered
)
from app.core.security import verify_jwt_token
from app.utils.datetime_utils import utc_now

router = APIRouter()


@router.websocket("")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time chat
    
    Client sends JWT token as query parameter for authentication
    Example: ws://localhost:8000/api/ws?token=your_jwt_token
    
    Message types from client:
    - join_conversation: Join a conversation room
    - leave_conversation: Leave a conversation room
    - send_message: Send a new message
    - typing_start: Start typing indicator
    - typing_stop: Stop typing indicator
    - mark_delivered: Mark messages as delivered
    - mark_read: Mark messages as read
    
    Message types to client:
    - new_message: New message received
    - message_edited: Message was edited
    - message_deleted: Message was deleted
    - typing_start: Someone started typing
    - typing_stop: Someone stopped typing
    - user_status: User went online/offline
    - message_status: Message status updated (delivered/read)
    - error: Error occurred
    """
    
    # Verify JWT token
    try:
        payload = verify_jwt_token(token)
        if not payload:
            await websocket.close(code=1008, reason="Invalid token")
            return
        username = payload.get("sub")
        if not username:
            await websocket.close(code=1008, reason="Invalid token payload")
            return
    except Exception as e:
        await websocket.close(code=1008, reason="Invalid token")
        return
    
    # Accept connection
    await manager.connect(websocket, username)
    
    # Broadcast online status to ALL connected users
    await manager.broadcast_user_status(username, "online")
    
    # Mark all undelivered messages in all user's conversations as delivered
    try:
        from app.models.message import Conversation
        from app.services.chat_service import mark_messages_as_delivered
        
        # Get all conversations for this user
        conversations = await Conversation.find({"participants": username}).to_list()
        for conv in conversations:
            delivered_ids = await mark_messages_as_delivered(conv.id, username)
            if delivered_ids:
                # Notify the senders that these messages were delivered
                await manager.broadcast_to_conversation(
                    str(conv.id),
                    {
                        "type": "message_status",
                        "status": "delivered",
                        "username": username,
                        "message_ids": delivered_ids,
                        "conversation_id": str(conv.id)
                    },
                    exclude_user=username
                )
    except Exception as e:
        print(f"Error marking messages as delivered on connect: {e}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            # Handle different message types
            if message_type == "join_conversation":
                await handle_join_conversation(username, data)
            
            elif message_type == "leave_conversation":
                await handle_leave_conversation(username, data)
            
            elif message_type == "send_message":
                await handle_send_message(username, data)
            
            elif message_type == "typing_start":
                await handle_typing_start(username, data)
            
            elif message_type == "typing_stop":
                await handle_typing_stop(username, data)
            
            elif message_type == "mark_delivered":
                await handle_mark_delivered(username, data)
            
            elif message_type == "mark_read":
                await handle_mark_read(username, data)
            
            elif message_type == "edit_message":
                await handle_edit_message(username, data)
            
            elif message_type == "delete_message":
                await handle_delete_message(username, data)
            
            else:
                await manager.send_personal_message(username, {
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        # Broadcast offline BEFORE removing the user so other clients get notified
        await manager.broadcast_offline_and_disconnect(username)
    
    except Exception as e:
        print(f"WebSocket error for {username}: {e}")
        await manager.broadcast_offline_and_disconnect(username)


async def handle_join_conversation(username: str, data: dict):
    """
    Handle user joining a conversation room
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": "conversation_id required"
        })
        return
    
    # Verify user is participant
    try:
        conv_id = PydanticObjectId(conversation_id)
        conv = await Conversation.get(conv_id)
        
        if not conv or username not in conv.participants:
            await manager.send_personal_message(username, {
                "type": "error",
                "message": "Not a participant in this conversation"
            })
            return
        
        # Join the room
        await manager.join_conversation(username, conversation_id)
        
        # Mark messages as delivered
        await mark_messages_as_delivered(conv_id, username)
        
        # Send confirmation
        await manager.send_personal_message(username, {
            "type": "joined_conversation",
            "conversation_id": conversation_id
        })
        
        # Notify others that user is online in this conversation
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "user_joined",
                "username": username,
                "conversation_id": conversation_id
            },
            exclude_user=username
        )
    
    except Exception as e:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": f"Failed to join conversation: {str(e)}"
        })


async def handle_leave_conversation(username: str, data: dict):
    """
    Handle user leaving a conversation room
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return
    
    await manager.leave_conversation(username, conversation_id)
    
    # Notify others
    await manager.broadcast_to_conversation(
        conversation_id,
        {
            "type": "user_left",
            "username": username,
            "conversation_id": conversation_id
        },
        exclude_user=username
    )


async def handle_send_message(username: str, data: dict):
    """
    Handle sending a new message
    """
    conversation_id = data.get("conversation_id")
    text = data.get("text")
    
    if not conversation_id or not text:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": "conversation_id and text required"
        })
        return
    
    try:
        conv_id = PydanticObjectId(conversation_id)
        conv = await Conversation.get(conv_id)
        
        if not conv or username not in conv.participants:
            await manager.send_personal_message(username, {
                "type": "error",
                "message": "Not a participant in this conversation"
            })
            return
        
        # Check who is online to mark as delivered immediately
        delivered_to = [username]
        delivered_at = None
        status = "sent"
        
        online_participants = []
        for p in conv.participants:
            if p != username and manager.is_user_online(p):
                online_participants.append(p)
                
        if online_participants:
            delivered_to.extend(online_participants)
            delivered_at = utc_now()
            status = "delivered"
            
        # Create message
        msg = Message(
            conversation_id=conv_id,
            sender_username=username,
            text=text,
            status=status,
            read_by=[username],
            delivered_to=delivered_to,
            delivered_at=delivered_at
        )
        await msg.insert()
        
        # Update conversation last message
        await update_conversation_last_message(conv, msg)
        
        # Build response with user info
        msg_response = await build_message_response(msg)
        
        # Broadcast to all users in conversation
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "new_message",
                "message": msg_response.dict()
            }
        )
        
        # Broadcast conversation update to all participants (for conversation list)
        await manager.broadcast_conversation_update(conversation_id, conv.participants)
        
        # Stop typing indicator for sender
        await manager.stop_typing(username, conversation_id)
    
    except Exception as e:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": f"Failed to send message: {str(e)}"
        })


async def handle_typing_start(username: str, data: dict):
    """
    Handle typing indicator start
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return
    
    await manager.start_typing(username, conversation_id)


async def handle_typing_stop(username: str, data: dict):
    """
    Handle typing indicator stop
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return
    
    await manager.stop_typing(username, conversation_id)


async def handle_mark_delivered(username: str, data: dict):
    """
    Handle marking messages as delivered
    """
    conversation_id = data.get("conversation_id")
    if not conversation_id:
        return
    
    try:
        conv_id = PydanticObjectId(conversation_id)
        await mark_messages_as_delivered(conv_id, username)
        
        # Notify senders that messages were delivered
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "message_status",
                "status": "delivered",
                "username": username,
                "conversation_id": conversation_id
            },
            exclude_user=username
        )
    
    except Exception as e:
        print(f"Error marking delivered: {e}")


async def handle_mark_read(username: str, data: dict):
    """
    Handle marking messages as read
    """
    conversation_id = data.get("conversation_id")
    message_ids = data.get("message_ids", [])
    
    if not conversation_id:
        return
    
    try:
        conv_id = PydanticObjectId(conversation_id)
        conv = await Conversation.get(conv_id)
        
        if not conv:
            return
        
        # Mark specific messages as read
        for msg_id in message_ids:
            try:
                message_id = PydanticObjectId(msg_id)
                msg = await Message.get(message_id)
                
                if msg and username not in msg.read_by:
                    msg.read_by.append(username)
                    # Set read_at timestamp if this is the first read
                    if not msg.read_at:
                        msg.read_at = utc_now()
                    await msg.save()
            except:
                continue
        
        # Notify senders that messages were read
        await manager.broadcast_to_conversation(
            conversation_id,
            {
                "type": "message_status",
                "status": "read",
                "username": username,
                "message_ids": message_ids,
                "conversation_id": conversation_id
            },
            exclude_user=username
        )
        
        # Broadcast conversation update (unread count changed)
        await manager.broadcast_conversation_update(conversation_id, conv.participants)
    
    except Exception as e:
        print(f"Error marking read: {e}")


async def handle_edit_message(username: str, data: dict):
    """
    Handle editing a message
    """
    message_id = data.get("message_id")
    new_text = data.get("text")
    
    if not message_id or not new_text:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": "message_id and text required"
        })
        return
    
    try:
        msg_id = PydanticObjectId(message_id)
        msg = await Message.get(msg_id)
        
        if not msg:
            await manager.send_personal_message(username, {
                "type": "error",
                "message": "Message not found"
            })
            return
        
        if msg.sender_username != username:
            await manager.send_personal_message(username, {
                "type": "error",
                "message": "Can only edit your own messages"
            })
            return
        
        # Update message
        msg.text = new_text
        msg.is_edited = True
        msg.edited_at = utc_now()
        await msg.save()
        
        # Broadcast edit to conversation
        msg_response = await build_message_response(msg)
        await manager.broadcast_to_conversation(
            str(msg.conversation_id),
            {
                "type": "message_edited",
                "message": msg_response.dict()
            }
        )
    
    except Exception as e:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": f"Failed to edit message: {str(e)}"
        })


async def handle_delete_message(username: str, data: dict):
    """
    Handle deleting a message
    """
    message_id = data.get("message_id")
    delete_type = data.get("delete_type", "for_me")
    
    if not message_id:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": "message_id required"
        })
        return
    
    try:
        msg_id = PydanticObjectId(message_id)
        msg = await Message.get(msg_id)
        
        if not msg:
            await manager.send_personal_message(username, {
                "type": "error",
                "message": "Message not found"
            })
            return
        
        if delete_type == "for_everyone":
            if msg.sender_username != username:
                await manager.send_personal_message(username, {
                    "type": "error",
                    "message": "Can only delete own messages for everyone"
                })
                return
            
            msg.is_deleted_for_everyone = True
            msg.text = ""
            await msg.save()
            
            # Broadcast deletion to conversation
            await manager.broadcast_to_conversation(
                str(msg.conversation_id),
                {
                    "type": "message_deleted",
                    "message_id": message_id,
                    "delete_type": "for_everyone"
                }
            )
        
        elif delete_type == "for_me":
            if username not in msg.deleted_by:
                msg.deleted_by.append(username)
                await msg.save()
            
            # Only notify the user
            await manager.send_personal_message(username, {
                "type": "message_deleted",
                "message_id": message_id,
                "delete_type": "for_me"
            })
    
    except Exception as e:
        await manager.send_personal_message(username, {
            "type": "error",
            "message": f"Failed to delete message: {str(e)}"
        })
