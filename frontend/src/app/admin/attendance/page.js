'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCourses, 
  getCourseSessions, 
  lockAttendance, 
  unlockAttendance 
} from '@/lib/api';
import { 
  Lock, Unlock, ShieldAlert, Users, Calendar, 
  Loader2, Search, CheckCircle, HelpCircle, FileSpreadsheet 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AdminAttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term, setTerm] = useState('2024F');
  const [courses, setCourses] = useState([]);
  const [courseSessionsInfo, setCourseSessionsInfo] = useState({}); // maps courseId -> { count, lockedCount, unlockedCount }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Unlock Dialog States
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [unlockReason, setUnlockReason] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadCoursesAndSessions();
    }
  }, [user, authLoading, router, term]);

  const loadCoursesAndSessions = async () => {
    setLoading(true);
    try {
      const coursesData = await getCourses({ term });
      const courseList = coursesData.courses || coursesData || [];
      setCourses(courseList);

      // Fetch sessions for all courses in parallel to compute lock status
      const infoMap = {};
      await Promise.all(
        courseList.map(async (course) => {
          const courseId = course.id || course._id;
          try {
            const data = await getCourseSessions(courseId);
            const sessionsList = data.sessions || [];
            const lockedCount = sessionsList.filter(s => s.is_locked).length;
            const unlockedCount = sessionsList.length - lockedCount;
            infoMap[courseId] = {
              count: sessionsList.length,
              lockedCount,
              unlockedCount,
              isFullyLocked: sessionsList.length > 0 && unlockedCount === 0
            };
          } catch (e) {
            infoMap[courseId] = { count: 0, lockedCount: 0, unlockedCount: 0, isFullyLocked: false };
          }
        })
      );
      setCourseSessionsInfo(infoMap);
    } catch (err) {
      showError(err.message || 'Failed to load courses database');
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async (course) => {
    const courseId = course.id || course._id;
    if (!confirm(`Are you sure you want to lock attendance sheets for [${course.course_code}]? Teachers will not be able to edit past sessions.`)) return;
    setSubmitting(true);
    try {
      await lockAttendance(courseId, term);
      showSuccess(`Attendance sheets locked for ${course.course_code}`);
      await loadCoursesAndSessions();
    } catch (err) {
      showError(err.message || 'Failed to lock course attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const openUnlockModal = (course) => {
    setSelectedCourse(course);
    setUnlockReason('');
    setShowUnlockDialog(true);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!unlockReason) {
      showError('Unlock reason required');
      return;
    }
    setSubmitting(true);
    try {
      const courseId = selectedCourse.id || selectedCourse._id;
      await unlockAttendance(courseId, unlockReason);
      showSuccess(`Attendance sheets unlocked for ${selectedCourse.course_code}`);
      setShowUnlockDialog(false);
      await loadCoursesAndSessions();
    } catch (err) {
      showError(err.message || 'Failed to unlock course attendance');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter courses locally
  const filteredCourses = courses.filter(c => {
    return c.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           c.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Attendance Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Registrar Admin</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Attendance Audit Lock</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Audit class attendance sheets and freeze edit permissions at the end of semesters.
          </p>
        </div>

        {/* Term Select */}
        <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
          {['2024F', '2024S'].map(t => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono tracking-wider transition-all ${
                term === t 
                  ? 'bg-violet-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search course code, instructor..."
            className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500 text-xs"
          />
        </div>
      </div>

      {/* Audit Directory */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="p-0">
          {filteredCourses.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <h3 className="font-bold text-white text-base">No courses loaded</h3>
              <p className="text-xs text-slate-400">No courses match query in term {term}.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="p-4">Course Details</th>
                    <th className="p-4">Instructor</th>
                    <th className="p-4 text-center">Conducted Sessions</th>
                    <th className="p-4">Sheet Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCourses.map(course => {
                    const courseId = course.id || course._id;
                    const info = courseSessionsInfo[courseId] || { count: 0, lockedCount: 0, unlockedCount: 0, isFullyLocked: false };
                    
                    return (
                      <tr key={courseId} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                          <span className="font-semibold text-white mt-0.5 block">{course.course_name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-slate-300 block">{course.teacher_name || 'TBA'}</span>
                          <span className="text-[10px] text-slate-500 block">ID: {course.teacher_id || 'unassigned'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-slate-200 block text-xs">{info.count} Sessions</span>
                          <span className="text-[10px] text-slate-500 block">
                            {info.lockedCount} Locked / {info.unlockedCount} Open
                          </span>
                        </td>
                        <td className="p-4">
                          {info.count === 0 ? (
                            <Badge variant="outline" className="bg-slate-500/10 border-slate-500/20 text-slate-400 font-medium">
                              NO LOGS
                            </Badge>
                          ) : info.isFullyLocked ? (
                            <Badge className="bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold">
                              <Lock className="w-3 h-3 mr-1 shrink-0" /> LOCKED
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                              <Unlock className="w-3 h-3 mr-1 shrink-0" /> EDITABLE
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {info.count > 0 && (
                            info.isFullyLocked ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openUnlockModal(course)}
                                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 h-7 px-3 text-[10px] font-bold"
                              >
                                <Unlock className="w-3.5 h-3.5 mr-1" /> Unlock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLock(course)}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 h-7 px-3 text-[10px] font-bold"
                              >
                                <Lock className="w-3.5 h-3.5 mr-1" /> Lock Audit
                              </Button>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlock dialog modal */}
      {showUnlockDialog && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="h-1 bg-emerald-500" />
            <div className="p-5 space-y-4">
              <h3 className="font-heading font-bold text-base flex items-center gap-2 text-emerald-400">
                <Unlock className="w-5 h-5" /> Unlock Attendance Sheets
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are about to allow instructors to edit past attendance sessions for <span className="font-semibold text-white">{selectedCourse.course_code}</span>. A reason for this correction override is required.
              </p>

              <form onSubmit={handleUnlock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Correction / Unlock Reason</label>
                  <textarea
                    required
                    placeholder="Correction of mistake on Sep 15 session..."
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowUnlockDialog(false)}
                    className="h-8 text-xs border border-white/5 hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Unlock'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
