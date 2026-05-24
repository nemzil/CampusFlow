'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getAnnouncements, 
  markAnnouncementAsRead, 
  getUnreadAnnouncementsCount 
} from '@/lib/api';
import { 
  Megaphone, Search, Pin, FileText, Download, Calendar, 
  User, CheckCircle, AlertTriangle, Eye, Loader2, ArrowRight, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AnnouncementsView({ role }) {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [announcements, setAnnouncements] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected detail modal
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchAnnouncements(currentPage);
    fetchUnreadCount();
  }, [categoryFilter, currentPage]);

  // Handle local searching with debounce/manual search button, or just trigger on input
  // To avoid hitting backend too frequently, we can fetch when category/page changes
  // and search query can be executed either locally or on click/enter. Let's do it on filter change!
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchAnnouncements(1); // Reset to page 1 on search
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const fetchAnnouncements = async (page = 1) => {
    setLoading(true);
    try {
      const filters = {
        skip: (page - 1) * 10,  // Convert page to skip
        limit: 10,
        category: categoryFilter !== 'ALL' ? categoryFilter.toLowerCase() : null
      };
      
      const data = await getAnnouncements(filters);
      setAnnouncements(data.announcements || data || []);
      setTotalCount(data.total || (data || []).length);
      setCurrentPage(page);
      setTotalPages(Math.ceil((data.total || 0) / 10) || 1);
    } catch (error) {
      showError(error.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadAnnouncementsCount();
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleOpenAnnouncement = async (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);

    // If unread, mark as read on backend
    if (!announcement.is_read) {
      try {
        await markAnnouncementAsRead(announcement.announcement_id);
        
        // Optimistic UI updates
        setAnnouncements(prev => prev.map(item => 
          item.announcement_id === announcement.announcement_id 
            ? { ...item, is_read: true } 
            : item
        ));
        
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
  };

  const getCategoryTheme = (category) => {
    switch (category?.toLowerCase()) {
      case 'academic':
        return {
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          border: 'border-blue-500/20',
          gradient: 'from-blue-600/10 to-transparent'
        };
      case 'events':
        return {
          badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          border: 'border-purple-500/20',
          gradient: 'from-purple-600/10 to-transparent'
        };
      case 'rules':
        return {
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          border: 'border-amber-500/20',
          gradient: 'from-amber-600/10 to-transparent'
        };
      case 'emergency':
        return {
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse',
          border: 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.05)]',
          gradient: 'from-rose-600/15 to-transparent'
        };
      case 'general':
      default:
        return {
          badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          border: 'border-cyan-500/20',
          gradient: 'from-cyan-600/10 to-transparent'
        };
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Split into pinned and regular announcements after applying local search filtering
  const filteredList = announcements.filter(a => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const matchesTitle = a.title?.toLowerCase().includes(searchLower);
    const matchesContent = a.content?.toLowerCase().includes(searchLower);
    return matchesTitle || matchesContent;
  });

  const pinnedAnnouncements = filteredList.filter(a => a.pinned && !a.deleted);
  const regularAnnouncements = filteredList.filter(a => !a.pinned && !a.deleted);


  return (
    <div className="space-y-6">
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20">Announcements Channel</Badge>
            {unreadCount > 0 && (
              <Badge className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[10px] animate-bounce">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">University Announcements</h1>
          <p className="text-slate-400 mt-1 font-sans text-sm">
            Read updates, exam schedules, and academic instructions from the university administration office.
          </p>
        </div>
      </div>

      {/* Filters Board */}
      <Card className="border-white/5 bg-black/20 backdrop-blur-xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {['ALL', 'ACADEMIC', 'RULES', 'EVENTS', 'GENERAL', 'EMERGENCY'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategoryFilter(cat);
                  setCurrentPage(1);
                }}
                className={`relative px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 border ${
                  categoryFilter === cat
                    ? 'bg-violet-600/25 border-violet-500/50 text-white shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                    : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements..." 
              className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main announcements flow */}
      {loading && announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
          Loading announcements board...
        </div>
      ) : announcements.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <Megaphone className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No announcements published</h3>
            <p className="text-slate-400 max-w-sm">No updates matched your filters or search keywords at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-amber-400" /> Pinned Announcements
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedAnnouncements.map((ann) => (
                  <AnnouncementCard 
                    key={ann.announcement_id} 
                    announcement={ann} 
                    theme={getCategoryTheme(ann.category)} 
                    onOpen={handleOpenAnnouncement} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Section */}
          {regularAnnouncements.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Announcements</h2>
              <div className="grid grid-cols-1 gap-4">
                {regularAnnouncements.map((ann) => (
                  <AnnouncementCard 
                    key={ann.announcement_id} 
                    announcement={ann} 
                    theme={getCategoryTheme(ann.category)} 
                    onOpen={handleOpenAnnouncement} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-xs text-slate-400 font-medium">Page {currentPage} of {totalPages} ({totalCount} total)</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 text-xs border-white/10 text-slate-300 hover:text-white"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 text-xs border-white/10 text-slate-300 hover:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Announcement Detail Dialog */}
      {showDetailModal && selectedAnnouncement && (
        <AnnouncementDetailModal
          announcement={selectedAnnouncement}
          theme={getCategoryTheme(selectedAnnouncement.category)}
          onClose={() => setShowDetailModal(false)}
          formatFileSize={formatFileSize}
        />
      )}
    </div>
  );
}

// --------------------------------- ANNOUNCEMENT CARD COMPONENT ---------------------------------
function AnnouncementCard({ announcement, theme, onOpen }) {
  const isUnread = !announcement.is_read;
  const isEmergency = announcement.category?.toLowerCase() === 'emergency';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={() => onOpen(announcement)}
      className="cursor-pointer"
    >
      <Card className={`relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/25 transition-all duration-300 ${
        isUnread ? 'ring-1 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.05)]' : ''
      } ${
        announcement.pinned ? 'bg-gradient-to-br from-amber-500/[0.03] to-transparent border-amber-500/10 hover:border-amber-500/20' : ''
      }`}>
        {/* Unread Top Highlight Strip or Emergency Blink Strip */}
        {isEmergency ? (
          <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-pulse" />
        ) : isUnread ? (
          <div className="absolute top-0 left-0 w-full h-1 bg-violet-600/70" />
        ) : announcement.pinned ? (
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/40" />
        ) : null}

        <CardContent className="p-5 flex flex-col space-y-3 relative">
          {/* Header metadata */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`${theme.badge} uppercase text-[9px] font-sans tracking-wide px-1.5`}>
                {announcement.category}
              </Badge>
              {announcement.pinned && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1">
                  Pinned
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Calendar className="w-3 h-3" />
              <span>{new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Title & Excerpt */}
          <div className="space-y-1">
            <h3 className={`font-heading font-bold text-base leading-snug group flex items-start gap-1.5 ${
              isUnread ? 'text-white font-semibold' : 'text-slate-200'
            }`}>
              {announcement.title}
              {isUnread && (
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5 shadow-[0_0_10px_rgba(139,92,246,0.8)]" title="Unread" />
              )}
            </h3>
            
            {/* HTML Stripping or Excerpt parsing */}
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {announcement.content ? announcement.content.replace(/<[^>]*>/g, '') : ''}
            </p>
          </div>

          {/* Footer stats / Actions */}
          <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-600" />
              <span>Office Admin</span>
            </div>

            <div className="flex items-center gap-2">
              {announcement.attachments && announcement.attachments.length > 0 && (
                <span className="flex items-center gap-1 font-sans text-slate-400">
                  <FileText className="w-3.5 h-3.5" />
                  {announcement.attachments.length} file{announcement.attachments.length > 1 ? 's' : ''}
                </span>
              )}

              <span className="flex items-center gap-0.5 text-violet-400 font-semibold group-hover:text-violet-300">
                View Update <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// --------------------------------- DETAIL MODAL COMPONENT ---------------------------------
function AnnouncementDetailModal({ announcement, theme, onClose, formatFileSize }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl flex flex-col max-h-[85vh]">
        <div className={`h-1 w-full shrink-0 ${announcement.pinned ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500'}`} />
        
        <DialogHeader className="p-5 pb-3.5 border-b border-white/5 shrink-0 relative">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className={`${theme.badge} uppercase text-[9px] px-1.5`}>
              {announcement.category}
            </Badge>
            {announcement.pinned && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1">
                Pinned
              </Badge>
            )}
            {announcement.edited && (
              <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20 text-[9px] px-1">
                Edited
              </Badge>
            )}
          </div>
          <DialogTitle className="text-xl font-bold font-heading text-white leading-snug">{announcement.title}</DialogTitle>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs mt-2 font-sans font-medium">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-600" />
              By: {announcement.created_by || 'University Administration'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              Published: {new Date(announcement.created_at).toLocaleString()}
            </span>
          </div>
        </DialogHeader>

        {/* Scrollable details view */}
        <ScrollArea className="flex-1 p-5">
          <div className="space-y-6">
            {/* Rich text body content */}
            <div 
              className="text-sm text-slate-300 leading-relaxed space-y-4 font-sans select-text prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: announcement.content }}
            />

            {/* Attachments Section */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attached Files</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {announcement.attachments.map((file, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-200 block truncate" title={file.filename}>
                            {file.filename}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono font-bold block">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      </div>
                      <a 
                        href={file.url} 
                        download={file.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 hover:text-white transition-colors text-slate-400"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action controls */}
        <div className="p-3.5 border-t border-white/5 bg-black/25 flex justify-end shrink-0">
          <Button onClick={onClose} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-xs px-4">
            Acknowledge Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
