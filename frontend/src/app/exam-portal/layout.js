'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import ExamPortalSidebar from '@/components/ExamPortalSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../student/dashboard.css';

export default function ExamPortalLayout({ children }) {
  const pathname = usePathname();
  const isLogin = pathname === '/exam-portal/login';

  useEffect(() => {
    // Mark this as exam-portal context so 401 redirects come back here
    localStorage.setItem('portal', 'exam-portal');
  }, [pathname]);

  if (isLogin) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider>
          <ExamPortalSidebar />
          <SidebarInset>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
