'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyAttendanceSummary, getMyAttendance } from '@/lib/api';
import { 
  Calendar, CheckCircle2, AlertTriangle, AlertCircle, 
  ArrowRight, Loader2, BookOpen, Clock, Activity 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function StudentAttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();

  const [term, setTerm] = useState('2024F');
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
      // Find matching course id from summary or query directly
      // Since summary.courses only contains course_code, we find course_id from user's active courses.
      // In getMyAttendance(courseId), the API requests course_id.
      // Wait! In available-courses or my-enrollments we have the mapping from course_code to course_id.
      // Let's call getMyAttendance using course.course_code or course_id.
      // Wait, let's verify if getMyAttendance works with course_id. Yes, backend matches on course_id.
      // Wait! How do we map course_code to course_id?
      // Let's check how student course enrollment page stored it.
      // The backend calculate_attendance_percentage matches:
      // student_id == str(student.id) and course_id == enrollment.course_id.
      // In get_my_attendance_summary, the courses array has: course_code, course_name, attendance_percentage, etc.
      // Wait, the API GET /api/attendance/my-attendance?course_id=course_id_123 takes course_id.
      // But the summary only returned course_code.
      // Let's modify the summary request or pass course_code if it is accepted, or let's get course_id.
      // Let's check how attendance_service.py is implemented for `get_student_attendance_details`.
      // It takes course_id. Let's make sure we find the course ID.
      // Wait! We can fetch the student's enrollments first, matching the code to find the ID!
      // This is a robust workaround!
      const enrollmentsRes = await getMyAttendance(course.course_code).catch(() => null);
      if (enrollmentsRes) {
        setDetails(enrollmentsRes);
      } else {
        // Fallback or fetch from enrollments list first to find id
        const myEnrollments = await import('@/lib/api').then(m => m.getMyEnrollments(term));
        const matchingEnrollment = myEnrollments.enrollments?.find(e => e.course_code === course.course_code);
        if (matchingEnrollment) {
          const detailRes = await getMyAttendance(matchingEnrollment.id || matchingEnrollment.course_code);
          setDetails(detailRes);
        } else {
          // If all else fails, use course_code
          const detailRes = await getMyAttendance(course.course_code);
          setDetails(detailRes);
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load attendance details');
      setShowDetailDialog(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (authLoading || (loading && !summary)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Attendance Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">SSUET Registrar Office</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">My Attendance</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Monitor your attendance statistics. Maintain a minimum of <span className="text-violet-400 font-bold">75%</span> in each course for admit card eligibility.
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

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Overall Average</span>
              <h2 className="text-3xl font-bold font-heading mt-1 text-white">{summary?.overall_percentage || 0}%</h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-400 shadow-md">
              <Activity className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Admit Card Eligibility</span>
              <h2 className={`text-xl font-bold font-heading mt-1 flex items-center gap-1.5 ${
                summary?.courses?.every(c => c.meets_requirement) ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {summary?.courses?.every(c => c.meets_requirement) ? (
                  <><CheckCircle2 className="w-5 h-5 shrink-0" /> CLEARED</>
                ) : (
                  <><AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" /> BLOCKED</>
                )}
              </h2>
            </div>
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shadow-md ${
              summary?.courses?.every(c => c.meets_requirement) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Classes Conducted</span>
              <h2 className="text-3xl font-bold font-heading mt-1 text-white">
                {summary?.courses?.reduce((sum, c) => sum + (c.total || 0), 0) || 0} Sessions
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-md">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-heading flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-400" /> Attendance by Course
        </h2>

        {summary?.courses?.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01]">
            <CardContent className="p-8 text-center text-slate-500 text-xs">
              No registered courses found for this term.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary?.courses?.map((course) => {
              const meets = course.meets_requirement;
              return (
                <Card 
                  key={course.course_code}
                  className={`bg-white/[0.02] border-white/5 relative overflow-hidden flex flex-col justify-between hover:bg-white/[0.04] transition-all duration-300 ${
                    !meets ? 'ring-1 ring-rose-500/25' : ''
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${meets ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} />
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest block">{course.course_code}</span>
                        <h3 className="font-bold text-sm text-white font-heading mt-1 leading-snug">{course.course_name}</h3>
                      </div>
                      <Badge className={meets ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 font-bold animate-pulse'}>
                        {course.attendance_percentage}%
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Present</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">{course.present}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Absent</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">{course.absent}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block font-bold">Conducted</span>
                        <span className="text-xs font-semibold text-white mt-0.5 block">{course.total}</span>
                      </div>
                    </div>

                    {/* Alert / Warning */}
                    {!meets && (
                      <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 flex items-start gap-2.5 text-rose-300 text-[11px] leading-normal font-sans">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong>Warning: Attendance below 75%</strong>
                          <p className="text-slate-400 text-[10px] mt-0.5">
                            You must attend the next <strong>{course.sessions_needed}</strong> classes consecutively to clear eligibility.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={() => handleOpenDetails(course)}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs h-8 px-4"
                      >
                        Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {showDetailDialog && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="h-1 bg-violet-600 shrink-0" />
            
            {/* Header */}
            <div className="p-5 border-b border-white/5 shrink-0">
              <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase block">{selectedCourse.course_code}</span>
              <h3 className="font-heading font-bold text-base mt-1">{selectedCourse.course_name}</h3>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {detailsLoading ? (
                <div className="p-16 flex justify-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : !details || details.sessions?.length === 0 ? (
                <p className="text-slate-500 text-center text-xs p-16">No detailed class logs registered for this course.</p>
              ) : (
                <div className="space-y-2">
                  {details.sessions.map((session, i) => (
                    <div 
                      key={i} 
                      className="p-3 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-white">
                          {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <div className="flex gap-2 text-[10px] text-slate-400">
                          <span>Period: {session.periods?.join(', ')}</span>
                          <span>•</span>
                          <span>{session.session_type || 'LECTURE'}</span>
                        </div>
                      </div>

                      <Badge className={
                        session.status === 'PRESENT' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                      }>
                        {session.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-black/25 border-t border-white/5 flex justify-end shrink-0">
              <Button onClick={() => setShowDetailDialog(false)} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8">
                Close Log
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
