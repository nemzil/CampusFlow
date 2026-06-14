'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getAnnouncements, 
  createAnnouncement, 
  updateAnnouncement, 
  deleteAnnouncement 
} from '@/lib/api';
import { 
  Megaphone, Plus, Search, Pin, Trash2, 
  Edit2, Eye, Loader2, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { canAccessFullAdminConsole } from '@/lib/adminAccess';

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState('ALL'); // ALL, PINNED, ARCHIVED
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null); // null for create, object for edit

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    } else if (!authLoading && user && !canAccessFullAdminConsole(user)) {
      router.push('/admin');
    } else if (!authLoading && user) {
      fetchAnnouncements();
    }
  }, [user, authLoading, router, categoryFilter, filterType]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const filters = {
        category: categoryFilter !== 'ALL' ? categoryFilter.toLowerCase() : null,
      };
      
      const data = await getAnnouncements(filters);
      setAnnouncements(data.announcements || data || []);
    } catch (error) {
      showError(error.message || 'Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (ann) => {
    const pinnedCount = announcements.filter(a => a.pinned && !a.deleted).length;
    if (!ann.pinned && pinnedCount >= 3) {
      showError('Maximum 3 announcements can be pinned at a time. Please unpin another first.');
      return;
    }

    try {
      const updatedStatus = !ann.pinned;
      await updateAnnouncement(ann.announcement_id, { pinned: updatedStatus });
      showSuccess(`Announcement ${updatedStatus ? 'pinned' : 'unpinned'} successfully`);
      fetchAnnouncements();
    } catch (error) {
      showError(error.message || 'Failed to update pinned state');
    }
  };

  const handleDelete = async (announcementId) => {
    if (!confirm('Are you sure you want to delete this announcement? This action soft-deletes (archives) the announcement.')) return;
    try {
      await deleteAnnouncement(announcementId);
      showSuccess('Announcement deleted and moved to archive.');
      fetchAnnouncements();
    } catch (error) {
      showError(error.message || 'Failed to delete announcement');
    }
  };

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setShowFormModal(true);
  };

  const openEditModal = (ann) => {
    setEditingAnnouncement(ann);
    setShowFormModal(true);
  };

  // Local filtering based on search, pinned and archive filters
  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.content?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterType === 'PINNED') {
      return matchesSearch && a.pinned && !a.deleted;
    }
    if (filterType === 'ARCHIVED') {
      // If backend marks as deleted or soft deleted is true
      return matchesSearch && (a.deleted || a.is_deleted);
    }
    // Default ALL (excluding deleted)
    return matchesSearch && !a.deleted && !a.is_deleted;
  });

  const getCategoryTheme = (category) => {
    switch (category?.toLowerCase()) {
      case 'academic': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'events': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'rules': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'emergency': return 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
      case 'general':
      default: return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    }
  };

  if (authLoading || (loading && announcements.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading announcements board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-transparent text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Admin Portal</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Announcement Management</h1>
          <p className="text-slate-400 mt-1 font-sans">Draft, preview, publish, and target university announcements.</p>
        </div>
        
        <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] shrink-0 self-start sm:self-center">
          <Plus className="w-4 h-4 mr-2" /> Create Announcement
        </Button>
      </div>

      {/* Filter and Search controls */}
      <Card className="border-white/5 bg-black/20 backdrop-blur-xl">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          {/* Status View Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Archive State</span>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="All Active" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Active Announcements</SelectItem>
                <SelectItem value="PINNED">Pinned Only</SelectItem>
                <SelectItem value="ARCHIVED">Archived / Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Category</span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="RULES">Rules</SelectItem>
                <SelectItem value="EVENTS">Events</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Search Contents</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles, description body..." 
                className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of existing Announcements */}
      {filteredAnnouncements.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <Megaphone className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No announcements found</h3>
            <p className="text-slate-400 max-w-sm">No announcements matching the filters exist in the repository.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((ann) => {
              const excerpt = ann.content ? ann.content.replace(/<[^>]*>/g, '') : '';
              
              return (
                <motion.div
                  key={ann.announcement_id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Card className={`relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/25 transition-all duration-300 flex flex-col h-full ${
                    ann.pinned ? 'bg-gradient-to-br from-amber-500/[0.02] to-transparent border-amber-500/10' : ''
                  }`}>
                    {/* Status Top Strip */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      ann.category?.toLowerCase() === 'emergency' 
                        ? 'bg-rose-500' 
                        : ann.pinned ? 'bg-amber-500/40' : 'bg-violet-500/20'
                    }`} />

                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Identity Row */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-slate-500">
                            {new Date(ann.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`${getCategoryTheme(ann.category)} uppercase text-[9px] px-1.5`}>
                              {ann.category}
                            </Badge>
                            {ann.pinned && (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] px-1">
                                Pinned
                              </Badge>
                            )}
                          </div>
                        </div>
                        <h3 className="font-heading font-bold text-base text-white leading-snug line-clamp-1">{ann.title}</h3>
                      </div>

                      {/* Excerpt Body */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed flex-1">
                        {excerpt || "No plain text excerpt available."}
                      </p>

                      {/* Metrics */}
                      <div className="flex justify-between items-center text-[10px] text-slate-500 border-y border-white/5 py-2.5">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Read Count: {ann.read_count || 0}
                        </span>
                        <span className="text-slate-500">
                          {new Date(ann.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      {/* Controls Footer */}
                      <div className="flex gap-2 pt-2 mt-auto shrink-0">
                        {/* Edit: Only active updates can be edited */}
                        {!ann.deleted && !ann.is_deleted && (
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(ann)} className="flex-1 bg-white/5 hover:bg-white/10 text-white h-8 text-xs">
                            <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                          </Button>
                        )}
                        
                        {/* Pin status toggle */}
                        {!ann.deleted && !ann.is_deleted && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleTogglePin(ann)}
                            className={`h-8 px-2.5 text-white ${ann.pinned ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border-amber-500/25' : 'bg-white/5 hover:bg-white/10'}`}
                            title={ann.pinned ? 'Unpin Announcement' : 'Pin Announcement'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${ann.pinned ? 'fill-amber-400' : ''}`} />
                          </Button>
                        )}

                        {/* Delete trigger */}
                        {!ann.deleted && !ann.is_deleted && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => handleDelete(ann.announcement_id)}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 h-8 border-rose-500/10"
                            title="Archive Update"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Editor/Form Modal */}
      {showFormModal && (
        <AnnouncementFormModal
          announcement={editingAnnouncement}
          onClose={() => setShowFormModal(false)}
          onSuccess={() => {
            setShowFormModal(false);
            fetchAnnouncements();
          }}
        />
      )}
    </div>
  );
}

// --------------------------------- EDITOR FORM MODAL ---------------------------------
function AnnouncementFormModal({ announcement, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('write'); // write | preview
  const editorRef = useRef(null);

  // Form State
  const [title, setTitle] = useState(announcement ? announcement.title : '');
  const [category, setCategory] = useState(announcement ? announcement.category : 'general');
  const [content, setContent] = useState(announcement ? announcement.content : '');
  const [pinned, setPinned] = useState(announcement ? !!announcement.pinned : false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!title || title.length < 10) {
        throw new Error('Title must be at least 10 characters long.');
      }
      if (!content || content.length < 15) {
        throw new Error('Content body must be at least 15 characters long.');
      }

      const payload = {
        title,
        category: category.toLowerCase(),
        content,
        pinned
      };

      if (announcement) {
        // Edit Mode
        await updateAnnouncement(announcement.announcement_id, payload);
        showSuccess('Announcement updated successfully!');
      } else {
        // Create Mode
        await createAnnouncement(payload);
        showSuccess('Announcement published successfully!');
      }
      onSuccess();
    } catch (error) {
      showError(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  // Custom visual formatter utility
  const formatText = (command) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    switch (command) {
      case 'bold':
        replacement = `<strong>${selected || 'bold text'}</strong>`;
        break;
      case 'italic':
        replacement = `<em>${selected || 'italic text'}</em>`;
        break;
      case 'underline':
        replacement = `<u>${selected || 'underlined text'}</u>`;
        break;
      case 'link':
        const url = prompt('Enter the link URL:', 'https://');
        if (url === null) return;
        replacement = `<a href="${url}" target="_blank">${selected || 'link text'}</a>`;
        break;
      case 'list':
        replacement = `\n<ul>\n  <li>${selected || 'list item'}</li>\n</ul>\n`;
        break;
      default:
        return;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setContent(newContent);
    
    // Reset focus and cursor position after render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
        <DialogHeader className="p-4 pb-2 border-b border-white/5 shrink-0">
          <DialogTitle className="text-lg font-bold font-heading">
            {announcement ? `Edit Announcement: ${announcement.announcement_id}` : 'Draft New Announcement'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Publish notifications, events, regulations, or emergency alerts to all users.
          </DialogDescription>
        </DialogHeader>

        {/* Tab selector */}
        <div className="px-5 pt-2 flex justify-between border-b border-white/5 bg-black/10 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('write')}
              className={`pb-2 text-xs font-semibold px-2 transition-all ${
                activeTab === 'write' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compose Markdown/HTML
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-2 text-xs font-semibold px-2 transition-all ${
                activeTab === 'preview' ? 'text-violet-400 border-b-2 border-violet-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              Real-time Preview
            </button>
          </div>

          <div className="flex items-center gap-4 pb-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                checked={pinned} 
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded border-white/10 text-violet-600 focus:ring-violet-500/20 w-3.5 h-3.5 bg-background"
              />
              Pin to Top (Max 3)
            </label>
          </div>
        </div>

        <ScrollArea className="flex-1 p-5">
          <form id="announcement-form" onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {activeTab === 'write' ? (
                <motion.div
                  key="write"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Title */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title Headline *</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        placeholder="Short descriptive subject..."
                        className="h-9 text-xs bg-background/50 border-white/10 text-white"
                      />
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notification Category *</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                          <SelectItem value="rules">Rules</SelectItem>
                          <SelectItem value="emergency">Emergency Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Formatting Toolbar */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Content Description (Supports rich HTML) *</label>
                    <div className="flex gap-1.5 p-1.5 bg-black/40 border border-white/10 rounded-t-md border-b-0">
                      {['bold', 'italic', 'underline', 'link', 'list'].map(cmd => (
                        <button
                          key={cmd}
                          type="button"
                          onClick={() => formatText(cmd)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-semibold tracking-wider rounded uppercase text-slate-300"
                        >
                          {cmd}
                        </button>
                      ))}
                    </div>
                    
                    <textarea
                      ref={editorRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      rows={8}
                      placeholder="Write rich formatted details here. You can use the formatting toolbar or insert raw paragraph blocks..."
                      className="w-full p-3 text-xs bg-background/50 border border-white/10 rounded-b-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="p-5 border border-white/10 rounded-xl bg-white/[0.02] space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-violet-600/10 text-violet-400 border border-violet-500/20 uppercase text-[9px]">
                        {category}
                      </Badge>
                      {pinned && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-xl font-bold font-heading text-white">{title || "Untitled Announcement"}</h2>
                    
                    <div className="text-xs text-slate-500 flex gap-4">
                      <span>Publisher: Admin Office</span>
                      <span>Published: {new Date().toLocaleDateString()}</span>
                    </div>

                    <div className="h-px bg-white/10 w-full" />
                    
                    <div 
                      className="text-sm text-slate-300 leading-relaxed space-y-4 font-sans select-text prose prose-invert"
                      dangerouslySetInnerHTML={{ __html: content || "<p className='italic text-slate-500'>Write content description to see live visual preview.</p>" }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </ScrollArea>

        <div className="p-3.5 border-t border-white/5 bg-black/25 flex justify-end gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-8 text-xs">
            Cancel
          </Button>
          <Button type="submit" form="announcement-form" size="sm" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-8 text-xs">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Publishing...</> : announcement ? 'Update Announcement' : 'Publish Announcement'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
