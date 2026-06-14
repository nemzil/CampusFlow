"""WebSocket connection manager for real-time chat"""
from typing import Dict, Set, Optional
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        # Active connections: username -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Conversation rooms: conversation_id -> set of usernames
        self.conversation_rooms: Dict[str, Set[str]] = {}
        
        # Typing indicators: conversation_id -> set of usernames currently typing
        self.typing_users: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, username: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[username] = websocket
        logger.info(f"WebSocket connected: {username}")
    
    def disconnect(self, username: str):
        """Remove user from all rooms and active connections"""
        if username in self.active_connections:
            del self.active_connections[username]
        
        # Remove from all conversation rooms
        for room_users in self.conversation_rooms.values():
            room_users.discard(username)
        
        # Remove from typing indicators
        for typing_set in self.typing_users.values():
            typing_set.discard(username)
        
        print(f"ws: {username} disconnected")
    
    async def join_conversation(self, username: str, conversation_id: str):
        """Add user to a conversation room"""
        if conversation_id not in self.conversation_rooms:
            self.conversation_rooms[conversation_id] = set()
        
        self.conversation_rooms[conversation_id].add(username)
    
    async def leave_conversation(self, username: str, conversation_id: str):
        """Remove user from a conversation room"""
        if conversation_id in self.conversation_rooms:
            self.conversation_rooms[conversation_id].discard(username)
            
            # Clean up empty rooms
            if not self.conversation_rooms[conversation_id]:
                del self.conversation_rooms[conversation_id]
        
        # Stop typing indicator if active
        if conversation_id in self.typing_users:
            self.typing_users[conversation_id].discard(username)
    
    async def send_personal_message(self, username: str, message: dict):
        """Send message to a specific user"""
        if username in self.active_connections:
            try:
                encoded_message = jsonable_encoder(message)
                await self.active_connections[username].send_json(encoded_message)
            except Exception as e:
                print(f"ws error: {username}")
                self.disconnect(username)
    
    async def broadcast_to_conversation(
        self, 
        conversation_id: str, 
        message: dict, 
        exclude_user: Optional[str] = None
    ):
        """Broadcast message to all users in a conversation room"""
        if conversation_id not in self.conversation_rooms:
            return
        
        disconnected_users = []
        encoded_message = jsonable_encoder(message)
        
        for username in self.conversation_rooms[conversation_id]:
            if username == exclude_user:
                continue
            
            if username in self.active_connections:
                try:
                    await self.active_connections[username].send_json(encoded_message)
                except Exception:
                    disconnected_users.append(username)
        
        # Clean up disconnected users
        for username in disconnected_users:
            self.disconnect(username)
    
    async def broadcast_user_status(self, username: str, status: str):
        """Broadcast user's online/offline status to all connected users"""
        message = {
            "type": "user_status",
            "username": username,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        encoded_message = jsonable_encoder(message)

        disconnected_users = []
        for connected_username, ws in list(self.active_connections.items()):
            if connected_username == username:
                continue
            try:
                await ws.send_json(encoded_message)
            except Exception:
                disconnected_users.append(connected_username)

        for du in disconnected_users:
            self.disconnect(du)

    async def broadcast_offline_and_disconnect(self, username: str):
        """Broadcast offline status before removing the user"""
        await self.broadcast_user_status(username, "offline")
        self.disconnect(username)
    
    async def broadcast_conversation_update(self, conversation_id: str, participants: list):
        """Broadcast conversation update to all participants"""
        message = {
            "type": "conversation_updated",
            "conversation_id": conversation_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        encoded_message = jsonable_encoder(message)
        
        # Send to all participants who are online
        for username in participants:
            if username in self.active_connections:
                try:
                    await self.active_connections[username].send_json(encoded_message)
                except Exception:
                    pass
    
    async def start_typing(self, username: str, conversation_id: str):
        """Mark user as typing in a conversation"""
        if conversation_id not in self.typing_users:
            self.typing_users[conversation_id] = set()
        
        self.typing_users[conversation_id].add(username)
        
        # Broadcast typing indicator
        await self.broadcast_to_conversation(
            conversation_id,
            {
                "type": "typing_start",
                "username": username,
                "conversation_id": conversation_id
            },
            exclude_user=username
        )
    
    async def stop_typing(self, username: str, conversation_id: str):
        """Mark user as stopped typing in a conversation"""
        if conversation_id in self.typing_users:
            self.typing_users[conversation_id].discard(username)
        
        # Broadcast stop typing indicator
        await self.broadcast_to_conversation(
            conversation_id,
            {
                "type": "typing_stop",
                "username": username,
                "conversation_id": conversation_id
            },
            exclude_user=username
        )
    
    def is_user_online(self, username: str) -> bool:
        """Check if a user is currently connected"""
        return username in self.active_connections
    
    def get_online_users_in_conversation(self, conversation_id: str) -> Set[str]:
        """Get list of online users in a conversation"""
        if conversation_id not in self.conversation_rooms:
            return set()
        
        return {
            username for username in self.conversation_rooms[conversation_id]
            if self.is_user_online(username)
        }
    
    def get_typing_users(self, conversation_id: str) -> Set[str]:
        """Get list of users currently typing in a conversation"""
        return self.typing_users.get(conversation_id, set())


# Global connection manager instance
manager = ConnectionManager()
