'use client';

import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const isExamPortal = pathname?.includes('/exam-portal');

  const t = isExamPortal ? {
    avatarFallback: 'bg-amber-500',
    hoverBorder: 'hover:border-amber-400',
    textRole: 'text-amber-600',
    iconHover: 'hover:text-amber-600',
    bgIcon: 'bg-amber-500',
    bgIconHover: 'hover:bg-amber-600',
    textPrimary: 'text-amber-500',
    bgPrimary: 'bg-amber-500',
    bgPrimaryHover: 'hover:bg-amber-600',
    ringPrimary: 'focus-visible:ring-amber-500',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-600',
  } : {
    avatarFallback: 'bg-sky-500',
    hoverBorder: 'hover:border-sky-350',
    textRole: 'text-sky-600',
    iconHover: 'hover:text-sky-600',
    bgIcon: 'bg-sky-500',
    bgIconHover: 'hover:bg-sky-600',
    textPrimary: 'text-sky-500',
    bgPrimary: 'bg-sky-500',
    bgPrimaryHover: 'hover:bg-sky-600',
    ringPrimary: 'focus-visible:ring-sky-500',
    bgLight: 'bg-sky-50',
    textDark: 'text-sky-600',
  };

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
    if (message.read_at) return <CheckCheck className={`w-3.5 h-3.5 ${t.textPrimary}`} />;
    // Check if delivered (delivered_at timestamp exists)
    if (message.delivered_at) return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
    // Just sent
    return <Check className="w-3.5 h-3.5 text-slate-400" />;
  };

  if (!conversationId && !otherUser) {
    return (
      <div className="flex flex-col h-full w-full border border-slate-200 bg-white rounded-2xl items-center justify-center text-center px-6 shadow-sm">
        <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-slate-400" />
        </div>
        <h3 className="text-2xl font-bold font-heading text-slate-800 mb-2 tracking-tight">Your Chats</h3>
        <p className="text-slate-500 max-w-sm text-sm">Select a conversation from the sidebar to view messages or start a new chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm relative">
      {/* Header - FIXED, doesn't scroll */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-slate-50 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className={`w-10 h-10 border border-slate-200 shadow-sm cursor-pointer ${t.hoverBorder} transition-colors`} onClick={() => setShowUserInfo(true)}>
              <AvatarImage src={otherUser?.profile_picture_url} />
              <AvatarFallback className={`${t.avatarFallback} text-white font-heading font-semibold`}>
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {otherUser?.is_online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border border-white rounded-full animate-pulse" />
            )}
          </div>
          <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowUserInfo(true)}>
            <h3 className="text-sm font-bold font-heading text-slate-800 leading-tight">
              {otherUser?.first_name} {otherUser?.last_name}
            </h3>
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <span className={`${t.textRole} uppercase tracking-wider font-bold`}>
                {otherUser?.role}
              </span>
              {otherUser?.is_online && (
                <>
                  <span className="text-emerald-500 font-bold">•</span>
                  <span className="text-emerald-600 font-medium">online</span>
                </>
              )}
              {(otherUser?.registration_no || otherUser?.employee_id) && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-400 font-mono">
                    {otherUser.registration_no || otherUser.employee_id}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-full cursor-pointer">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-slate-200">
              <DropdownMenuItem onClick={() => setShowUserInfo(true)} className="text-slate-700 focus:bg-slate-50 cursor-pointer text-xs py-1.5 font-bold">
                <User className={`w-3.5 h-3.5 mr-1.5 ${t.textPrimary}`} /> View Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={async () => {
                  if (confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
                    setClearing(true);
                    const previousMessages = [...messages];
                    setMessages([]);
                    
                    try {
                      await onClearChat?.(conversationId);
                    } catch (err) {
                      console.error('Failed to clear chat:', err);
                      setMessages(previousMessages);
                    } finally {
                      setClearing(false);
                    }
                  }
                }} 
                className="text-red-650 focus:bg-red-50 focus:text-red-700 cursor-pointer text-xs py-1.5 font-bold"
              >
                <Eraser className="w-3.5 h-3.5 mr-1.5 text-red-500" /> Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden relative bg-slate-50/20">
        <ScrollArea className="h-full w-full">
          <div className="p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <Loader2 className={`w-8 h-8 animate-spin ${t.textPrimary}`} />
                <p className="text-sm">Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-end h-full text-center pb-8">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                  <span className="text-2xl">👋</span>
                </div>
                <p className="text-slate-500 text-sm">Say hello to start the conversation!</p>
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
                          <AvatarFallback className="bg-slate-100 text-xs text-slate-600 font-bold">
                            {message.sender_info?.first_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        {editingMessageId === message.id ? (
                          <div className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-2 w-full shadow-sm">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className={`bg-slate-50 border-slate-200 text-slate-800 ${t.ringPrimary} text-sm h-9`}
                              autoFocus
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEdit(message.id);
                                  if (e.key === 'Escape') setEditingMessageId(null);
                                }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => setEditingMessageId(null)} className="h-7 text-xs hover:bg-slate-50 cursor-pointer">
                                <X className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                              <Button size="sm" onClick={() => handleEdit(message.id)} className={`h-7 text-xs ${t.bgPrimary} ${t.bgPrimaryHover} text-white font-bold cursor-pointer`}>
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
                                  ? 'bg-slate-100 border border-slate-200 text-slate-400 italic' 
                                  : isOwn 
                                    ? `${t.bgPrimary} text-white shadow-sm rounded-br-sm` 
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                              }`}
                            >
                              {isDeleted ? '🚫 This message was deleted' : message.text}
                            </div>

                            {/* Message Actions */}
                            {isOwn && !isDeleted && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align={isOwn ? "end" : "start"} className="bg-white border-slate-250/20 shadow-lg">
                                    <DropdownMenuItem onClick={() => setShowMessageInfo(message)} className="text-slate-700 focus:bg-slate-50 cursor-pointer text-[10px] py-1.5 font-bold">
                                      <Info className={`w-3.5 h-3.5 mr-1.5 ${t.textPrimary}`} /> Message Info
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => { setEditingMessageId(message.id); setEditText(message.text); }} className="text-slate-700 focus:bg-slate-50 cursor-pointer text-[10px] py-1.5 font-bold">
                                      <Edit2 className={`w-3.5 h-3.5 mr-1.5 ${t.textPrimary}`} /> Edit Message
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(message.id, 'for_everyone')} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer text-[10px] py-1.5 font-bold">
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete for Everyone
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(message.id, 'for_me')} className="text-amber-700 focus:bg-amber-50 focus:text-amber-800 cursor-pointer text-[10px] py-1.5 font-bold">
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete for Me
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Meta */}
                        <div className={`flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-bold px-1 w-full ${isOwn ? 'justify-between' : 'justify-start'}`}>
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
                  <AvatarFallback className="bg-slate-100 text-[10px] text-slate-500 font-bold">
                    {otherUser?.first_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-slate-200/50 rounded-2xl px-4 py-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </motion.div>
            )}
          </div>
        )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - FIXED at bottom */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 z-20 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto relative">
          {/* Attachment Buttons */}
          <div className="flex gap-1 shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={`w-9 h-9 rounded-lg text-slate-400 ${t.iconHover} hover:bg-slate-100 cursor-pointer`}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="w-9 h-9 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>
          
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className={`flex-1 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 ${t.ringPrimary} h-11 rounded-xl pr-14`}
            disabled={sending}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending}
            size="icon"
            className={`absolute right-1 top-1 h-9 w-9 ${t.bgPrimary} ${t.bgPrimaryHover} text-white rounded-lg disabled:opacity-50 disabled:shadow-none transition-all cursor-pointer shadow-sm`}
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMessageInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-850 font-heading">Message Info</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setShowMessageInfo(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Message Text */}
                <div className="bg-slate-550/5 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs text-slate-650 font-medium">{showMessageInfo.text}</p>
                </div>

                {/* Timestamps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full ${t.bgLight} flex items-center justify-center shrink-0`}>
                      <Check className={`w-4 h-4 ${t.textPrimary}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-600">Sent</p>
                      <p className="text-[10px] text-slate-450 font-bold mt-0.5">{formatFullDateTime(showMessageInfo.timestamp)}</p>
                    </div>
                  </div>

                  {showMessageInfo.delivered_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                        <CheckCheck className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-600">Delivered</p>
                        <p className="text-[10px] text-slate-450 font-bold mt-0.5">{formatFullDateTime(showMessageInfo.delivered_at)}</p>
                      </div>
                    </div>
                  )}

                  {showMessageInfo.read_at && (
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${t.bgLight} flex items-center justify-center shrink-0`}>
                        <CheckCheck className={`w-4 h-4 ${t.textDark}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-600">Read</p>
                        <p className="text-[10px] text-slate-450 font-bold mt-0.5">{formatFullDateTime(showMessageInfo.read_at)}</p>
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
