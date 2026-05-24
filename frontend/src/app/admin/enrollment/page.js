'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getRegistrationStatus, 
  openRegistration, 
  closeRegistration,
  getCourses,
  listUsers,
  getCourseEnrollments,
  forceEnrollStudent,
  removeStudentEnrollment
} from '@/lib/api';
import { 
  BookMarked, Calendar, Key, Users, Settings, AlertCircle, 
  UserPlus, UserMinus, Clock, Loader2, Plus, LogOut, CheckCircle2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AdminEnrollmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('window'); // window, force, directory
  const [term, setTerm] = useState('2024F');
  const [windowStatus, setWindowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Lists for forms
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [directoryCourseId, setDirectoryCourseId] = useState('');
  const [directoryStudents, setDirectoryStudents] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  // Form states
  const [openWinForm, setOpenWinForm] = useState({
    semester: 1,
    start_date: '',
    end_date: ''
  });

  const [forceEnrollForm, setForceEnrollForm] = useState({
    student_id: '',
    course_id: '',
    reason: ''
  });

  const [removeEnrollForm, setRemoveEnrollForm] = useState({
    enrollment_id: '',
    reason: ''
  });
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadInitialData();
    }
  }, [user, authLoading, router, term]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [statusData, coursesData, studentsData] = await Promise.all([
        getRegistrationStatus(term),
        getCourses({ term }),
        listUsers('STUDENT', 0, 100)
      ]);

      setWindowStatus(statusData);
      setCourses(coursesData.courses || coursesData || []);
      setStudents(studentsData.users || studentsData || []);
      
      // Auto-select first course for directory if available
      const courseList = coursesData.courses || coursesData || [];
      if (courseList.length > 0) {
        setDirectoryCourseId(courseList[0].id || courseList[0]._id);
      }
    } catch (err) {
      showError(err.message || 'Failed to load system state');
    } finally {
      setLoading(false);
    }
  };

  // Load course directory list on selection change
  useEffect(() => {
    if (directoryCourseId) {
      fetchDirectoryStudents();
    }
  }, [directoryCourseId]);

  const fetchDirectoryStudents = async () => {
    setDirectoryLoading(true);
    try {
      const data = await getCourseEnrollments(directoryCourseId);
      setDirectoryStudents(data.students || []);
    } catch (err) {
      showError(err.message || 'Failed to load course enrollments');
    } finally {
      setDirectoryLoading(false);
    }
  };

  const handleOpenWindow = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        semester: parseInt(openWinForm.semester),
        term,
        start_date: new Date(openWinForm.start_date).toISOString(),
        end_date: new Date(openWinForm.end_date).toISOString()
      };
      await openRegistration(payload);
      showSuccess('Registration window opened successfully!');
      loadInitialData();
    } catch (err) {
      showError(err.message || 'Failed to open registration window');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseWindow = async () => {
    if (!confirm(`Are you sure you want to close registration for ${term}? Students will no longer be able to modify courses.`)) return;
    setSubmitting(true);
    try {
      await closeRegistration(term);
      showSuccess('Registration window closed successfully.');
      loadInitialData();
    } catch (err) {
      showError(err.message || 'Failed to close registration window');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceEnroll = async (e) => {
    e.preventDefault();
    if (!forceEnrollForm.student_id || !forceEnrollForm.course_id || !forceEnrollForm.reason) {
      showError('Please fill all force enrollment fields');
      return;
    }
    setSubmitting(true);
    try {
      await forceEnrollStudent(
        forceEnrollForm.student_id,
        forceEnrollForm.course_id,
        forceEnrollForm.reason,
        term
      );
      showSuccess('Student force enrolled successfully!');
      setForceEnrollForm({ student_id: '', course_id: '', reason: '' });
      if (directoryCourseId === forceEnrollForm.course_id) {
        fetchDirectoryStudents();
      }
    } catch (err) {
      showError(err.message || 'Failed to force enroll student');
    } finally {
      setSubmitting(false);
    }
  };

  const openRemoveModal = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setRemoveEnrollForm({ enrollment_id: enrollment.enrollment_id, reason: '' });
    setShowRemoveDialog(true);
  };

  const handleRemoveStudent = async (e) => {
    e.preventDefault();
    if (!removeEnrollForm.reason) {
      showError('Please specify removal reason');
      return;
    }
    setSubmitting(true);
    try {
      await removeStudentEnrollment(removeEnrollForm.enrollment_id, removeEnrollForm.reason);
      showSuccess('Student removed from course successfully');
      setShowRemoveDialog(false);
      fetchDirectoryStudents();
    } catch (err) {
      showError(err.message || 'Failed to remove student enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Enrollment Dashboard...</p>
        </div>
      </div>
    );
  }

  const isWindowOpen = windowStatus?.status === 'OPEN';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Registrar Admin</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Enrollment Management</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Manage course registration windows, force enrollments, and check class directories.
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

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-6">
        {[
          { id: 'window', label: 'Registration Window', Icon: Clock },
          { id: 'force', label: 'Force Enroll Override', Icon: UserPlus },
          { id: 'directory', label: 'Enrollment Directory', Icon: Users }
        ].map(tab => {
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
                activeTab === tab.id 
                  ? 'border-violet-500 text-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'window' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card */}
            <div className="lg:col-span-2 space-y-6">
              <Card className={`border-white/5 backdrop-blur-xl bg-white/[0.02] relative overflow-hidden ${
                isWindowOpen ? 'ring-1 ring-emerald-500/20' : 'ring-1 ring-rose-500/20'
              }`}>
                <div className={`absolute top-0 left-0 w-full h-1.5 ${isWindowOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <CardContent className="p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Current Period</span>
                      <h2 className="text-xl font-bold font-heading mt-1">Registration Window — {term}</h2>
                    </div>
                    <Badge className={isWindowOpen ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'}>
                      {isWindowOpen ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>

                  {isWindowOpen ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/[0.01] p-4 border border-white/5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Start Date</span>
                        <span className="text-sm font-semibold text-white mt-1 block">
                          {new Date(windowStatus.start_date).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">End Date</span>
                        <span className="text-sm font-semibold text-white mt-1 block">
                          {new Date(windowStatus.end_date).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Time Remaining</span>
                        <span className="text-sm font-semibold text-emerald-400 mt-1 block">
                          {windowStatus.days_remaining} Days Left
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-300">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <p className="text-xs">
                        There is no open registration window for the {term} term. Students cannot enroll in classes.
                      </p>
                    </div>
                  )}

                  {isWindowOpen && (
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleCloseWindow}
                        disabled={submitting}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs h-9 shadow-md shadow-rose-600/10"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><LogOut className="w-4 h-4 mr-1.5" /> Close Window Early</>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Open Form Panel */}
            {!isWindowOpen && (
              <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
                <CardContent className="p-5 space-y-4">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <Plus className="w-4 h-4 text-violet-400" /> Open New Window
                  </h3>
                  
                  <form onSubmit={handleOpenWindow} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Semester target</label>
                      <select
                        value={openWinForm.semester}
                        onChange={(e) => setOpenWinForm({...openWinForm, semester: e.target.value})}
                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                          <option key={sem} value={sem} className="bg-slate-900">Semester {sem}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Start Date</label>
                      <input
                        type="datetime-local"
                        required
                        value={openWinForm.start_date}
                        onChange={(e) => setOpenWinForm({...openWinForm, start_date: e.target.value})}
                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">End Date</label>
                      <input
                        type="datetime-local"
                        required
                        value={openWinForm.end_date}
                        onChange={(e) => setOpenWinForm({...openWinForm, end_date: e.target.value})}
                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs h-9 shadow-md"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Launch Window'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'force' && (
          <div className="max-w-xl">
            <Card className="border-white/5 bg-white/[0.02] backdrop-blur-xl">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-violet-400" /> Force Enroll Override
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Bypasses all registration rules (prerequisites, seat capacity, window closing) to enroll a student.
                  </p>
                </div>

                <form onSubmit={handleForceEnroll} className="space-y-4">
                  {/* Select Student */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Student username / ID</label>
                    <select
                      value={forceEnrollForm.student_id}
                      onChange={(e) => setForceEnrollForm({...forceEnrollForm, student_id: e.target.value})}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                      required
                    >
                      <option value="">-- Choose Student --</option>
                      {students.map((s, index) => (
                        <option key={s.id || s._id || `student-${index}`} value={s.id || s._id} className="bg-slate-900">
                          {s.username} - {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Course */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Course code / Title</label>
                    <select
                      value={forceEnrollForm.course_id}
                      onChange={(e) => setForceEnrollForm({...forceEnrollForm, course_id: e.target.value})}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
                      required
                    >
                      <option value="">-- Choose Course --</option>
                      {courses.map((c, index) => (
                        <option key={c.id || c._id || `force-course-${index}`} value={c.id || c._id} className="bg-slate-900">
                          [{c.course_code}] {c.course_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Override Justification / Reason</label>
                    <textarea
                      required
                      placeholder="Special waiver, registrar permission..."
                      value={forceEnrollForm.reason}
                      onChange={(e) => setForceEnrollForm({...forceEnrollForm, reason: e.target.value})}
                      className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs h-9 shadow-md"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Force Enrollment'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="space-y-6">
            {/* Course Select */}
            <div className="max-w-xs space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Select Course Directory</label>
              <select
                value={directoryCourseId}
                onChange={(e) => setDirectoryCourseId(e.target.value)}
                className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white"
              >
                {courses.map((c, index) => (
                  <option key={c.id || c._id || `course-${index}`} value={c.id || c._id} className="bg-slate-900">
                    [{c.course_code}] {c.course_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Students Table */}
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-0">
                {directoryLoading ? (
                  <div className="p-16 flex justify-center">
                    <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  </div>
                ) : directoryStudents.length === 0 ? (
                  <div className="p-16 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No students currently enrolled in this course section.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                          <th className="p-4">Reg No / Username</th>
                          <th className="p-4">Student Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Enrollment Date</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {directoryStudents.map(student => (
                          <tr key={student.student_id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="p-4 font-mono font-medium text-slate-300">{student.registration_no}</td>
                            <td className="p-4 font-semibold text-white">{student.student_name}</td>
                            <td className="p-4 text-slate-400">{student.email}</td>
                            <td className="p-4 text-slate-500">{new Date(student.enrolled_at).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openRemoveModal(student)}
                                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 h-7 px-2.5 text-[10px]"
                              >
                                <UserMinus className="w-3.5 h-3.5 mr-1" /> Unenroll
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Remove Enrollment Modal */}
      {showRemoveDialog && selectedEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="h-1 bg-rose-500" />
            <div className="p-5 space-y-4">
              <h3 className="font-heading font-bold text-base flex items-center gap-2 text-rose-400">
                <UserMinus className="w-5 h-5" /> Remove Course Enrollment
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You are about to remove <span className="font-semibold text-white">{selectedEnrollment.student_name}</span> ({selectedEnrollment.registration_no}) from the selected course. A justification is required.
              </p>

              <form onSubmit={handleRemoveStudent} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Removal Reason</label>
                  <textarea
                    required
                    placeholder="Transferred section, administrative adjustment..."
                    value={removeEnrollForm.reason}
                    onChange={(e) => setRemoveEnrollForm({...removeEnrollForm, reason: e.target.value})}
                    className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowRemoveDialog(false)}
                    className="h-8 text-xs border border-white/5 hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Removal'}
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
