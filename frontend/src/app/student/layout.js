'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePathname, useRouter } from 'next/navigation';
import { Search, User, Bell, Megaphone, ClipboardList, MessageSquare, Loader2, ArrowRight } from 'lucide-react';
import { getAnnouncements, getStudentAssignments, getConversations } from '@/lib/api';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import './dashboard.css';

function StudentHeader() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const searchRef = useRef(null);
  const notificationRef = useRef(null);

  const routes = [
    { label: 'Student Dashboard', path: '/student', keywords: 'home dashboard statistics overview' },
    { label: 'Course Catalog', path: '/student/courses', keywords: 'courses catalog study registration list' },
    { label: 'Course Enrollment', path: '/student/enrollment', keywords: 'enrollment register drop courses register' },
    { label: 'My Assignments', path: '/student/assignments', keywords: 'assignments quizzes homework tasks' },
    { label: 'My Attendance Logs', path: '/student/attendance', keywords: 'attendance present absent details summary percentage' },
    { label: 'My Todo List', path: '/student/todos', keywords: 'todos tasks checklist reminder' },
    { label: 'Lecture Videos', path: '/student/lectures', keywords: 'lectures videos online recordings classes class' },
    { label: 'Fee Voucher & Payments', path: '/student/fees', keywords: 'fees payment voucher tuition billing' },
    { label: 'Timetable Schedule', path: '/student/timetable', keywords: 'timetable schedule class classes routine' },
    { label: 'Admit Card', path: '/student/admit-card', keywords: 'admit card hall ticket roll number exam' },
    { label: 'Results & Transcript', path: '/student/results', keywords: 'results gpa cgpa marks grade transcript report' },
    { label: 'Announcements Board', path: '/student/announcements', keywords: 'announcements news updates notices alert' },
    { label: 'Edit Profile', path: '/student/profile', keywords: 'profile settings password personal photo' },
    { label: 'Chat Messages', path: '/student/messages', keywords: 'chat messages discussion teacher group channel inbox' }
  ];

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = routes.filter(r => 
      r.label.toLowerCase().includes(q) || r.keywords.toLowerCase().includes(q)
    );
    setSearchResults(matches);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotificationsData = async () => {
    if (!user) return;
    setLoadingNotifications(true);
    try {
      const [annList, assignList, chats] = await Promise.all([
        getAnnouncements({ limit: 5 }).catch(() => null),
        getStudentAssignments().catch(() => []),
        getConversations().catch(() => [])
      ]);

      const items = [];

      // Announcements
      const announcements = annList?.announcements || annList || [];
      if (Array.isArray(announcements)) {
        announcements.slice(0, 3).forEach(ann => {
          items.push({
            id: `ann-${ann.id || ann._id}`,
            title: `New Announcement`,
            desc: ann.title,
            link: '/student/announcements',
            Icon: Megaphone,
            iconClass: 'text-sky-500 bg-sky-50',
            time: ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recent'
          });
        });
      }

      // Assignments
      if (Array.isArray(assignList)) {
        assignList.filter(a => !a.is_submitted).slice(0, 2).forEach(assign => {
          items.push({
            id: `assign-${assign.id}`,
            title: `Assignment Due`,
            desc: `${assign.title} (${assign.course_code || 'Course'})`,
            link: '/student/assignments',
            Icon: ClipboardList,
            iconClass: 'text-amber-500 bg-amber-50',
            time: assign.due_date ? `Due: ${new Date(assign.due_date).toLocaleDateString()}` : 'Pending'
          });
        });
      }

      // Chats
      if (Array.isArray(chats)) {
        chats.filter(c => c.unread_count > 0).slice(0, 2).forEach(c => {
          items.push({
            id: `chat-${c.id}`,
            title: `Unread Message`,
            desc: `From ${c.recipient_name || 'Inbox'} (${c.unread_count} new)`,
            link: '/student/messages',
            Icon: MessageSquare,
            iconClass: 'text-emerald-500 bg-emerald-50',
            time: 'Chat'
          });
        });
      }

      setNotifications(items);
    } catch (e) {
      console.error("Failed to load layout notifications", e);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotificationsData();
    }
  }, [user]);

  if (!user) return null;

  return (
    <header className="student-header sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md">
      {/* Search Bar - Client Searchable */}
      <div ref={searchRef} className="relative w-64">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder="Search portal modules..."
            className="w-full h-9 rounded-xl border border-slate-200 pl-9 pr-4 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-sans"
          />
        </div>

        {/* Search Dropdown */}
        {showSearchDropdown && searchQuery.trim() !== '' && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 w-full max-h-60 overflow-y-auto py-1.5">
            {searchResults.length > 0 ? (
              searchResults.map((r, i) => (
                <div
                  key={i}
                  onClick={() => {
                    router.push(r.path);
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center transition-colors"
                >
                  <span className="font-semibold">{r.label}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-xs text-slate-400 font-sans">No matching sections found</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Popover */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              fetchNotificationsData();
            }}
            className="p-2 text-slate-500 hover:text-sky-500 rounded-xl hover:bg-slate-100/80 border border-transparent hover:border-slate-100 transition-all relative cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute top-full right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800 font-heading">Portal Highlights</span>
                {notifications.length > 0 && (
                  <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px]" variant="outline">
                    {notifications.length} Active
                  </Badge>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifications && notifications.length === 0 ? (
                  <div className="p-4 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                    <span className="text-xs text-slate-400 font-sans">Updating feed...</span>
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((n) => {
                    const IconComp = n.Icon;
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          router.push(n.link);
                          setShowNotifications(false);
                        }}
                        className="p-3.5 hover:bg-slate-50/60 transition-colors cursor-pointer flex gap-3 items-start"
                      >
                        <div className={`p-1.5 rounded-lg border border-slate-100 flex-shrink-0 ${n.iconClass}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-900 leading-tight">{n.title}</p>
                          <p className="text-[11.5px] text-slate-500 font-medium truncate mt-0.5">{n.desc}</p>
                          <span className="text-[9px] text-slate-400 font-mono font-bold mt-1.5 block leading-none">{n.time}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 font-sans">
                    All caught up! No new notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Button - styled exactly like the original sidenavbar profile card */}
        <Link href="/student/profile" className="my-auto flex items-center">
          <div className="flex items-center gap-3 px-3 py-1 border border-slate-200/80 rounded-xl bg-white/80 hover:bg-slate-50 transition-all duration-300 shadow-sm cursor-pointer text-slate-700">
            <div className="h-10 w-10 rounded-full border-2 border-sky-500/30 flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600 text-white font-bold text-sm">
              {user.profile_picture_url ? (
                <img src={user.profile_picture_url} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
              )}
            </div>
            <div className="flex flex-col text-left hidden sm:flex leading-tight">
              <span className="truncate font-semibold text-slate-800 text-sm">{user.first_name} {user.last_name}</span>
              <span className="truncate text-[9px] uppercase font-bold tracking-wider text-sky-600">Student</span>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}

export default function StudentLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname.includes('/login');

  if (isLoginPage) {
    return (
      <AuthProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider>
          <Sidebar role="STUDENT" />
          <SidebarInset className="bg-white text-[var(--on-background)] min-h-screen border-l border-slate-200 flex flex-col">
            <StudentHeader />
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
