'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ExamPortalHeader() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-md shrink-0">
      <div className="flex-1">
        {/* Placeholder for left side if needed in the future, e.g. breadcrumbs */}
        <h2 className="text-sm font-bold font-heading text-slate-800">Exam Portal Dashboard</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Button - Gold Theme */}
        <Link href="/student/profile" className="my-auto flex items-center">
          <div className="flex items-center gap-3 px-3 py-1 border border-slate-200/80 rounded-xl bg-white/80 hover:bg-slate-50 transition-all duration-300 shadow-sm cursor-pointer text-slate-700">
            <div className="h-10 w-10 rounded-full border-2 border-amber-500/30 flex-shrink-0 overflow-hidden shadow-sm flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm">
              {user.profile_picture_url ? (
                <img src={user.profile_picture_url} alt={user.first_name} className="w-full h-full object-cover" />
              ) : (
                `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
              )}
            </div>
            <div className="flex flex-col text-left hidden sm:flex leading-tight">
              <span className="truncate font-semibold text-slate-800 text-sm">{user.first_name} {user.last_name}</span>
              <span className="truncate text-[9px] uppercase font-bold tracking-wider text-amber-600">Student</span>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
