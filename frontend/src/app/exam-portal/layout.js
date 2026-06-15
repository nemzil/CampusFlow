'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/context/AuthContext';
import ExamPortalSidebar from '@/components/ExamPortalSidebar';
import ExamPortalHeader from '@/components/ExamPortalHeader';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

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
          <SidebarInset className="bg-slate-50 text-[var(--on-background)] min-h-screen border-l border-slate-200 flex flex-col">
            <ExamPortalHeader />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}
