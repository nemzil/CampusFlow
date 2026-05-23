'use client';

import { AuthProvider } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import './dashboard.css';

export default function StudentLayout({ children }) {
  return (
    <AuthProvider>
      <TooltipProvider>
        <SidebarProvider>
          <Sidebar role="STUDENT" />
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
