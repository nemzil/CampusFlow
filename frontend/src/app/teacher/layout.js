'use client';

import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';
import './dashboard.css';

export default function TeacherLayout({ children }) {
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
          <Sidebar role="TEACHER" />
          <SidebarInset>
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
