'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMessages, sendMessage, editMessage, deleteMessage, markConversationAsRead } from '@/lib/api';
import { chatWS } from '@/lib/websocket';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Send, MoreVertical, Edit2, Trash2, Check, CheckCheck, MessageSquare, Loader2, X, Paperclip, Image as ImageIcon, Info, Eraser, User } from 'lucide-react';
import UserInfoModal from '@/components/UserInfoModal';

export default function MessageView({ conversationId, otherUser, currentUsername, onMessageSent, onClearChat, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showMessageInfo, setShowMessageInfo] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      markAsRead();
      
      // Set up WebSocket event handlers for this conversation
      const handleNewMessage = (data) => {
        if (data.message && data.message.conversation_id === conversationId) {
          setMessages(prev => [...prev, data.message]);
          markAsRead(); // Mark as read since user is viewing the conversation
          
          // Notify parent to update conversation list
          if (onMessageSent) {
            onMessageSent();
          }
        }
      };

      const handleMessageEdited = (data) => {
        if (data.message && data.message.conversation_id === conversationId) {
          setMessages(prev => prev.map(m => 
            m.id === data.message.id ? data.message : m
          ));
        }
      };

      const handleMessageDeleted = (data) => {
        if (data.delete_type === 'for_everyone') {
          setMessages(prev => prev.map(m => 
            m.id === data.message_id 
              ? { ...m, is_deleted_for_everyone: true, text: '' }
              : m
          ));
        } else if (data.delete_type === 'for_me') {
          setMessages(prev => prev.filter(m => m.id !== data.message_id));
        }
      };

      const handleMessageStatus = (data) => {
        // Update message status (delivered/read) in real-time
        if (data.conversation_id === conversationId) {
          setMessages(prev => prev.map(m => {
            if (data.status === 'delivered' && !m.delivered_to?.includes(data.username)) {
              return {
                ...m,
                delivered_to: [...(m.delivered_to || []), data.username],
                delivered_at: m.delivered_at || new Date().toISOString()
              };
            } else if (data.status === 'read' && data.message_ids?.includes(m.id)) {
              return {
                ...m,
                read_by: [...(m.read_by || []), data.username],
                read_at: m.read_at || new Date().toISOString()
              };
            }
            return m;
          }));
        }
      };

      const handleTypingStart = (data) => {
        if (data.conversation_id === conversationId && data.username !== currentUsername) {
          setIsTyping(true);
        }
      };

      const handleTypingStop = (data) => {
        if (data.conversation_id === conversationId && data.username !== currentUsername) {
          setIsTyping(false);
        }
      };

      const handleConnected = () => {
        console.log('WS connected, joining conversation room:', conversationId);
        chatWS.send('join_conversation', { conversation_id: conversationId });
      };

      chatWS.on('new_message', handleNewMessage);
      chatWS.on('message_edited', handleMessageEdited);
      chatWS.on('message_deleted', handleMessageDeleted);
      chatWS.on('message_status', handleMessageStatus);
      chatWS.on('typing_start', handleTypingStart);
      chatWS.on('typing_stop', handleTypingStop);
      chatWS.on('connected', handleConnected);

      // Join conversation room immediately if already connected
      if (chatWS.isConnected()) {
        chatWS.send('join_conversation', { conversation_id: conversationId });
      }

      // Cleanup
      return () => {
        chatWS.off('new_message', handleNewMessage);
        chatWS.off('message_edited', handleMessageEdited);
        chatWS.off('message_deleted', handleMessageDeleted);
        chatWS.off('message_status', handleMessageStatus);
        chatWS.off('typing_start', handleTypingStart);
        chatWS.off('typing_stop', handleTypingStop);
        chatWS.off('connected', handleConnected);
        
        if (chatWS.isConnected()) {
          chatWS.send('leave_conversation', { conversation_id: conversationId });
        }
      };
    } else {
      // New conversation - no messages to fetch
      setMessages([]);
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await getMessages(conversationId);
      // Reverse the messages array to show oldest first (chronological order)
      setMessages((data.messages || []).reverse());
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await markConversationAsRead(conversationId);
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (chatWS.isConnected() && conversationId) {
      // Clear existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Send typing_start
      chatWS.send('typing_start', { conversation_id: conversationId });
      
      // Set timeout to send typing_stop after 3 seconds of no typing
      const timeout = setTimeout(() => {
        chatWS.send('typing_stop', { conversation_id: conversationId });
      }, 3000);
      
      setTypingTimeout(timeout);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
    if (chatWS.isConnected() && conversationId) {
      chatWS.send('typing_stop', { conversation_id: conversationId });
    }

    setSending(true);
    try {
      // Send via WebSocket for real-time delivery
      if (chatWS.isConnected() && conversationId) {
        chatWS.send('send_message', {
          conversation_id: conversationId,
          text: newMessage.trim()
        });
        setNewMessage('');
        // Don't call onMessageSent - WebSocket will handle updates
      } else {
        // Fallback to REST API if WebSocket not connected
        const sentMessage = await sendMessage(
          conversationId, 
          newMessage.trim(), 
          conversationId ? null : otherUser?.username
        );
        setMessages([...messages, sentMessage]);
        setNewMessage('');
        if (onMessageSent) onMessageSent();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (messageId) => {
    if (!editText.trim()) return;

    try {
      const updated = await editMessage(messageId, editText.trim());
      setMessages(messages.map(m => m.id === messageId ? updated : m));
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  const handleDelete = async (messageId, type) => {
    if (!confirm(`Delete this message ${type === 'for_everyone' ? 'for everyone' : 'for you'}?`)) return;

    try {
      await deleteMessage(messageId, type);
      if (type === 'for_everyone') {
        setMessages(messages.map(m => 
          m.id === messageId 
            ? { ...m, is_deleted_for_everyone: true, text: '' }
            : m
        ));
      } else {
        setMessages(messages.filter(m => m.id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessageStatus = (message) => {
    if (message.sender_info?.username !== currentUsername) return null;
    
    // Check if message has been read (read_at timestamp exists)
    if (message.read_at) return <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />;
    // Check if delivered (delivered_at timestamp exists)
    if (message.delivered_at) return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    // Just sent
    return <Check className="w-3.5 h-3.5 text-slate-400" />;
  };

  if (!conversationId && !otherUser) {
    return (
      <div className="flex flex-col h-full w-full glass-panel border-white/5 rounded-2xl items-center justify-center bg-background/30 text-center px-6">
        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <MessageSquare className="w-10 h-10 text-slate-500" />
        </div>
        <h3 className="text-2xl font-bold font-heading text-white mb-2 tracking-tight">Your Chats</h3>
        <p className="text-slate-400 max-w-sm">Select a conversation from the sidebar to view messages or start a new chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full glass-panel border-white/5 rounded-2xl overflow-hidden bg-background/50 relative">
      {/* Header - FIXED, doesn't scroll */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-white/10 shadow-lg cursor-pointer hover:border-violet-500/50 transition-colors" onClick={() => setShowUserInfo(true)}>
              <AvatarImage src={otherUser?.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading font-semibold">
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {otherUser?.is_online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0d1017] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            )}
          </div>
          <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowUserInfo(true)}>
            <h3 className="text-lg font-bold font-heading text-white leading-tight">
              {otherUser?.first_name} {otherUser?.last_name}
            </h3>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-violet-400 uppercase tracking-wider font-semibold">
                {otherUser?.role}
              </span>
              {otherUser?.is_online && (
                <>
                  <span className="text-emerald-500 font-bold">•</span>
                  <span className="text-emerald-400 font-medium animate-pulse">online</span>
                </>
              )}
              {(otherUser?.registration_no || otherUser?.employee_id) && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">
                    {otherUser.registration_no || otherUser.employee_id}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/10 rounded-full">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0d1017]/95 border-white/10 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setShowUserInfo(true)} className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer text-[10px] py-1">
                <User className="w-3 h-3 mr-1.5 text-blue-400" /> View profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
                    // Optimistic UI update - clear messages immediately
                    setClearing(true);
                    const previousMessages = [...messages];
                    setMessages([]);
                    
                    try {
                      await onClearChat?.(conversationId);
                    } catch (err) {
                      // Restore messages on error
                      console.error('Failed to clear chat:', err);
                      setMessages(previousMessages);
                    } finally {
                      setClearing(false);
                    }
                  }
                }} 
                className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-300 cursor-pointer text-[10px] py-1"
              >
                <Eraser className="w-3 h-3 mr-1.5" /> Clear chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full w-full">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-end h-full text-center pb-8">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <span className="text-2xl">👋</span>
                </div>
                <p className="text-slate-400 text-sm">Say hello to start the conversation!</p>
              </div>
            ) : (
              <div className="flex flex-col justify-end min-h-full">
                <div className="space-y-6 pb-4">
              <AnimatePresence>
                {messages.map((message) => {
                  const isOwn = message.sender_info?.username === currentUsername;
                  const isDeleted = message.is_deleted_for_everyone;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex items-end gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {!isOwn && (
                        <Avatar className="w-8 h-8 shrink-0 mb-5">
                          <AvatarImage src={message.sender_info?.profile_picture_url} />
                          <AvatarFallback className="bg-white/10 text-xs text-white">
                            {message.sender_info?.first_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {editingMessageId === message.id ? (
                          <div className="bg-white/10 border border-white/20 p-3 rounded-2xl flex flex-col gap-2 w-full shadow-lg backdrop-blur-md">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="bg-black/20 border-white/10 text-white focus-visible:ring-violet-500 text-sm h-9"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEdit(message.id);
                                if (e.key === 'Escape') setEditingMessageId(null);
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-7 text-xs hover:bg-white/10">
                                <X className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                              <Button size="sm" onClick={() => handleEdit(message.id)} className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white">
                                <Check className="w-3 h-3 mr-1" /> Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={`group relative flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Chat Bubble */}
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                isDeleted 
                                  ? 'bg-white/5 border border-white/5 text-slate-500 italic' 
                                  : isOwn 
                                    ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(124,58,237,0.2)] rounded-br-sm' 
                                    : 'bg-white/10 text-slate-200 border border-white/5 rounded-bl-sm backdrop-blur-md'
                              }`}
                            >
                              {isDeleted ? '🚫 This message was deleted' : message.text}
                            </div>

                            {/* Message Actions (Hover Menu) */}
                            {isOwn && !isDeleted && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isOwn ? "end" : "start"} className="bg-[#0d1017]/95 border-white/10 backdrop-blur-xl">
                                    <DropdownMenuItem onClick={() => setShowMessageInfo(message)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                                      <Info className="w-3 h-3 mr-1.5 text-blue-400" /> Message info
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setEditingMessageId(message.id); setEditText(message.text); }} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                                      <Edit2 className="w-3 h-3 mr-1.5 text-violet-400" /> Edit Message
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(message.id, 'for_everyone')} className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 cursor-pointer text-[10px] py-1">
                                      <Trash2 className="w-3 h-3 mr-1.5" /> Delete for everyone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(message.id, 'for_me')} className="text-orange-400 focus:bg-orange-500/10 focus:text-orange-300 cursor-pointer text-[10px] py-1">
                                      <Trash2 className="w-3 h-3 mr-1.5" /> Delete for me
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Meta (Time on left, Status on right) */}
                        <div className={`flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-medium px-1 w-full ${isOwn ? 'justify-between' : 'justify-start'}`}>
                          <span>{formatTime(message.timestamp)}</span>
                          <div className="flex items-center gap-1">
                            {message.is_edited && !isDeleted && <span>• edited</span>}
                            {isOwn && !isDeleted && renderMessageStatus(message)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-px w-full" />
            </div>
            
            {/* Typing Indicator */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 px-4 py-2"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={otherUser?.profile_picture_url} />
                  <AvatarFallback className="bg-white/10 text-[10px] text-white">
                    {otherUser?.first_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white/10 rounded-2xl px-4 py-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </motion.div>
            )}
          </div>
        )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - FIXED at bottom */}
      <div className="p-4 bg-white/5 backdrop-blur-xl border-t border-white/5 z-20 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto relative">
          {/* Attachment Buttons */}
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="w-9 h-9 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="w-9 h-9 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>
          
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 h-12 rounded-xl pr-14"
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="absolute right-1.5 top-1.5 h-9 w-9 bg-violet-600 hover:bg-violet-500 text-white rounded-lg shadow-[0_0_10px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
          </Button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
            onChange={(e) => {
              // TODO: Handle file upload
              console.log('File selected:', e.target.files[0]);
            }}
          />
        </form>
      </div>

      {/* Message Info Dialog */}
      <AnimatePresence>
        {showMessageInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMessageInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-[#0d1017] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white font-heading">Message Info</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                  onClick={() => setShowMessageInfo(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Message Text */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-sm text-slate-200">{showMessageInfo.text}</p>
                </div>

                {/* Timestamps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-300">Sent</p>
                      <p className="text-[10px] text-slate-500">{formatFullDateTime(showMessageInfo.timestamp)}</p>
                    </div>
                  </div>

                  {showMessageInfo.delivered_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center shrink-0">
                        <CheckCheck className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-300">Delivered</p>
                        <p className="text-[10px] text-slate-500">{formatFullDateTime(showMessageInfo.delivered_at)}</p>
                      </div>
                    </div>
                  )}

                  {showMessageInfo.read_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <CheckCheck className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-300">Read</p>
                        <p className="text-[10px] text-slate-500">{formatFullDateTime(showMessageInfo.read_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Info Modal */}
      <UserInfoModal
        user={otherUser}
        isOpen={showUserInfo}
        onClose={() => setShowUserInfo(false)}
      />
    </div>
  );
}
