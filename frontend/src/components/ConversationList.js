'use client';

import { usePathname } from 'next/navigation';

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

  const pathname = usePathname();
  const isExamPortal = pathname?.includes('/exam-portal');

  const t = isExamPortal ? {
    bgActive: 'bg-amber-500/15',
    borderActive: 'border-amber-500/30',
    shadowActive: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    indicator: 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]',
    borderAvatarActive: 'border-amber-500/50',
    avatarFallback: 'from-amber-500 to-orange-600',
    textUnreadTime: 'text-amber-500',
    badge: 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
    iconHeader: 'text-amber-500',
    buttonNew: 'bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    btnOutlineText: 'text-amber-500',
    btnOutlineBorder: 'border-amber-500/30',
    btnOutlineHover: 'hover:bg-amber-500/20',
    textHeader: 'text-slate-800',
    textNameUnread: 'text-slate-900 font-bold',
    textNameRead: 'text-slate-700',
    textPreviewUnread: 'text-slate-800 font-bold',
    textPreviewRead: 'text-slate-500',
    bgHover: 'hover:bg-slate-50 hover:border-slate-200',
    bgDefault: 'bg-white border border-slate-100',
    headerBg: 'bg-slate-50 border-slate-200',
    emptyTitle: 'text-slate-800',
    emptySubtitle: 'text-slate-500',
    iconEmpty: 'text-amber-500 bg-amber-50',
    mainBg: 'bg-white border-slate-200',
  } : {
    bgActive: 'bg-sky-500/15',
    borderActive: 'border-sky-500/30',
    shadowActive: 'shadow-[0_0_20px_rgba(14,165,233,0.1)]',
    indicator: 'bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
    borderAvatarActive: 'border-sky-500/50',
    avatarFallback: 'from-sky-500 to-sky-600',
    textUnreadTime: 'text-sky-400',
    badge: 'bg-sky-500 hover:bg-sky-600 shadow-[0_0_10px_rgba(14,165,233,0.5)]',
    iconHeader: 'text-sky-400',
    buttonNew: 'bg-sky-500 hover:bg-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)]',
    btnOutlineText: 'text-sky-300',
    btnOutlineBorder: 'border-sky-500/30',
    btnOutlineHover: 'hover:bg-sky-500/20',
    textHeader: 'text-white',
    textNameUnread: 'text-white',
    textNameRead: 'text-slate-200',
    textPreviewUnread: 'text-white font-medium',
    textPreviewRead: 'text-slate-400',
    bgHover: 'hover:bg-white/10 hover:border-white/10',
    bgDefault: 'bg-white/5 border-transparent',
    headerBg: 'bg-white/5 border-white/5',
    emptyTitle: 'text-white',
    emptySubtitle: 'text-slate-400',
    iconEmpty: 'text-slate-500 bg-white/5',
    mainBg: 'bg-background/50 border-white/5 glass-panel',
  };

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
            ? `${t.bgActive} border ${t.borderActive} ${t.shadowActive}` 
            : `${t.bgDefault} border ${t.bgHover}`}
        `}
      >
        {/* Active Indicator Strip */}
        {isActive && <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full ${t.indicator}`} />}

        {/* Avatar - clickable to show user info */}
        <div 
          className="relative shrink-0 ml-1 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUserInfo(otherUser);
          }}
        >
          <div className="relative">
            <Avatar className={`w-10 h-10 border-2 ${isActive ? t.borderAvatarActive : 'border-white/10'} shadow-lg transition-colors`}>
              <AvatarImage src={otherUser?.profile_picture_url} />
              <AvatarFallback className={`bg-gradient-to-br ${t.avatarFallback} text-white font-heading font-semibold text-xs`}>
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
            <h4 className={`text-xs truncate font-heading ${hasUnread ? t.textNameUnread : t.textNameRead}`}>
              {otherUser?.first_name} {otherUser?.last_name}
            </h4>
            <span className={`text-[10px] shrink-0 font-medium ${hasUnread ? t.textUnreadTime : 'text-slate-500'}`}>
              {formatTimestamp(conv.updated_at)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] truncate ${hasUnread ? t.textPreviewUnread : t.textPreviewRead}`}>
              {conv.last_message?.sender_username === otherUser?.username ? '' : <span className={`${t.textPreviewRead} font-medium`}>You: </span>}
              {truncateText(conv.last_message?.text || 'No messages yet')}
            </p>
            
            {hasUnread && (
              <Badge variant="default" className={`shrink-0 ${t.badge} text-white border-0 px-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px]`}>
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
    <div className={`flex flex-col h-full w-full border rounded-2xl overflow-hidden ${t.mainBg}`}>
      {/* Header */}
      <div className={`p-4 flex items-center justify-between border-b backdrop-blur-md z-10 shrink-0 ${t.headerBg}`}>
        <div>
          <h2 className={`text-lg font-bold font-heading tracking-tight flex items-center gap-2 ${t.textHeader}`}>
            <MessageSquare className={`w-4 h-4 ${t.iconHeader}`} />
            Chats
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
            {activeConversations.length} Active
          </p>
        </div>
        <Button 
          onClick={onNewChat}
          size="icon"
          className={`rounded-full ${t.buttonNew} transition-all shrink-0 w-9 h-9`}
        >
          <MessageSquarePlus className="w-4 h-4 text-white" />
        </Button>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 w-full h-full">
        {activeConversations.length === 0 && archivedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${t.iconEmpty}`}>
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className={`font-medium mb-1 text-sm ${t.emptyTitle}`}>No conversations yet</p>
            <p className={`text-xs mb-5 ${t.emptySubtitle}`}>Start a new chat to connect.</p>
            <Button onClick={onNewChat} variant="outline" className={`border ${t.btnOutlineBorder} ${t.btnOutlineText} ${t.btnOutlineHover} hover:text-white text-xs h-8`}>
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
