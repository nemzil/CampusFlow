'use client';

import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../student/dashboard.css';

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider>
          <Sidebar role="ADMIN" />
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
