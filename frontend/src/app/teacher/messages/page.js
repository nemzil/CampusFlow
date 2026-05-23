'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { getConversations, markConversationAsRead, markConversationAsUnread, archiveConversation, muteConversation, deleteConversation, clearChat } from '@/lib/api';
import { chatWS } from '@/lib/websocket';
import ConversationList from '@/components/ConversationList';
import MessageView from '@/components/MessageView';
import UserSearch from '@/components/UserSearch';
import { Loader2 } from 'lucide-react';

export default function MessagesPage() {
  const router = useRouter();
  const { user, loading: authLoading, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);

  const wsInitialised = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'TEACHER') {
      router.push('/login');
    } else if (!authLoading && user && token) {
      fetchConversations(true); // Initial load with screen loader
      if (!wsInitialised.current) {
        wsInitialised.current = true;
        connectWebSocket();
      }
      requestNotificationPermission();
    }

    return () => {
      // Clear listeners on unmount so stale closures don't accumulate.
      // Keep the socket open so the backend can track presence / deliver messages.
      chatWS.clearListeners();
      wsInitialised.current = false;
    };
  }, [user, authLoading, token, router]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const showNotification = (title, body, conversationId) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (document.hidden) {
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: conversationId,
          requireInteraction: false
        });

        notification.onclick = () => {
          window.focus();
          const conv = conversations.find(c => c.id === conversationId);
          if (conv) {
            handleSelectConversation(conv);
          }
          notification.close();
        };
      }
    }
  };

  const connectWebSocket = () => {
    if (!token) return;

    chatWS.connect(token);

    // Handle new messages - Update conversation list optimistically
    chatWS.on('new_message', (data) => {
      console.log('New message received:', data);
      
      if (!data.message) return;
      
      const message = data.message;
      const convId = message.conversation_id;
      
      // Show desktop notification if message is from someone else
      if (message.sender_username !== user?.username) {
        const senderName = `${message.sender_info?.first_name} ${message.sender_info?.last_name}`;
        showNotification(
          senderName,
          message.text.substring(0, 100),
          convId
        );
      }
      
      // Update conversation list optimistically
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === convId) {
            return {
              ...conv,
              last_message: {
                id: message.id,
                sender_username: message.sender_username,
                text: message.text.substring(0, 100),
                timestamp: message.timestamp
              },
              updated_at: message.timestamp,
              // Only increment unread if message is from someone else
              unread_count: message.sender_username === user?.username ? conv.unread_count : conv.unread_count + 1
            };
          }
          return conv;
        });
        
        // Sort by updated_at (most recent first)
        return updated.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });
    });

    // Handle conversation updates - Refresh silently in the background
    chatWS.on('conversation_updated', (data) => {
      console.log('Conversation updated:', data);
      fetchConversations(false);
    });

    // Handle presence status updates
    chatWS.on('user_status', (data) => {
      console.log('User status changed:', data);
      
      setConversations(prev => prev.map(conv => {
        const updatedParticipantInfo = conv.participant_info?.map(p => {
          if (p.username === data.username) {
            return { ...p, is_online: data.status === 'online' };
          }
          return p;
        });
        
        return {
          ...conv,
          participant_info: updatedParticipantInfo
        };
      }));
      
      setActiveConversation(prev => {
        if (prev && prev.otherUser && prev.otherUser.username === data.username) {
          return {
            ...prev,
            otherUser: { ...prev.otherUser, is_online: data.status === 'online' }
          };
        }
        return prev;
      });
    });

    // Handle message status updates - Update unread count
    chatWS.on('message_status', (data) => {
      console.log('Message status updated:', data);
      
      if (data.status === 'read' && data.conversation_id) {
        // When messages are marked as read, update unread count
        setConversations(prev => prev.map(conv => {
          if (conv.id === data.conversation_id) {
            return { ...conv, unread_count: 0 };
          }
          return conv;
        }));
      }
    });

    chatWS.on('message_edited', (data) => {
      console.log('Message edited:', data);
      // Update last message if it was edited
      if (data.message) {
        setConversations(prev => prev.map(conv => {
          if (conv.id === data.message.conversation_id && conv.last_message?.id === data.message.id) {
            return {
              ...conv,
              last_message: {
                ...conv.last_message,
                text: data.message.text.substring(0, 100)
              }
            };
          }
          return conv;
        }));
      }
    });

    chatWS.on('message_deleted', (data) => {
      console.log('Message deleted:', data);
      fetchConversations(false);
    });

    chatWS.on('connected', () => {
      console.log('WebSocket connected successfully');
    });

    chatWS.on('disconnected', () => {
      console.log('WebSocket disconnected');
    });

    chatWS.on('error', (data) => {
      console.error('WebSocket error:', data);
    });
  };

  const fetchConversations = async (showLoader = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      // Fetch both active and archived conversations
      const data = await getConversations(true);
      setConversations(data);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleSelectConversation = (conversation) => {
    // Extract the other user from participant_info
    const otherUser = conversation.participant_info?.find(p => p.username !== user?.username) || conversation.participant_info?.[0];
    
    setActiveConversation({
      id: conversation.id,
      otherUser: otherUser
    });
  };

  const handleNewChat = () => {
    setIsUserSearchOpen(true);
  };

  const handleSelectUser = async (selectedUser) => {
    try {
      // Check if conversation already exists
      const existing = conversations.find(conv => 
        conv.participant_info?.some(p => p.username === selectedUser.username)
      );

      if (existing) {
        handleSelectConversation(existing);
      } else {
        // Create new conversation by setting up for first message
        setActiveConversation({
          id: null,
          otherUser: selectedUser
        });
      }
      setIsUserSearchOpen(false);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const handleMessageSent = (newConvId) => {
    if (newConvId && !activeConversation?.id) {
      // Link the new conversation ID so the chat view stays selected and active
      const otherUser = activeConversation?.otherUser;
      setActiveConversation({
        id: newConvId,
        otherUser: otherUser
      });
    }
    fetchConversations(false); // Silent background update
  };

  const handleMarkAsRead = async (conversationId) => {
    try {
      await markConversationAsRead(conversationId);
      fetchConversations(false);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAsUnread = async (conversationId) => {
    try {
      await markConversationAsUnread(conversationId);
      fetchConversations(false);
    } catch (err) {
      console.error('Failed to mark as unread:', err);
    }
  };

  const handleArchive = async (conversationId, archive) => {
    try {
      await archiveConversation(conversationId, archive);
      fetchConversations(false);
    } catch (err) {
      console.error('Failed to archive:', err);
    }
  };

  const handleMute = async (conversationId, hours) => {
    try {
      if (hours === 0) {
        // Unmute
        await muteConversation(conversationId, false);
      } else {
        // Mute for specified hours or forever
        await muteConversation(conversationId, true, hours);
      }
      fetchConversations(false);
    } catch (err) {
      console.error('Failed to mute:', err);
    }
  };

  const handleDelete = async (conversationId) => {
    if (!confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteConversation(conversationId);
      // Clear active conversation if it was deleted
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
      }
      fetchConversations(false);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleClearChat = async (conversationId) => {
    try {
      await clearChat(conversationId);
      // Refresh the active conversation to show cleared messages
      if (activeConversation?.id === conversationId) {
        // Trigger a refresh by re-selecting the conversation
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          handleSelectConversation(conv);
        }
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen p-3 md:p-5 max-w-[1600px] mx-auto overflow-hidden">
      <motion.div
        className="flex flex-col md:flex-row h-full gap-3 w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Left Sidebar (Conversations) */}
        <div className="w-full md:w-[280px] lg:w-[300px] h-full shrink-0">
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversation?.id}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onMarkAsRead={handleMarkAsRead}
            onMarkAsUnread={handleMarkAsUnread}
            onArchive={handleArchive}
            onMute={handleMute}
            onDelete={handleDelete}
            currentUsername={user?.username}
          />
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 min-w-0 h-full hidden md:block">
          <MessageView
            conversationId={activeConversation?.id}
            otherUser={activeConversation?.otherUser}
            currentUsername={user?.username}
            onMessageSent={handleMessageSent}
            onClearChat={handleClearChat}
            onClose={() => setActiveConversation(null)}
          />
        </div>

        {/* Mobile View Handling - If active conversation, show it, else hide on mobile */}
        {activeConversation && (
          <div className="fixed inset-0 z-50 md:hidden bg-background p-4 h-[100dvh]">
            <MessageView
              conversationId={activeConversation?.id}
              otherUser={activeConversation?.otherUser}
              currentUsername={user?.username}
              onMessageSent={handleMessageSent}
              onClearChat={handleClearChat}
            />
            <button 
              onClick={() => setActiveConversation(null)}
              className="absolute top-6 left-6 z-50 p-2 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20"
            >
              ← Back
            </button>
          </div>
        )}
      </motion.div>

      <UserSearch
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
