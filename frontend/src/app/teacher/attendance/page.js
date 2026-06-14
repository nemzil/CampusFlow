v'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getMyCourses, 
  getCourseSessions, 
  createAttendanceSession, 
  getSessionDetails, 
  markAttendance, 
  markAllAttendance,
  getCourseAttendanceReport
} from '@/lib/api';
import { 
  Calendar, CheckCircle, AlertTriangle, Plus, Users, 
  ArrowLeft, FileText, ClipboardList, Loader2, Save, X, Edit3, ShieldAlert 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function TeacherAttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term] = useState('ALL');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Panels
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMarkerDialog, setShowMarkerDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active Session Marker States
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);

  // Report States
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Form States
  const [sessionForm, setSessionForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    periods: [1],
    session_type: 'LECTURE'
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadCourses();
    }
  }, [user, authLoading, router]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await getMyCourses();
      setCourses(data.courses || data || []);
    } catch (err) {
      showError(err.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const data = await getCourseSessions(course.id || course._id);
      setSessions(data.sessions || []);
    } catch (err) {
      showError(err.message || 'Failed to load course sessions');
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    if (!selectedCourse) return;
    try {
      const data = await getCourseSessions(selectedCourse.id || selectedCourse._id);
      setSessions(data.sessions || []);
    } catch (err) {
      showError(err.message || 'Failed to refresh sessions list');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        course_id: selectedCourse.id || selectedCourse._id,
        session_date: sessionForm.session_date,
        periods: sessionForm.periods.map(Number),
        session_type: sessionForm.session_type
      };
      await createAttendanceSession(payload, term);
      showSuccess('Session created successfully!');
      setShowCreateDialog(false);
      await refreshSessions();
    } catch (err) {
      showError(err.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMarker = async (session) => {
    setActiveSession(session);
    setLoading(true);
    try {
      const data = await getSessionDetails(session.id);
      // Backend returns student status list
      setSessionStudents(data.students || []);
      setShowMarkerDialog(true);
    } catch (err) {
      showError(err.message || 'Failed to load session attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId) => {
    if (activeSession?.is_locked) return;
    setSessionStudents(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, status: s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT' };
      }
      return s;
    }));
  };

  const handleMarkAll = async (status) => {
    if (activeSession?.is_locked) return;
    setSubmitting(true);
    try {
      await markAllAttendance(activeSession.id, status);
      showSuccess(`All students marked as ${status.toLowerCase()}`);
      
      // Update local state immediately
      setSessionStudents(prev => prev.map(s => ({ ...s, status })));
    } catch (err) {
      showError(err.message || 'Failed to mark all students');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAttendance = async () => {
    setSubmitting(true);
    try {
      const attendanceList = sessionStudents.map(s => ({
        student_id: s.student_id,
        status: s.status
      }));
      await markAttendance(activeSession.id, attendanceList);
      showSuccess('Attendance records saved successfully!');
      setShowMarkerDialog(false);
      await refreshSessions();
    } catch (err) {
      showError(err.message || 'Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReport = async () => {
    setReportLoading(true);
    setShowReportDialog(true);
    try {
      const data = await getCourseAttendanceReport(selectedCourse.id || selectedCourse._id);
      setReport(data);
    } catch (err) {
      showError(err.message || 'Failed to load course report');
      setShowReportDialog(false);
    } finally {
      setReportLoading(false);
    }
  };

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Attendance Console...</p>
        </div>
      </div>
    );
  }

  // If no course is selected, show courses selector
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Faculty Console</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Attendance Management</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Select a course section to manage attendance sheets and compile reports.
          </p>
        </div>

        {courses.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01] p-8 text-center text-slate-500 text-xs">
            You are not currently assigned to teach any courses. Contact department registrar.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <motion.div 
                key={course.course_code}
                whileHover={{ y: -3 }}
                onClick={() => handleSelectCourse(course)}
                className="cursor-pointer"
              >
                <Card className="bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                      <h3 className="font-bold text-base text-white font-heading mt-1 leading-snug">{course.course_name}</h3>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-white/5">
                      <span>Term: {course.term || 'N/A'}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-500" /> {course.enrolled_count || 0} Enrolled</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Course Details Selected Mode
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Back Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button 
            onClick={() => setSelectedCourse(null)}
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Courses
          </button>
          <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase block">{selectedCourse.course_code}</span>
          <h1 className="text-2xl font-bold font-heading text-white tracking-tight">{selectedCourse.course_name}</h1>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
          <Button
            onClick={handleOpenReport}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-semibold h-9"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Compiled Report
          </Button>

          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9 shadow-md shadow-violet-600/10"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Session
          </Button>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-heading flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-violet-400" /> Class Session History
        </h2>

        {sessions.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01]">
            <CardContent className="p-16 text-center text-slate-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No attendance sessions registered for this course section.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="bg-white/[0.03] border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div className={`absolute top-0 left-0 w-full h-1 ${session.is_locked ? 'bg-rose-500/40' : 'bg-emerald-500/40'}`} />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Session Date</span>
                      <span className="text-sm font-semibold text-white mt-0.5 block">
                        {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex gap-1.5 items-center">
                      {session.is_locked ? (
                        <Badge variant="outline" className="bg-rose-500/10 border-rose-500/20 text-rose-400 text-[8px] font-bold">
                          LOCKED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 text-[8px] font-bold">
                          EDITABLE
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 bg-white/[0.01] border border-white/5 rounded-lg text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Periods</span>
                      <span className="font-semibold text-white block mt-0.5">{session.periods?.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Type</span>
                      <span className="font-semibold text-white block mt-0.5">{session.session_type || 'LECTURE'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Present</span>
                      <span className="font-semibold text-emerald-400 block mt-0.5">{session.present_count}/{session.total_students}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      onClick={() => handleOpenMarker(session)}
                      className={`text-xs h-8 px-4 font-semibold ${
                        session.is_locked
                          ? 'bg-white/5 text-slate-400 hover:bg-white/10'
                          : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {session.is_locked ? 'View Sheet' : <><Edit3 className="w-3.5 h-3.5 mr-1" /> Mark Attendance</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Session Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="h-1 bg-violet-600" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-violet-400" /> New Class Session
                </h3>
                <button onClick={() => setShowCreateDialog(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Session Date</label>
                  <input
                    type="date"
                    required
                    value={sessionForm.session_date}
                    onChange={(e) => setSessionForm({...sessionForm, session_date: e.target.value})}
                    className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Periods (Conducted)</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => {
                      const isSelected = sessionForm.periods.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setSessionForm(prev => {
                              const alreadySelected = prev.periods.includes(p);
                              const newPeriods = alreadySelected
                                ? prev.periods.filter(val => val !== p)
                                : [...prev.periods, p].sort((a, b) => a - b);
                              return { ...prev, periods: newPeriods.length > 0 ? newPeriods : [p] };
                            });
                          }}
                          className={`h-8 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-violet-600 border-violet-500 text-white' 
                              : 'bg-black/20 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          P{p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Session Type</label>
                  <select
                    value={sessionForm.session_type}
                    onChange={(e) => setSessionForm({...sessionForm, session_type: e.target.value})}
                    className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                  >
                    <option value="LECTURE" className="bg-slate-900">LECTURE</option>
                    <option value="LAB" className="bg-slate-900">LAB</option>
                    <option value="TUTORIAL" className="bg-slate-900">TUTORIAL</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs h-9 shadow-md"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch Session'}
                </Button>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Attendance Marker Dialog */}
      {showMarkerDialog && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className={`h-1 shrink-0 ${activeSession.is_locked ? 'bg-rose-500' : 'bg-violet-600'}`} />
            
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex justify-between items-start shrink-0">
              <div>
                <span className="font-mono text-xs font-bold text-violet-400 tracking-wider block">
                  {new Date(activeSession.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <h3 className="font-heading font-bold text-base mt-1">Mark Attendance Sheets</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Total enrolled: <span className="font-bold text-white">{sessionStudents.length}</span> students
                </p>
              </div>
              <button onClick={() => setShowMarkerDialog(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Locked warning strip */}
            {activeSession.is_locked && (
              <div className="px-5 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2 text-rose-400 text-[10px] uppercase font-bold tracking-wider shrink-0">
                <ShieldAlert className="w-4 h-4" /> Locked by Administrator. Read-Only Mode.
              </div>
            )}

            {/* Bulk Actions */}
            {!activeSession.is_locked && (
              <div className="p-4 bg-white/[0.01] border-b border-white/5 flex gap-2 justify-end shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkAll('PRESENT')}
                  disabled={submitting}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold h-7 px-3"
                >
                  All Present
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkAll('ABSENT')}
                  disabled={submitting}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold h-7 px-3"
                >
                  All Absent
                </Button>
              </div>
            )}

            {/* Students List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
              {sessionStudents.map(student => {
                const isPresent = student.status === 'PRESENT';
                return (
                  <div
                    key={student.student_id}
                    onClick={() => handleToggleStudent(student.student_id)}
                    className={`p-3 bg-white/[0.02] hover:bg-white/[0.04] border rounded-lg flex items-center justify-between text-xs transition-all ${
                      activeSession.is_locked ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      isPresent ? 'border-emerald-500/20' : 'border-rose-500/20'
                    }`}
                  >
                    <div>
                      <h4 className="font-semibold text-white">{student.student_name}</h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{student.registration_no}</p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isPresent}
                      disabled={activeSession.is_locked}
                      readOnly
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 focus:ring-offset-slate-900 border-white/10 bg-transparent"
                    />
                  </div>
                );
              })}
            </div>

            {/* Save Actions */}
            <div className="p-4 bg-black/25 border-t border-white/5 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-500">
                <span className="text-emerald-400 font-bold">{sessionStudents.filter(s => s.status === 'PRESENT').length}</span> present &nbsp;/&nbsp;
                <span className="text-rose-400 font-bold">{sessionStudents.filter(s => s.status === 'ABSENT').length}</span> absent &nbsp;/&nbsp;
                <span className="text-white font-bold">{sessionStudents.length}</span> total
              </span>
              <div className="flex gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setShowMarkerDialog(false)}
                className="h-8 text-xs border border-white/5 text-slate-300"
              >
                Close
              </Button>
              {!activeSession.is_locked && (
                <Button
                  onClick={handleSaveAttendance}
                  disabled={submitting}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Save Sheets</>}
                </Button>
              )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Compiled Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="h-1 bg-violet-600 shrink-0" />
            
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-heading font-bold text-base">Compiled Course Attendance Report</h3>
                <p className="text-xs text-slate-400 mt-0.5">Summary reports of student attendances for evaluation.</p>
              </div>
              <button onClick={() => setShowReportDialog(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats block */}
            {report && (
              <div className="grid grid-cols-3 border-b border-white/5 bg-white/[0.01] p-4 text-center shrink-0 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Conducted Sessions</span>
                  <span className="text-sm font-semibold text-white block mt-0.5">{report.total_sessions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Course average</span>
                  <span className="text-sm font-semibold text-white block mt-0.5">{report.average_attendance}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Below 75% Limit</span>
                  <span className="text-sm font-semibold text-rose-400 block mt-0.5">{report.below_75_count} Students</span>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="p-5 overflow-y-auto flex-1">
              {reportLoading ? (
                <div className="p-16 flex justify-center">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : !report || report.students?.length === 0 ? (
                <p className="text-slate-500 text-center text-xs p-16">No student details compiled yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="pb-3">Reg No</th>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3 text-center">Present</th>
                        <th className="pb-3 text-center">Absent</th>
                        <th className="pb-3 text-right">Percentage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {report.students.map(student => {
                        const meets = student.meets_requirement;
                        return (
                          <tr key={student.registration_no} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-2.5 font-mono text-slate-300">{student.registration_no}</td>
                            <td className="py-2.5 font-medium text-white">{student.student_name}</td>
                            <td className="py-2.5 text-center text-slate-300">{student.present}</td>
                            <td className="py-2.5 text-center text-slate-500">{student.absent}</td>
                            <td className="py-2.5 text-right">
                              <span className={`font-semibold ${meets ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                                {student.percentage}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-black/25 border-t border-white/5 flex justify-end shrink-0">
              <Button onClick={() => setShowReportDialog(false)} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-8">
                Close Report
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
