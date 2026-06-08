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

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_META = {
  monday:    { label: 'Monday',    short: 'Mon', color: 'from-violet-600/30 to-violet-800/10 border-violet-500/30', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  tuesday:   { label: 'Tuesday',   short: 'Tue', color: 'from-cyan-600/30 to-cyan-800/10 border-cyan-500/30',       badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  wednesday: { label: 'Wednesday', short: 'Wed', color: 'from-emerald-600/30 to-emerald-800/10 border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  thursday:  { label: 'Thursday',  short: 'Thu', color: 'from-amber-600/30 to-amber-800/10 border-amber-500/30',    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  friday:    { label: 'Friday',    short: 'Fri', color: 'from-pink-600/30 to-pink-800/10 border-pink-500/30',       badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  saturday:  { label: 'Saturday',  short: 'Sat', color: 'from-orange-600/30 to-orange-800/10 border-orange-500/30', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  sunday:    { label: 'Sunday',    short: 'Sun', color: 'from-rose-600/30 to-rose-800/10 border-rose-500/30',       badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
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
        setMeta({ department: res.department, semester: res.semester });
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  const grouped = groupByDay(timetable);
  const activeDays = DAYS_ORDER.filter(d => grouped[d]);

  const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemV      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90 } } };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <motion.div variants={containerV} initial="hidden" animate="show" className="space-y-6">

        {/* Header */}
        <motion.div variants={itemV} className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/20">
              My Timetable
            </span>
            {meta.department && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                {meta.department} · Sem {meta.semester}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Class <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Schedule</span>
          </h1>
          <p className="text-slate-400 text-sm">Your weekly timetable based on your department and semester.</p>
        </motion.div>

        {/* Summary cards */}
        <motion.div variants={itemV} className="grid grid-cols-3 gap-3">
          {[
            { label: 'Classes / Week', value: timetable.length, icon: CalendarDays, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
            { label: 'Department',     value: meta.department || '—', icon: Building2, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
            { label: 'Semester',       value: meta.semester ? `Sem ${meta.semester}` : '—', icon: GraduationCap, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                <p className="text-white font-bold text-sm truncate">{value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="text-sm">Loading your timetable…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && timetable.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CalendarDays className="w-12 h-12 text-slate-600" />
            <p className="text-slate-400 font-medium">No timetable set for your class yet.</p>
            <p className="text-slate-600 text-sm">Your admin hasn't configured a schedule yet.</p>
          </div>
        )}

        {/* Day tabs + cards */}
        {!loading && !error && timetable.length > 0 && (
          <motion.div variants={itemV} className="space-y-4">
            {/* Tab bar */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {activeDays.map(day => {
                const dm = DAY_META[day] || { label: day, badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
                const isActive = activeDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(day)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200
                      ${isActive ? `${dm.badge} scale-105` : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:bg-white/8'}`}
                  >
                    {dm.label}
                    <span className="ml-1.5 text-[10px] opacity-70">({grouped[day].length})</span>
                  </button>
                );
              })}
            </div>

            {/* Cards for active day */}
            <AnimatePresence mode="wait">
              {activeDay && grouped[activeDay] && (
                <motion.div
                  key={activeDay}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid gap-3"
                >
                  {grouped[activeDay].map((entry, i) => {
                    const dm = DAY_META[activeDay] || {};
                    return (
                      <motion.div
                        key={entry.tt_id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className={`relative overflow-hidden rounded-xl border bg-gradient-to-r ${dm.color || 'from-slate-700/30 to-slate-800/10 border-slate-600/30'} p-4 flex items-center gap-4`}
                      >
                        {/* Time block */}
                        <div className="flex-shrink-0 text-center min-w-[64px]">
                          <p className="text-white font-bold text-sm leading-tight">{entry.time_start}</p>
                          <div className="w-6 h-px bg-slate-500 mx-auto my-1" />
                          <p className="text-slate-400 text-xs">{entry.time_end}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10 flex-shrink-0" />
                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">
                            {entry.subject || 'Class'}
                          </p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                              <User className="w-3 h-3" /> {entry.teacher_name}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                              <BookOpen className="w-3 h-3" /> Class {entry.class_no}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400 text-xs">
                              <Clock className="w-3 h-3" /> {entry.time_start}–{entry.time_end}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
