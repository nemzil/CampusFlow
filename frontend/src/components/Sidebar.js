'use client';

import { useState, Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, CheckSquare, Users, MessageSquare, LogOut, GraduationCap, User, ChevronLeft, ChevronRight, BookOpen, Megaphone, BookMarked, Calendar, ClipboardList, Video, FileQuestion, DollarSign, CalendarDays, ShieldCheck, BarChart3 } from 'lucide-react';
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

function SidebarComponent({ role }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const isLinkActive = (linkPath) => {
    const [linkPathname, linkQuery] = linkPath.split('?');
    if (pathname !== linkPathname) return false;
    if (!linkQuery) {
      const tab = searchParams.get('tab');
      return !tab || linkPath === linkPathname;
    }
    const params = new URLSearchParams(linkQuery);
    for (const [key, val] of params.entries()) {
      if (searchParams.get(key) !== val) return false;
    }
    return true;
  };
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
      baseLinks.push({ path: '/student/lectures', label: 'Lectures', Icon: Video });
      baseLinks.push({ path: '/student/fees', label: 'Fee Voucher', Icon: DollarSign });
      baseLinks.push({ path: '/student/timetable', label: 'My Timetable', Icon: CalendarDays });
      baseLinks.push({ path: '/student/admit-card', label: 'Admit Card', Icon: ClipboardList });
      baseLinks.push({ path: '/student/results', label: 'Results', Icon: GraduationCap });
      baseLinks.push({ path: '/student/announcements', label: 'Announcements', Icon: Megaphone });
    }

    if (role === 'TEACHER') {
      baseLinks.push({ path: '/teacher/courses', label: 'My Courses', Icon: BookOpen });
      baseLinks.push({ path: '/teacher/assignments?tab=ASSIGNMENT', label: 'Assignments', Icon: ClipboardList });
      baseLinks.push({ path: '/teacher/assignments?tab=QUIZ', label: 'Quizzes', Icon: FileQuestion });
      baseLinks.push({ path: '/teacher/attendance', label: 'Attendance', Icon: Calendar });
      baseLinks.push({ path: '/teacher/todos', label: 'My Todos', Icon: CheckSquare });
      baseLinks.push({ path: '/teacher/lectures', label: 'Lectures', Icon: Video });
      baseLinks.push({ path: '/teacher/exams', label: 'Exams', Icon: GraduationCap });
      baseLinks.push({ path: '/teacher/manage-results', label: 'Manage Results', Icon: BarChart3 });
      baseLinks.push({ path: '/teacher/timetable', label: 'My Schedule', Icon: CalendarDays });
      baseLinks.push({ path: '/teacher/invigilation', label: 'Invigilation', Icon: ShieldCheck });
      baseLinks.push({ path: '/teacher/announcements', label: 'Announcements', Icon: Megaphone });
    }

    if (role === 'ADMIN') {
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
    }

    baseLinks.push({ path: `/${role.toLowerCase()}/messages`, label: 'Chat', Icon: MessageSquare });

    return baseLinks;
  };

  const links = getNavigationLinks();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Theme specs for student (sky blue), teacher (emerald), admin (indigo)
  const theme = {
    STUDENT: {
      accent: 'text-sky-500',
      activeText: 'text-sky-600',
      activeBg: 'bg-sky-50/70 border border-sky-100/50',
      indicator: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
      logoGrad: 'from-sky-500 to-blue-600',
      logoText: 'from-sky-500 to-blue-600',
      subtext: 'text-sky-600',
      btnBg: 'bg-sky-500 hover:bg-sky-600',
      avatarBorder: 'border-sky-500/30',
      avatarBg: 'from-sky-500 to-blue-600'
    },
    TEACHER: {
      accent: 'text-emerald-500',
      activeText: 'text-emerald-600',
      activeBg: 'bg-emerald-50/70 border border-emerald-100/60',
      indicator: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
      logoGrad: 'from-emerald-500 to-teal-600',
      logoText: 'from-emerald-500 to-teal-600',
      subtext: 'text-emerald-600',
      btnBg: 'bg-emerald-500 hover:bg-emerald-600',
      avatarBorder: 'border-emerald-500/30',
      avatarBg: 'from-emerald-500 to-teal-600'
    },
    ADMIN: {
      accent: 'text-indigo-500',
      activeText: 'text-indigo-600',
      activeBg: 'bg-indigo-50/70 border border-indigo-100/60',
      indicator: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]',
      logoGrad: 'from-indigo-500 to-violet-600',
      logoText: 'from-indigo-500 to-violet-600',
      subtext: 'text-indigo-600',
      btnBg: 'bg-indigo-500 hover:bg-indigo-600',
      avatarBorder: 'border-indigo-500/30',
      avatarBg: 'from-indigo-500 to-violet-600'
    }
  }[role] || {
    accent: 'text-sky-500',
    activeText: 'text-sky-600',
    activeBg: 'bg-sky-50/70 border border-sky-100/60',
    indicator: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]',
    logoGrad: 'from-sky-500 to-blue-600',
    logoText: 'from-sky-500 to-blue-600',
    subtext: 'text-sky-600',
    btnBg: 'bg-sky-500 hover:bg-sky-600',
    avatarBorder: 'border-sky-500/30',
    avatarBg: 'from-sky-500 to-blue-600'
  };

  return (
    <ShadcnSidebar 
      collapsible="icon" 
      className="border-r border-slate-200/80 bg-slate-50/80 backdrop-blur-[24px] !sticky !top-0 !h-screen overflow-visible [&_[data-sidebar=sidebar]]:overflow-visible [&_[data-slot=sidebar-inner]]:overflow-visible"
    >
      {/* Floating Collapse Toggle Button - Positioned clear of header */}
      <button
        onClick={toggleSidebar}
        className={`absolute -right-3 top-20 w-6 h-6 rounded-full ${theme.btnBg} flex items-center justify-center text-white shadow-md z-50 transition-all cursor-pointer border border-white`}
      >
        {state === 'collapsed' ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      <SidebarHeader className="border-b border-slate-200/60 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.avatarBg} flex items-center justify-center shadow-md flex-shrink-0`}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className={`text-base font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r ${theme.logoText} tracking-tight`}>
              CampusFlow
            </h2>
            <p className={`text-[9px] uppercase font-bold tracking-widest ${theme.subtext}`}>SSUET Portal</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 relative">
              {/* Animated background indicator */}
              {links.map((link, index) => {
                const isActive = isLinkActive(link.path);
                if (isActive) {
                  return (
                    <motion.div
                      key="active-bg"
                      layoutId="active-nav-bg"
                      className={`absolute h-10 ${theme.activeBg} rounded-xl`}
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
                const isActive = isLinkActive(link.path);
                
                return (
                  <SidebarMenuItem key={link.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={link.label}
                      className={`
                        relative rounded-xl transition-all duration-300 h-10 cursor-pointer
                        ${isActive 
                          ? `${theme.activeText} font-semibold` 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                        }
                        ${isActive ? `before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-1 ${theme.indicator} before:rounded-r group-data-[collapsible=icon]:before:hidden` : ''}
                      `}
                    >
                      <Link href={link.path} className="flex items-center gap-3 w-full">
                        <LinkIcon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200/60 p-3 bg-white/40">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100/60 border border-red-200 text-red-600 font-bold text-xs transition-all duration-300 cursor-pointer shadow-sm group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:rounded-full mx-auto"
          title="Logout"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden font-semibold">Logout</span>
        </button>
      </SidebarFooter>

      <SidebarRail />
    </ShadcnSidebar>
  );
}

export default function Sidebar(props) {
  return (
    <Suspense fallback={null}>
      <SidebarComponent {...props} />
    </Suspense>
  );
}
