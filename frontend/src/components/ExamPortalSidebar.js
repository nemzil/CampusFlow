'use client';

import { useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MessageSquare, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
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

const links = [
  { path: '/exam-portal/exams', label: 'Exams', Icon: GraduationCap },
  { path: '/exam-portal/messages', label: 'Chat', Icon: MessageSquare },
];

function ExamPortalSidebarComponent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggleSidebar, state } = useSidebar();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Hard navigate so AuthContext fully resets and login page loads fresh
    window.location.href = '/exam-portal/login';
  };

  return (
    <ShadcnSidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-white shadow-sm !sticky !top-0 !h-screen"
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center text-white shadow-lg z-50 transition-colors"
      >
        {state === 'collapsed' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <SidebarHeader className="border-b border-slate-100 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className="text-lg font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 tracking-tight">
              Exam Portal
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-widest text-amber-500">SSUET Exams</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 relative">
              {links.map((link, index) => {
                const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
                if (isActive) {
                  return (
                    <motion.div
                      key="active-bg"
                      layoutId="exam-portal-active-nav"
                      className="absolute h-10 bg-amber-50 rounded-xl"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      style={{ top: `${index * 44}px`, left: 0, right: 0 }}
                    />
                  );
                }
                return null;
              })}
              {links.map((link) => {
                const LinkIcon = link.Icon;
                const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
                return (
                  <SidebarMenuItem key={link.path}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={link.label} className={`relative rounded-xl h-10 ${isActive ? 'text-amber-600 hover:text-amber-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                      <Link href={link.path} className="flex items-center gap-3 w-full">
                        <LinkIcon className="w-6 h-6 flex-shrink-0" />
                        <span className="font-bold">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </ShadcnSidebar>
  );
}

export default function ExamPortalSidebar() {
  return (
    <Suspense fallback={null}>
      <ExamPortalSidebarComponent />
    </Suspense>
  );
}
