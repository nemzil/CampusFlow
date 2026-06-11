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
      className="border-r-0 bg-[rgba(10,15,30,0.4)] backdrop-blur-[24px] shadow-[10px_0_30px_rgba(0,0,0,0.3)] !sticky !top-0 !h-screen"
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center text-white shadow-lg z-50 transition-colors"
      >
        {state === 'collapsed' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      <SidebarHeader className="border-b border-white/5 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <h2 className="text-lg font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 tracking-tight">
              Exam Portal
            </h2>
            <p className="text-[9px] uppercase font-bold tracking-widest text-amber-400">SSUET Exams</p>
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
                      className="absolute h-10 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 rounded-xl"
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
                    <SidebarMenuButton asChild isActive={isActive} tooltip={link.label} className="relative rounded-xl h-10">
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
                className="data-[state=open]:bg-white/5 hover:bg-white/5 border border-white/5 rounded-xl bg-white/[0.03] w-full"
              >
                <Avatar className="h-10 w-10 rounded-full border-2 border-amber-500/40">
                  <AvatarImage src={user?.profile_picture_url} alt={user?.first_name} />
                  <AvatarFallback className="rounded-full bg-gradient-to-br from-amber-600 to-orange-600 text-white font-bold">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-white">{user?.first_name} {user?.last_name}</span>
                  <span className="truncate text-xs text-amber-400 uppercase tracking-wider font-semibold">Student</span>
                </div>
              </SidebarMenuButton>
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-[#0a0b14] border border-white/10 shadow-2xl overflow-hidden"
                  >
                    <motion.div
                      whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                      className="flex items-center gap-3 px-4 py-3 text-red-400 cursor-pointer"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
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

export default function ExamPortalSidebar() {
  return (
    <Suspense fallback={null}>
      <ExamPortalSidebarComponent />
    </Suspense>
  );
}
