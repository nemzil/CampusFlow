'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import {
  getMyCourses,
  getCourseAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentSubmissions,
  gradeSubmission,
} from '@/lib/api';
import {
  ClipboardList, Plus, Loader2, ArrowLeft, Users, Calendar,
  CheckCircle, Clock, Edit3, Trash2, Eye, Award, X, Save,
  AlertCircle, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const MAX_MARKS_MAP = { 1: 3, 2: 3, 3: 4 };

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term, setTerm] = useState('2024F');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Submissions Panel
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [showSubmissionsPanel, setShowSubmissionsPanel] = useState(false);

  // Create/Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [form, setForm] = useState({
    type: 'ASSIGNMENT', number: 1, title: '', description: '',
    deadline: '', attachment_urls: [], status: 'DRAFT'
  });

  // Grade Modal
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: '', feedback: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadCourses();
    }
  }, [user, authLoading]);

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
    setShowSubmissionsPanel(false);
    setLoading(true);
    try {
      const data = await getCourseAssignments(course.id || course._id);
      setAssignments(data.assignments || []);
    } catch (err) {
      showError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const refreshAssignments = async () => {
    if (!selectedCourse) return;
    try {
      const data = await getCourseAssignments(selectedCourse.id || selectedCourse._id);
      setAssignments(data.assignments || []);
    } catch (err) {
      showError(err.message || 'Failed to refresh assignments');
    }
  };

  const openCreateModal = (type = 'ASSIGNMENT') => {
    setEditingAssignment(null);
    setForm({ type, number: 1, title: '', description: '', deadline: '', attachment_urls: [], status: 'DRAFT' });
    setShowFormModal(true);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setForm({
      type: assignment.type,
      number: assignment.number,
      title: assignment.title,
      description: assignment.description || '',
      deadline: assignment.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
      attachment_urls: assignment.attachment_urls || [],
      status: assignment.status
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const courseId = selectedCourse.id || selectedCourse._id;
      const payload = {
        ...form,
        course_id: courseId,
        deadline: new Date(form.deadline).toISOString(),
        number: parseInt(form.number),
        attachment_urls: form.attachment_urls.filter(Boolean),
      };

      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          title: form.title,
          description: form.description,
          deadline: new Date(form.deadline).toISOString(),
          status: form.status,
          attachment_urls: payload.attachment_urls,
        });
        showSuccess('Assignment updated successfully!');
      } else {
        await createAssignment(payload, term);
        showSuccess('Assignment created successfully!');
      }
      setShowFormModal(false);
      await refreshAssignments();
    } catch (err) {
      showError(err.message || 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (assignment) => {
    if (!confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
    try {
      await deleteAssignment(assignment.id);
      showSuccess('Assignment deleted.');
      await refreshAssignments();
    } catch (err) {
      showError(err.message || 'Failed to delete assignment');
    }
  };

  const handleViewSubmissions = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowSubmissionsPanel(true);
    setSubmissionsLoading(true);
    try {
      const data = await getAssignmentSubmissions(assignment.id);
      setSubmissions(data.submissions || []);
    } catch (err) {
      showError(err.message || 'Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const openGradeModal = (sub) => {
    setGradingSubmission(sub);
    setGradeForm({ marks_obtained: sub.marks_obtained ?? '', feedback: sub.feedback ?? '' });
    setShowGradeModal(true);
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await gradeSubmission(gradingSubmission.id, parseFloat(gradeForm.marks_obtained), gradeForm.feedback);
      showSuccess('Submission graded!');
      setShowGradeModal(false);
      await handleViewSubmissions(selectedAssignment);
    } catch (err) {
      showError(err.message || 'Failed to grade submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && courses.length === 0 && !selectedCourse)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Assignments Console...</p>
        </div>
      </div>
    );
  }

  // ─── Course Selector ───────────────────────────────────────────
  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Faculty Portal</Badge>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Assignments & Quizzes</h1>
          <p className="text-slate-400 mt-1">Select a course to manage assignments, quizzes, and grade submissions.</p>
        </div>

        {courses.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01] p-10 text-center text-slate-500 text-xs">
            No courses assigned to you. Contact administrator.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <motion.div key={course.course_code} whileHover={{ y: -3 }} onClick={() => handleSelectCourse(course)} className="cursor-pointer">
                <Card className="bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300">
                  <CardContent className="p-6 space-y-3">
                    <div>
                      <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                      <h3 className="font-bold text-base text-white font-heading mt-0.5">{course.course_name}</h3>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                      <span>Term: {course.term || term}</span>
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

  // ─── Assignments for selected course ──────────────────────────
  const grouped = { ASSIGNMENT: assignments.filter(a => a.type === 'ASSIGNMENT'), QUIZ: assignments.filter(a => a.type === 'QUIZ') };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium mb-1">
            <ArrowLeft className="w-4 h-4" /> Back to My Courses
          </button>
          <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase block">{selectedCourse.course_code}</span>
          <h1 className="text-2xl font-bold font-heading tracking-tight">{selectedCourse.course_name}</h1>
        </div>
        <div className="flex gap-2 self-start sm:self-center shrink-0">
          <Button onClick={() => openCreateModal('QUIZ')} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Quiz
          </Button>
          <Button onClick={() => openCreateModal('ASSIGNMENT')} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Assignment
          </Button>
        </div>
      </div>

      {/* Side-by-side: Assignments + Submissions Panel */}
      <div className={`grid gap-6 ${showSubmissionsPanel ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left: Assignments List */}
        <div className="space-y-6">
          {['ASSIGNMENT', 'QUIZ'].map(type => (
            <div key={type} className="space-y-3">
              <h2 className="text-sm font-bold font-heading flex items-center gap-2 text-slate-200">
                <ClipboardList className="w-4 h-4 text-violet-400" />
                {type === 'ASSIGNMENT' ? 'Assignments (10 marks)' : 'Quizzes (10 marks)'}
              </h2>

              {grouped[type].length === 0 ? (
                <Card className="border-white/5 bg-white/[0.01]">
                  <CardContent className="p-6 text-center text-slate-500 text-xs">
                    No {type.toLowerCase()}s created yet. Click "New {type === 'ASSIGNMENT' ? 'Assignment' : 'Quiz'}" to create one.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {grouped[type].sort((a, b) => a.number - b.number).map(a => (
                    <Card key={a.id} className="bg-white/[0.03] border-white/5 relative overflow-hidden">
                      <div className={`absolute left-0 top-0 h-full w-1 ${a.status === 'PUBLISHED' ? 'bg-emerald-500/40' : 'bg-slate-500/30'}`} />
                      <CardContent className="p-4 pl-5 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">{type} {a.number} · {a.max_marks} Marks</span>
                            <Badge className={`text-[8px] px-1 py-0 font-bold ${a.status === 'PUBLISHED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                              {a.status}
                            </Badge>
                          </div>
                          <p className="font-semibold text-white text-xs truncate">{a.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Due: {new Date(a.deadline).toLocaleDateString()} · {a.submission_count}/{a.submission_count + (a.pending_count || 0)} submitted · {a.graded_count} graded
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => openEditModal(a)} className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(a)} className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" onClick={() => handleViewSubmissions(a)} className="h-7 px-2 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-bold">
                            <Eye className="w-3 h-3 mr-1" /> Submissions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right: Submissions Panel */}
        {showSubmissionsPanel && selectedAssignment && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-200">Submissions</h2>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{selectedAssignment.title}</p>
              </div>
              <button onClick={() => setShowSubmissionsPanel(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-0">
                {submissionsLoading ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
                ) : submissions.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs">No submissions received yet.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {submissions.map(sub => (
                      <div key={sub.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-xs truncate">{sub.student_name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{sub.student_username}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(sub.submitted_at).toLocaleDateString()} {sub.is_late && <span className="text-rose-400 font-bold">(LATE)</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.status === 'GRADED' ? (
                            <span className="text-xs font-bold text-emerald-400">{sub.marks_obtained}/{selectedAssignment.max_marks}</span>
                          ) : (
                            <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 text-[9px]">PENDING</Badge>
                          )}
                          <Button size="sm" onClick={() => openGradeModal(sub)} className="h-7 px-2 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-bold">
                            <Award className="w-3 h-3 mr-1" /> Grade
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Create/Edit Modal ─────────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="h-1 bg-violet-600" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-base">
                  {editingAssignment ? 'Edit' : 'Create'} {form.type === 'ASSIGNMENT' ? 'Assignment' : 'Quiz'}
                </h3>
                <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {!editingAssignment && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Type</label>
                      <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white">
                        <option value="ASSIGNMENT">ASSIGNMENT</option>
                        <option value="QUIZ">QUIZ</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Number (Max Marks)</label>
                      <select value={form.number} onChange={e => setForm({ ...form, number: parseInt(e.target.value) })}
                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white">
                        <option value={1}>1 — 3 marks</option>
                        <option value={2}>2 — 3 marks</option>
                        <option value={3}>3 — 4 marks</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Title</label>
                  <Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Assignment 1: Variables and Data Types"
                    className="h-9 bg-black/40 border-white/10 text-white" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Description / Instructions</label>
                  <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Write a program that demonstrates..."
                    className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Deadline</label>
                    <input type="datetime-local" required value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white">
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setShowFormModal(false)} className="h-8 text-xs border border-white/5">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editingAssignment ? 'Save Changes' : 'Create')}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Grade Modal ───────────────────────────────────────────── */}
      {showGradeModal && gradingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="h-1 bg-emerald-500" />
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-heading font-bold text-base flex items-center gap-2 text-emerald-400">
                  <Award className="w-4 h-4" /> Grade Submission
                </h3>
                <button onClick={() => setShowGradeModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-white">{gradingSubmission.student_name}</p>
                <p className="text-slate-500 font-mono">{gradingSubmission.student_username}</p>
                <p className="text-slate-400">Submitted: {new Date(gradingSubmission.submitted_at).toLocaleString()}</p>
              </div>

              <form onSubmit={handleGrade} className="space-y-3.5 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Marks Obtained (out of {selectedAssignment?.max_marks})
                  </label>
                  <Input type="number" required min="0" max={selectedAssignment?.max_marks} step="0.5"
                    value={gradeForm.marks_obtained} onChange={e => setGradeForm({ ...gradeForm, marks_obtained: e.target.value })}
                    placeholder={`0 – ${selectedAssignment?.max_marks}`}
                    className="h-9 bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Feedback (optional)</label>
                  <textarea value={gradeForm.feedback} onChange={e => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                    placeholder="Good work, but missing error handling..."
                    className="w-full h-16 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none" />
                </div>
                <div className="flex justify-end gap-2.5">
                  <Button type="button" variant="ghost" onClick={() => setShowGradeModal(false)} className="h-8 text-xs border border-white/5">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3 h-3 mr-1" /> Save Grade</>}
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
