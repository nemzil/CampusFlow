'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyClassTimetable } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Clock, BookOpen, User, Loader2,
  Building2, GraduationCap, AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

// Group timetable entries by day
function groupByDay(entries) {
  const map = {};
  entries.forEach(entry => {
    entry.days.forEach(day => {
      if (!map[day]) map[day] = [];
      map[day].push(entry);
    });
  });
  // Sort each day's entries by time_start
  Object.keys(map).forEach(day => {
    map[day].sort((a, b) => a.time_start.localeCompare(b.time_start));
  });
  return map;
}

export default function StudentTimetablePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [timetable, setTimetable]   = useState([]);
  const [meta, setMeta]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [activeDay, setActiveDay]   = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (!authLoading && user && user.role !== 'STUDENT') router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;
    getMyClassTimetable()
      .then(res => {
        setTimetable(res.timetables || []);
        setMeta({ department: res.department, semester: res.semester, message: res.message });
        
        // Set today's day as default active tab
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const grouped = groupByDay(res.timetables || []);
        setActiveDay(grouped[today] ? today : (Object.keys(grouped)[0] || ''));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  const grouped = groupByDay(timetable);
  const activeDays = DAYS_ORDER.filter(d => grouped[d]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">
      
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200">
            Class Schedule
          </Badge>
          {meta.department && (
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
              {meta.department} · Semester {meta.semester}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Student Timetable</h1>
        <p className="text-slate-500 mt-1 font-sans">
          Your active weekly schedule showing classes, timing, and room locations.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-150/40 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Classes / Week</p>
            <p className="text-xl font-extrabold text-slate-800 font-mono">{timetable.length}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-150/40 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Department</p>
            <p className="text-sm font-extrabold text-slate-800 truncate">{meta.department || '—'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-150/40 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Semester</p>
            <p className="text-xl font-extrabold text-slate-800 font-mono">{meta.semester ? `Sem ${meta.semester}` : '—'}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-650 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <span className="text-sm text-slate-400">Loading schedule...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && timetable.length === 0 && (
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <CalendarDays className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-850 mb-2 font-heading">No schedule found</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              {meta.message || "No timetable has been configured for your department yet."}
            </p>
            {meta.message && meta.message.includes('enrolled') && (
              <Button onClick={() => router.push('/student/enrollment')} className="bg-sky-500 hover:bg-sky-650 text-white font-bold text-xs h-9 px-6 rounded-xl cursor-pointer">
                Go to Course Enrollment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Day tabs + Schedule rows */}
      {!loading && !error && timetable.length > 0 && (
        <div className="space-y-6">
          {/* Tabs bar */}
          <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-100">
            {activeDays.map(day => {
              const isActive = activeDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 text-xs font-bold transition-all duration-200 border-b-2 tracking-wide cursor-pointer ${
                    isActive
                      ? 'border-sky-500 text-sky-600 font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {DAY_LABELS[day] || day}
                  <span className="ml-1.5 text-[9px] opacity-75 font-mono">({grouped[day].length})</span>
                </button>
              );
            })}
          </div>

          {/* Schedule list/table format (NO SLOP CARDS with top colored lines) */}
          <AnimatePresence mode="wait">
            {activeDay && grouped[activeDay] && (
              <motion.div
                key={activeDay}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-32">Time</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Subject</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Instructor</th>
                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Classroom</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {grouped[activeDay].map((entry) => (
                            <tr key={entry.tt_id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 text-xs font-bold text-slate-700">
                                <div className="flex items-center gap-1.5 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-sky-500" />
                                  <span>{entry.time_start} - {entry.time_end}</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-bold text-slate-800">
                                {entry.subject || 'Class'}
                              </td>
                              <td className="p-4 text-xs font-medium text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{entry.teacher_name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-xs font-bold font-mono text-center text-slate-700">
                                <Badge variant="outline" className="bg-sky-50 border-sky-100 text-sky-600 text-[10px] font-bold">
                                  Class {entry.class_no}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
