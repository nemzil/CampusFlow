'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { canViewExamManagement, canEditExamManagement } from '@/lib/adminAccess';

// Load the panel client-side only (uses framer-motion, localStorage, etc.)
const TimetableAdminPanel = dynamic(
  () => import('@/components/TimetableAdminPanel'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
    </div>
  )}
);

export default function AdminTimetablePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    else if (!loading && user && user.role !== 'ADMIN') router.push('/login');
    else if (!loading && user && !canViewExamManagement(user)) router.push('/admin');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    // The panel is a full-overlay modal; we just render it here
    // Pass a no-op for onClose (user uses the X button inside)
    <TimetableAdminPanel
      readOnly={!canEditExamManagement(user)}
      onClose={() => router.push('/admin')}
    />
  );
}
