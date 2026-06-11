'use client';

<<<<<<< HEAD
import { useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckSquare, Users, MessageSquare, LogOut, GraduationCap, User, ChevronLeft, ChevronRight, BookOpen, Megaphone, BookMarked, Calendar, ClipboardList, Video, FileQuestion, DollarSign, CalendarDays, ShieldCheck, BarChart3 } from 'lucide-react';
=======
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckSquare, Users, MessageSquare, LogOut, GraduationCap, User, ChevronLeft, ChevronRight, BookOpen, Megaphone, BookMarked, Calendar, ClipboardList } from 'lucide-react';
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

<<<<<<< HEAD
function SidebarComponent({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isLinkActive = (linkPath) => {
    const [linkPathname, linkQuery] = linkPath.split('?');
    if (pathname !== linkPathname) return false;
    if (!linkQuery) {
      // plain path — active only if no conflicting query tab
      const tab = searchParams.get('tab');
      // if siblings have ?tab= params, don't match the plain path
      return !tab || linkPath === linkPathname;
    }
    const params = new URLSearchParams(linkQuery);
    for (const [key, val] of params.entries()) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  };
=======
export default function Sidebar({ role }) {
  const pathname = usePathname();
  const router = useRouter();
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
  const { user, logout } = useAuth();
  const { toggleSidebar, state } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getNavigationLinks = () => {
    const baseLinks = [
      { path: `/${role.toLowerCase()}`, label: 'Dashboard', Icon: Home },
    ];

    if (role === 'STUDENT') {
      baseLinks.push({ path: '/student/courses', label: 'Course Catalog', Icon: BookOpen });
      baseLinks.push({ path: '/student/enrollment', label: 'Enrollment', Icon: BookMarked });
      baseLinks.push({ path: '/student/assignments', label: 'Assignments', Icon: ClipboardList });
      baseLinks.push({ path: '/student/attendance', label: 'Attendance', Icon: Calendar });
      baseLinks.push({ path: '/student/todos', label: 'My Todos', Icon: CheckSquare });
<<<<<<< HEAD
      baseLinks.push({ path: '/student/lectures', label: 'Lectures', Icon: Video });
      baseLinks.push({ path: '/student/fees', label: 'Fee Voucher', Icon: DollarSign });
      baseLinks.push({ path: '/student/timetable', label: 'My Timetable', Icon: CalendarDays });
      baseLinks.push({ path: '/student/admit-card', label: 'Admit Card', Icon: ClipboardList });
      baseLinks.push({ path: '/student/results', label: 'Results', Icon: GraduationCap });
=======
      baseLinks.push({ path: '/student/exams', label: 'Exams', Icon: GraduationCap });
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      baseLinks.push({ path: '/student/announcements', label: 'Announcements', Icon: Megaphone });
    }

    if (role === 'TEACHER') {
      baseLinks.push({ path: '/teacher/courses', label: 'My Courses', Icon: BookOpen });
<<<<<<< HEAD
      baseLinks.push({ path: '/teacher/assignments?tab=ASSIGNMENT', label: 'Assignments', Icon: ClipboardList });
      baseLinks.push({ path: '/teacher/assignments?tab=QUIZ', label: 'Quizzes', Icon: FileQuestion });
      baseLinks.push({ path: '/teacher/attendance', label: 'Attendance', Icon: Calendar });
      baseLinks.push({ path: '/teacher/todos', label: 'My Todos', Icon: CheckSquare });
      baseLinks.push({ path: '/teacher/lectures', label: 'Lectures', Icon: Video });
      baseLinks.push({ path: '/teacher/exams', label: 'Exams', Icon: GraduationCap });
      baseLinks.push({ path: '/teacher/manage-results', label: 'Manage Results', Icon: BarChart3 });
      baseLinks.push({ path: '/teacher/timetable', label: 'My Schedule', Icon: CalendarDays });
      baseLinks.push({ path: '/teacher/invigilation', label: 'Invigilation', Icon: ShieldCheck });
=======
      baseLinks.push({ path: '/teacher/assignments', label: 'Assignments', Icon: ClipboardList });
      baseLinks.push({ path: '/teacher/attendance', label: 'Attendance', Icon: Calendar });
      baseLinks.push({ path: '/teacher/todos', label: 'My Todos', Icon: CheckSquare });
      baseLinks.push({ path: '/teacher/exams', label: 'Exams', Icon: GraduationCap });
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      baseLinks.push({ path: '/teacher/announcements', label: 'Announcements', Icon: Megaphone });
    }

    if (role === 'ADMIN') {
<<<<<<< HEAD
      if (user?.admin_level === 'COURSE_MANAGEMENT_ADMIN') {
        baseLinks.push({ path: '/admin/courses', label: 'Courses', Icon: BookOpen });
        baseLinks.push({ path: '/admin/enrollment', label: 'Enrollments', Icon: BookMarked });
        baseLinks.push({ path: '/admin/attendance', label: 'Attendance', Icon: Calendar });
      } else if (user?.admin_level === 'EXAM_MANAGEMENT_ADMIN') {
        baseLinks.push({ path: '/admin/timetable', label: 'Timetable', Icon: CalendarDays });
        baseLinks.push({ path: '/admin/admit-card', label: 'Admit Card', Icon: ClipboardList });
        baseLinks.push({ path: '/admin/manage-results', label: 'Manage Results', Icon: GraduationCap });
      } else if (user?.admin_level === 'FEE_MANAGEMENT_ADMIN') {
        baseLinks.push({ path: '/admin/fees?tab=structures', label: 'Fee Structure', Icon: DollarSign });
        baseLinks.push({ path: '/admin/fees?tab=verification', label: 'Fee Verification', Icon: ShieldCheck });
      } else {
        baseLinks.push({ path: '/admin/courses', label: 'Courses', Icon: BookOpen });
        baseLinks.push({ path: '/admin/attendance', label: 'Attendance', Icon: Calendar });
        baseLinks.push({ path: '/admin/users', label: 'User Management', Icon: Users });
        baseLinks.push({ path: '/admin/timetable', label: 'Timetable', Icon: CalendarDays });
        baseLinks.push({ path: '/admin/admit-card', label: 'Admit Card', Icon: ClipboardList });
        baseLinks.push({ path: '/admin/announcements', label: 'Announcements', Icon: Megaphone });
        baseLinks.push({ path: '/admin/fees', label: 'Fee Structure', Icon: DollarSign });
      }
=======
      baseLinks.push({ path: '/admin/courses', label: 'Courses', Icon: BookOpen });
      baseLinks.push({ path: '/admin/enrollment', label: 'Enrollments', Icon: BookMarked });
      baseLinks.push({ path: '/admin/attendance', label: 'Attendance', Icon: Calendar });
      baseLinks.push({ path: '/admin/users', label: 'User Management', Icon: Users });
      baseLinks.push({ path: '/admin/announcements', label: 'Announcements', Icon: Megaphone });
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    }

    baseLinks.push({ path: `/${role.toLowerCase()}/messages`, label: 'Chat', Icon: MessageSquare });

    return baseLinks;
  };


  const links = getNavigationLinks();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ShadcnSidebar 
      collapsible="icon" 
      className="border-r-0 bg-[rgba(10,15,30,0.4)] backdrop-blur-[24px] shadow-[10px_0_30px_rgba(0,0,0,0.3)] !sticky !top-0 !h-screen"
    >
      {/* Floating Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white shadow-lg z-50 transition-colors"
      >
        {state === 'collapsed' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <SidebarHeader className="border-b border-white/5 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className="text-lg font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-indigo-500 tracking-tight">
              CampusFlow
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-widest text-violet-400">SSUET Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 relative">
              {/* Animated background indicator */}
              {links.map((link, index) => {
<<<<<<< HEAD
                const isActive = isLinkActive(link.path);
=======
                const isActive = pathname === link.path;
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                if (isActive) {
                  return (
                    <motion.div
                      key="active-bg"
                      layoutId="active-nav-bg"
                      className="absolute h-10 bg-gradient-to-r from-violet-500/15 to-indigo-500/15 border border-violet-500/25 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                      initial={false}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 35,
                        mass: 0.8
                      }}
                      style={{
                        top: `${index * 44}px`,
                        left: 0,
                        right: 0,
                        willChange: 'transform'
                      }}
                    />
                  );
                }
                return null;
              })}
              
              {links.map((link) => {
                const LinkIcon = link.Icon;
<<<<<<< HEAD
                const isActive = isLinkActive(link.path);
=======
                const isActive = pathname === link.path;
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                
                return (
                  <SidebarMenuItem key={link.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={link.label}
                      className={`
                        relative rounded-xl transition-all duration-300 h-10
                        ${isActive 
                          ? 'text-white' 
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }
                        ${isActive ? 'before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-1 before:bg-gradient-to-b before:from-violet-500 before:to-indigo-500 before:rounded-r before:shadow-[0_0_10px_rgba(139,92,246,0.8)] group-data-[collapsible=icon]:before:hidden' : ''}
                      `}
                    >
                      <Link href={link.path} className="flex items-center gap-3 w-full">
                        <LinkIcon className="w-6 h-6 flex-shrink-0" />
                        <span className="font-medium">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/5 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative">
              <SidebarMenuButton 
                size="lg" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="data-[state=open]:bg-white/5 hover:bg-white/5 border border-white/5 rounded-xl bg-white/[0.03] transition-all duration-300 w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
              >
                <Avatar className="h-10 w-10 rounded-full border-2 border-violet-500/40 shadow-[0_0_10px_rgba(139,92,246,0.2)] flex-shrink-0">
                  <AvatarImage src={user?.profile_picture_url} alt={user?.first_name} />
                  <AvatarFallback className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-white">{user?.first_name} {user?.last_name}</span>
                  <span className="truncate text-xs text-violet-400 uppercase tracking-wider font-semibold">{role}</span>
                </div>
              </SidebarMenuButton>
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: 8, height: 0 }}
                    transition={{ 
                      duration: 0.2,
                      ease: [0.25, 0.1, 0.25, 1]
                    }}
                    className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#0a0b14] border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden"
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <Link href={`/${role.toLowerCase()}/profile`}>
                      <motion.div
                        whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                        className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white transition-colors cursor-pointer border-b border-white/5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">Edit Profile</span>
                      </motion.div>
                    </Link>
                    <motion.div
                      whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Logout</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
<<<<<<< HEAD

export default function Sidebar(props) {
  return (
    <Suspense fallback={null}>
      <SidebarComponent {...props} />
    </Suspense>
  );
}
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
