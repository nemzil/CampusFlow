'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyAttendanceSummary, getMyAttendance } from '@/lib/api';
import { 
  Calendar, CheckCircle2, AlertTriangle, AlertCircle, 
  ArrowRight, Loader2, BookOpen, Clock, Activity, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function StudentAttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();

  const [term] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  
  // Detail Modal States
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadSummary();
    }
  }, [user, authLoading, router, term]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await getMyAttendanceSummary(term);
      setSummary(data);
    } catch (err) {
      showError(err.message || 'Failed to load attendance summary');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (course) => {
    setSelectedCourse(course);
    setDetailsLoading(true);
    setShowDetailDialog(true);
    try {
      const data = await getMyAttendance(course.course_id);
      setDetails(data);
    } catch (err) {
      showError(err.message || 'Failed to load attendance details');
      setShowDetailDialog(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (authLoading || (loading && !summary)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-medium">Loading Attendance Records...</p>
        </div>
      </div>
    );
  }

  const overallMeets = summary?.courses?.every(c => c.meets_requirement);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">My Attendance</h1>
          <p className="text-slate-500 mt-1">
            Monitor your attendance statistics. Maintain a minimum of <span className="text-red-500 font-bold">75%</span> in each course for exam eligibility.
          </p>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Overall Average</span>
              <h2 className="text-3xl font-black font-mono mt-1 text-slate-900">{summary?.overall_percentage || 0}%</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Classes Conducted</span>
              <h2 className="text-3xl font-black font-mono mt-1 text-slate-900">
                {summary?.courses?.reduce((sum, c) => sum + (c.total || 0), 0) || 0}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-sm">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Attendance Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-heading flex items-center gap-2 text-slate-900">
          <BookOpen className="w-5 h-5 text-sky-500" /> Attendance by Course
        </h2>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Code</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Title</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Conducted</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Present / Absent</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Percentage</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Logs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary?.courses && summary.courses.length > 0 ? (
                    summary.courses.map((course, idx) => {
                      const pct = course.attendance_percentage || 0;
                      const meets = course.meets_requirement;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs font-bold font-mono text-slate-700">{course.course_code}</td>
                          <td className="p-4 text-xs font-bold text-slate-800">{course.course_name}</td>
                          <td className="p-4 text-xs text-slate-600 font-mono text-center">{course.total}</td>
                          <td className="p-4 text-xs text-slate-600 font-mono text-center">
                            <span className="text-sky-600 font-semibold">{course.present}</span>
                            <span className="text-slate-300 mx-1">/</span>
                            <span className="text-red-500 font-semibold">{course.absent}</span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold font-mono text-slate-800 w-9">{Math.round(pct)}%</span>
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-1.5 rounded-full ${meets ? 'bg-sky-500' : 'bg-red-500'}`} 
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge 
                              className={`text-[9px] uppercase font-bold tracking-wider ${
                                meets 
                                  ? 'bg-sky-50 text-sky-600 border-sky-100' 
                                  : 'bg-red-50 text-red-600 border-red-200'
                              }`} 
                              variant="outline"
                            >
                              {meets ? 'Eligible' : 'Shortage Risk'}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              onClick={() => handleOpenDetails(course)}
                              size="sm"
                              className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs h-7 px-3 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            >
                              Details
                              <ArrowRight className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-xs text-slate-400 font-sans">
                        No course enrollments or attendance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <AnimatePresence>
        {showDetailDialog && selectedCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border-x border-b border-t-0 border-slate-200 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-600 tracking-wider uppercase block">{selectedCourse.course_code}</span>
                  <h3 className="font-heading font-extrabold text-slate-900 text-base mt-1">{selectedCourse.course_name}</h3>
                </div>
                <button 
                  onClick={() => setShowDetailDialog(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* List */}
              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {detailsLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    <span className="text-xs text-slate-400 font-sans">Loading details...</span>
                  </div>
                ) : !details || details.sessions?.length === 0 ? (
                  <p className="text-slate-400 text-center text-xs p-16 font-sans">No detailed class logs registered for this course.</p>
                ) : (
                  <div className="space-y-2">
                    {details.sessions.map((session, i) => (
                      <div 
                        key={i} 
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800">
                            {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <div className="flex gap-2 text-[10px] text-slate-400 font-medium font-sans">
                            <span>Period: {session.periods?.join(', ')}</span>
                            <span>•</span>
                            <span>{session.session_type || 'LECTURE'}</span>
                          </div>
                        </div>

                        <Badge className={
                          session.status === 'PRESENT' 
                            ? 'bg-sky-50 text-sky-600 border border-sky-100 font-bold' 
                            : 'bg-red-50 text-red-600 border border-red-200 font-bold'
                        } variant="outline">
                          {session.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
                <Button onClick={() => setShowDetailDialog(false)} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs h-8">
                  Close Log
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
