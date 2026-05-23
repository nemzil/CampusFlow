'use client';

import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageSquarePlus, MessageSquare, Pin, MoreVertical, Check, CheckCheck, Archive, BellOff, ChevronDown, Clock, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import UserInfoModal from '@/components/UserInfoModal';

export default function ConversationList({ 
  conversations, 
  activeConversationId, 
  onSelectConversation, 
  onNewChat,
  onMarkAsRead,
  onMarkAsUnread,
  onArchive,
  onMute,
  onDelete,
  currentUsername
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState(null);

  // Separate archived and active conversations
  const activeConversations = conversations.filter(conv => !conv.is_archived);
  const archivedConversations = conversations.filter(conv => conv.is_archived);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncateText = (text, maxLength = 40) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderConversation = (conv) => {
    const isActive = activeConversationId === conv.id;
    const hasUnread = conv.unread_count > 0;
    
    // Get the other user (not current user)
    const otherUser = conv.participant_info?.find(p => p.username !== currentUsername) || conv.participant_info?.[0];
    
    return (
      <motion.div
        key={conv.id}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`
          relative p-2.5 rounded-xl cursor-pointer transition-all duration-300 flex gap-3 items-center group
          ${isActive 
            ? 'bg-violet-500/15 border border-violet-500/30 shadow-[0_0_20px_rgba(124,58,237,0.1)]' 
            : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10'}
        `}
      >
        {/* Active Indicator Strip */}
        {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-violet-500 rounded-r-full shadow-[0_0_10px_rgba(167,139,250,0.8)]" />}

        {/* Avatar - clickable to show user info */}
        <div 
          className="relative shrink-0 ml-1 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUserInfo(otherUser);
          }}
        >
          <div className="relative">
            <Avatar className={`w-10 h-10 border-2 ${isActive ? 'border-violet-500/50' : 'border-white/10'} shadow-lg transition-colors`}>
              <AvatarImage src={otherUser?.profile_picture_url} />
              <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading font-semibold text-xs">
                {otherUser?.first_name?.[0]}{otherUser?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {otherUser?.is_online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0d1017] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            )}
          </div>
          {conv.is_pinned && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-[#0d1017] shadow-sm">
              <Pin className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Content - clickable */}
        <div className="flex-1 min-w-0" onClick={() => onSelectConversation(conv)}>
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className={`text-xs font-semibold truncate font-heading ${hasUnread ? 'text-white' : 'text-slate-200'}`}>
              {otherUser?.first_name} {otherUser?.last_name}
            </h4>
            <span className={`text-[10px] shrink-0 font-medium ${hasUnread ? 'text-violet-400' : 'text-slate-500'}`}>
              {formatTimestamp(conv.updated_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] truncate ${hasUnread ? 'text-white font-medium' : 'text-slate-400'}`}>
              {conv.last_message?.sender_username === otherUser?.username ? '' : <span className="text-slate-500 font-medium">You: </span>}
              {truncateText(conv.last_message?.text || 'No messages yet')}
            </p>
            
            {hasUnread && (
              <Badge variant="default" className="shrink-0 bg-violet-500 hover:bg-violet-600 text-white border-0 shadow-[0_0_10px_rgba(139,92,246,0.5)] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px]">
                {conv.unread_count}
              </Badge>
            )}
          </div>
        </div>

        {/* Context Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0d1017]/95 border-white/10 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setSelectedUserInfo(otherUser)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                <User className="w-3 h-3 mr-1.5 text-blue-400" /> View profile
              </DropdownMenuItem>
              {hasUnread ? (
                <DropdownMenuItem onClick={() => onMarkAsRead?.(conv.id)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                  <Check className="w-3 h-3 mr-1.5 text-green-400" /> Mark as read
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onMarkAsUnread?.(conv.id)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                  <CheckCheck className="w-3 h-3 mr-1.5 text-slate-400" /> Mark as unread
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onArchive?.(conv.id, !conv.is_archived)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                <Archive className="w-3 h-3 mr-1.5 text-blue-400" /> {conv.is_archived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              
              {/* Mute submenu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1 text-[10px] outline-none transition-colors hover:bg-white/10 text-slate-300">
                    <BellOff className="w-3 h-3 mr-1.5 text-orange-400" />
                    <span>Mute notifications</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="bg-[#0d1017]/95 border-white/10 backdrop-blur-xl">
                  <DropdownMenuItem onClick={() => onMute?.(conv.id, 1)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                    <Clock className="w-3 h-3 mr-1.5 text-orange-400" /> For 1 hour
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMute?.(conv.id, 4)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                    <Clock className="w-3 h-3 mr-1.5 text-orange-400" /> For 4 hours
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMute?.(conv.id, 8)} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                    <Clock className="w-3 h-3 mr-1.5 text-orange-400" /> For 8 hours
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMute?.(conv.id, 'forever')} className="text-slate-300 focus:bg-white/10 cursor-pointer text-[10px] py-1">
                    <BellOff className="w-3 h-3 mr-1.5 text-orange-400" /> Until I unmute
                  </DropdownMenuItem>
                  {conv.is_muted && (
                    <DropdownMenuItem onClick={() => onMute?.(conv.id, 0)} className="text-green-300 focus:bg-green-500/10 cursor-pointer text-[10px] py-1">
                      <Check className="w-3 h-3 mr-1.5 text-green-400" /> Unmute
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenuItem onClick={() => onDelete?.(conv.id)} className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 cursor-pointer text-[10px] py-1">
                <Trash2 className="w-3 h-3 mr-1.5" /> Delete chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full glass-panel border-white/5 rounded-2xl overflow-hidden bg-background/50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md z-10 shrink-0">
        <div>
          <h2 className="text-lg font-bold font-heading text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            Chats
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
            {activeConversations.length} Active
          </p>
        </div>
        <Button 
          onClick={onNewChat}
          size="icon"
          className="rounded-full bg-violet-600 hover:bg-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-all shrink-0 w-9 h-9"
        >
          <MessageSquarePlus className="w-4 h-4 text-white" />
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 w-full h-full">
        {activeConversations.length === 0 && archivedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <MessageSquare className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-white font-medium mb-1 text-sm">No conversations yet</p>
            <p className="text-xs text-slate-400 mb-5">Start a new chat to connect.</p>
            <Button onClick={onNewChat} variant="outline" className="border-violet-500/30 text-violet-300 hover:bg-violet-500/20 hover:text-white text-xs h-8">
              Start a chat
            </Button>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {/* Active Conversations */}
            {activeConversations.map(renderConversation)}

            {/* Archived Section */}
            {archivedConversations.length > 0 && (
              <div className="pt-3">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archived ({archivedConversations.length})</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showArchived ? 'rotate-180' : ''}`} />
                </button>
                
                {showArchived && (
                  <div className="mt-1.5 space-y-1.5">
                    {archivedConversations.map(renderConversation)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* User Info Modal */}
      <UserInfoModal
        user={selectedUserInfo}
        isOpen={!!selectedUserInfo}
        onClose={() => setSelectedUserInfo(null)}
      />
    </div>
  );
}
