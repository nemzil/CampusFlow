'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import {
  getMyCourses, getCourseAssignments, createAssignment, updateAssignment,
  deleteAssignment, getAssignmentSubmissions, gradeSubmission, aiGradeSubmission,
  aiGenerateAssignment, updateAssignmentQuestion, undoAssignmentQuestion,
} from '@/lib/api';
import { ClipboardList, Plus, Loader2, ArrowLeft, Users, Edit3, Trash2, Eye, Award, X, Save, FileText, Sparkles, RotateCcw, PenLine, Wand2, FileDown, Wand, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function TeacherAssignmentsPageComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [term, setTerm] = useState('2024F');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'ASSIGNMENT');
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [showSubmissionsPanel, setShowSubmissionsPanel] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [manualForm, setManualForm] = useState({ number: 1, title: '', description: '', deadline: '', status: 'DRAFT' });
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiForm, setAiForm] = useState({ title: '', num_questions: 5, number: 1, deadline: '', status: 'DRAFT' });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAiEditModal, setShowAiEditModal] = useState(false);
  const [aiDraft, setAiDraft] = useState(null);
  const [editingQs, setEditingQs] = useState([]);
  const [savingQ, setSavingQ] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradingSub, setGradingSub] = useState(null);
  const [gradeForm, setGradeForm] = useState({ marks_obtained: '', feedback: '' });
  const [aiGrading, setAiGrading] = useState(false);
  const [aiDetails, setAiDetails] = useState([]);
  const [activeGradeTab, setActiveGradeTab] = useState('view');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) router.push('/login');
    else if (!authLoading && user) loadCourses();
  }, [user, authLoading]);

  // Sync tab from URL when navigating between sidebar links
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    const handleFocus = () => {
      if (user && !authLoading && selectedCourse) {
        refresh();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, authLoading, selectedCourse]);

  const loadCourses = async () => {
    setLoading(true);
    try { const d = await getMyCourses(); setCourses(d.courses || d || []); }
    catch (e) { showError(e.message || 'Failed to load courses'); }
    finally { setLoading(false); }
  };

  const handleSelectCourse = async (course) => {
    setSelectedCourse(course);
    setTerm(course.term || '2024F');
    setShowSubmissionsPanel(false);
    setActiveTab(searchParams.get('tab') || 'ASSIGNMENT');
    setLoading(true);
    try { const d = await getCourseAssignments(course.id || course._id); setAssignments(d.assignments || []); }
    catch (e) { showError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    if (!selectedCourse) return;
    try { const d = await getCourseAssignments(selectedCourse.id || selectedCourse._id); setAssignments(d.assignments || []); }
    catch (e) { showError(e.message); }
  };

  const openManualCreate = () => {
    setShowModePicker(false); setEditingAssignment(null);
    setManualForm({ number: 1, title: '', description: '', deadline: '', status: 'DRAFT' });
    setShowManualModal(true);
  };

  const openEditModal = (a) => {
    setEditingAssignment(a);
    setManualForm({ number: a.number, title: a.title, description: a.description || '',
      deadline: a.deadline ? new Date(a.deadline).toISOString().slice(0, 16) : '', status: a.status });
    setShowManualModal(true);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const courseId = selectedCourse.id || selectedCourse._id;
      if (editingAssignment) {
        await updateAssignment(editingAssignment.id, {
          title: manualForm.title, description: manualForm.description,
          deadline: new Date(manualForm.deadline).toISOString(), status: manualForm.status,
        });
        showSuccess('Assignment updated.');
      } else {
        await createAssignment({
          course_id: courseId, type: activeTab, number: parseInt(manualForm.number),
          title: manualForm.title, description: manualForm.description,
          deadline: new Date(manualForm.deadline).toISOString(),
          status: manualForm.status, creation_mode: 'MANUAL',
        }, term);
        showSuccess('Assignment created.');
      }
      setShowManualModal(false); await refresh();
    } catch (e) { showError(e.message || 'Failed to save'); }
    finally { setSubmitting(false); }
  };

  const openAiCreate = () => {
    setShowModePicker(false);
    setAiForm({ title: '', num_questions: 5, number: 1, deadline: '', status: 'DRAFT' });
    setShowAiModal(true);
  };

  const handleAiGenerate = async (e) => {
    e.preventDefault(); setAiGenerating(true);
    try {
      const courseId = selectedCourse.id || selectedCourse._id;
      const result = await aiGenerateAssignment({
        course_id: courseId, type: activeTab, number: parseInt(aiForm.number),
        title: aiForm.title, num_questions: parseInt(aiForm.num_questions),
        deadline: new Date(aiForm.deadline).toISOString(), status: 'DRAFT',
      }, term);
      setAiDraft(result);
      setEditingQs((result.questions || []).map(q => ({ ...q, draft: q.question, editing: false })));
      setShowAiModal(false); setShowAiEditModal(true);
    } catch (e) { showError(e.message || 'AI generation failed'); }
    finally { setAiGenerating(false); }
  };

  const saveQuestion = async (idx) => {
    const q = editingQs[idx]; setSavingQ(true);
    try {
      await updateAssignmentQuestion(aiDraft.id, q.id, q.draft);
      setEditingQs(prev => prev.map((item, i) => i === idx ? { ...item, question: item.draft, editing: false } : item));
      showSuccess('Question saved.');
    } catch (e) { showError(e.message || 'Failed'); }
    finally { setSavingQ(false); }
  };

  const undoQuestion = async (idx) => {
    const q = editingQs[idx]; setSavingQ(true);
    try {
      await undoAssignmentQuestion(aiDraft.id, q.id);
      const orig = q.original_question || q.question;
      setEditingQs(prev => prev.map((item, i) => i === idx ? { ...item, question: orig, draft: orig, editing: false } : item));
      showSuccess('Restored original.');
    } catch (e) { showError(e.message || 'Failed'); }
    finally { setSavingQ(false); }
  };

  const publishAiDraft = async () => {
    setSavingQ(true);
    try { await updateAssignment(aiDraft.id, { status: 'PUBLISHED' }); showSuccess('Published!'); setShowAiEditModal(false); await refresh(); }
    catch (e) { showError(e.message || 'Failed'); }
    finally { setSavingQ(false); }
  };

  const handleDelete = async (a) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try { await deleteAssignment(a.id); showSuccess('Deleted.'); await refresh(); }
    catch (e) { showError(e.message || 'Failed to delete'); }
  };

  const handleViewSubmissions = async (a) => {
    setSelectedAssignment(a); setShowSubmissionsPanel(true); setSubmissionsLoading(true);
    try { const d = await getAssignmentSubmissions(a.id); setSubmissions(d.submissions || []); }
    catch (e) { showError(e.message || 'Failed'); }
    finally { setSubmissionsLoading(false); }
  };

  const openGradeModal = (sub) => {
    setGradingSub(sub);
    console.log('submission data:', sub);
    setGradeForm({ marks_obtained: sub.marks_obtained ?? '', feedback: sub.feedback ?? '' });
    setAiDetails([]);
    setActiveGradeTab('view');
    setShowGradeModal(true);
  };

  const handleAiGrade = async () => {
    setAiGrading(true);
    try {
      const result = await aiGradeSubmission(gradingSub.id);
      setAiDetails(result.details || []);
      setGradeForm(p => ({
        marks_obtained: result.suggested_marks ?? p.marks_obtained,
        feedback: result.suggested_feedback || p.feedback,
      }));
      setActiveGradeTab('grade');
      showSuccess('AI suggestion applied — review and save.');
    } catch (e) { showError(e.message || 'AI grading failed'); }
    finally { setAiGrading(false); }
  };

  const handleGrade = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await gradeSubmission(gradingSub.id, parseFloat(gradeForm.marks_obtained), gradeForm.feedback);
      showSuccess('Graded!'); setShowGradeModal(false); await handleViewSubmissions(selectedAssignment);
    } catch (e) { showError(e.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (authLoading || (loading && courses.length === 0 && !selectedCourse)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">{activeTab === 'QUIZ' ? 'Quizzes' : 'Assignments'}</h1>
          <p className="text-slate-400 mt-1">Select a course to manage.</p>
        </div>
        {courses.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01] p-10 text-center text-slate-500 text-xs">No courses assigned.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <motion.div key={course.course_code} whileHover={{ y: -3 }} onClick={() => handleSelectCourse(course)} className="cursor-pointer">
                <Card className="bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300">
                  <CardContent className="p-6 space-y-3">
                    <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                    <h3 className="font-bold text-base text-white font-heading">{course.course_name}</h3>
                    <div className="flex justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                      <span>Term: {course.term || term}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.enrolled_count || 0}</span>
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

  const grouped = {
    ASSIGNMENT: assignments.filter(a => a.type === 'ASSIGNMENT'),
    QUIZ: assignments.filter(a => a.type === 'QUIZ'),
  };
  const tabColor = activeTab === 'ASSIGNMENT' ? 'violet' : 'indigo';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen" onClick={() => showModePicker && setShowModePicker(false)}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium mb-1">
            <ArrowLeft className="w-4 h-4" /> Back to My Courses
          </button>
          <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase">{selectedCourse.course_code}</span>
          <h1 className="text-2xl font-bold font-heading tracking-tight">{selectedCourse.course_name}</h1>
        </div>
        <div className="relative self-start sm:self-center" onClick={e => e.stopPropagation()}>
          <Button onClick={() => setShowModePicker(v => !v)}
            className={`text-white text-xs font-semibold h-9 ${activeTab === 'QUIZ' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-violet-600 hover:bg-violet-500'}`}>
            <Plus className="w-4 h-4 mr-1.5" /> New {activeTab === 'QUIZ' ? 'Quiz' : 'Assignment'}
          </Button>
          {showModePicker && (
            <div className="absolute right-0 top-11 z-50 w-56 bg-[#0d0e1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <button onClick={openManualCreate} className="w-full flex items-center gap-3 px-4 py-3.5 text-xs text-white hover:bg-white/5 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0"><PenLine className="w-4 h-4 text-violet-400" /></div>
                <div><p className="font-semibold">Manual</p><p className="text-slate-500 text-[10px] mt-0.5">Write title & questions yourself</p></div>
              </button>
              <div className="border-t border-white/5" />
              <button onClick={openAiCreate} className="w-full flex items-center gap-3 px-4 py-3.5 text-xs text-white hover:bg-white/5 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><Wand2 className="w-4 h-4 text-indigo-400" /></div>
                <div><p className="font-semibold">Generate with AI</p><p className="text-slate-500 text-[10px] mt-0.5">AI creates questions from title</p></div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs — hidden, driven by sidebar nav */}

      {/* Main content: list + submissions panel */}
      <div className={`grid gap-6 ${showSubmissionsPanel ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

        {/* Assignment list */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2 text-slate-200">
            {activeTab === 'ASSIGNMENT' ? <ClipboardList className="w-4 h-4 text-violet-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
            {activeTab === 'ASSIGNMENT' ? 'Assignments (10 marks total)' : 'Quizzes (10 marks total)'}
          </h2>
          {grouped[activeTab].length === 0 ? (
            <Card className="border-white/5 bg-white/[0.01]">
              <CardContent className="p-10 text-center text-slate-500 text-xs">
                No {activeTab.toLowerCase()}s yet. Click "New {activeTab === 'ASSIGNMENT' ? 'Assignment' : 'Quiz'}" to create one.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {grouped[activeTab].sort((a, b) => a.number - b.number).map(a => (
                <Card key={a.id} className="bg-white/[0.03] border-white/5 relative overflow-hidden">
                  <div className={`absolute left-0 top-0 h-full w-1 ${a.status === 'PUBLISHED' ? 'bg-emerald-500/40' : 'bg-slate-500/30'}`} />
                  <CardContent className="p-4 pl-5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">{activeTab === 'QUIZ' ? 'Quiz' : 'Assignment'} {a.number} · {a.max_marks} Marks</span>
                        <Badge className={`text-[8px] px-1 py-0 font-bold ${a.status === 'PUBLISHED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>{a.status}</Badge>
                        {a.creation_mode === 'AI' && <Badge className="text-[8px] px-1 py-0 font-bold bg-indigo-500/10 border-indigo-500/20 text-indigo-400"><Sparkles className="w-2.5 h-2.5 inline mr-0.5" />AI</Badge>}
                      </div>
                      <p className="font-semibold text-white text-xs truncate">{a.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(a.deadline).toLocaleDateString()} · {a.submission_count} submitted · {a.graded_count} graded</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(a)} className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"><Edit3 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(a)} className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" onClick={() => handleViewSubmissions(a)} className={`h-7 px-2 text-white text-[10px] font-bold ${activeTab === 'ASSIGNMENT' ? 'bg-violet-600/80 hover:bg-violet-600' : 'bg-indigo-600/80 hover:bg-indigo-600'}`}>
                        <Eye className="w-3 h-3 mr-1" />Submissions
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Submissions panel */}
        {showSubmissionsPanel && selectedAssignment && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold font-heading text-slate-200">Submissions</h2>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{selectedAssignment.title}</p>
              </div>
              <button onClick={() => setShowSubmissionsPanel(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-0">
                {submissionsLoading ? (
                  <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
                ) : submissions.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-xs">No submissions yet.</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {submissions.map(sub => (
                      <div key={sub.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-white text-xs truncate">{sub.student_name}</p>
                          <p className="text-[10px] font-mono text-slate-500">{sub.student_username}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(sub.submitted_at).toLocaleDateString()} {sub.is_late && <span className="text-rose-400 font-bold">(LATE)</span>}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {sub.status === 'GRADED' ? <span className="text-xs font-bold text-emerald-400">{sub.marks_obtained}/{selectedAssignment.max_marks}</span> : <Badge className="bg-amber-500/10 border-amber-500/20 text-amber-400 text-[9px]">PENDING</Badge>}
                          <Button size="sm" onClick={() => openGradeModal(sub)} className="h-7 px-2 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-bold"><Award className="w-3 h-3 mr-1" />Grade</Button>
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

      {/* Manual Create/Edit Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading">{editingAssignment ? 'Edit' : 'Create'} {activeTab === 'QUIZ' ? 'Quiz' : 'Assignment'}</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Number</label>
                  <Input type="number" min={1} max={3} value={manualForm.number} onChange={e => setManualForm(p => ({ ...p, number: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Status</label>
                  <select value={manualForm.status} onChange={e => setManualForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-md px-2">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Title</label>
                <Input value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-xs h-9" placeholder="Assignment title" required />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Description</label>
                <textarea value={manualForm.description} onChange={e => setManualForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:border-violet-500/50"
                  placeholder="Instructions or description..." />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Deadline</label>
                <Input type="datetime-local" value={manualForm.deadline} onChange={e => setManualForm(p => ({ ...p, deadline: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-xs h-9" required />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowManualModal(false)} className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Cancel</Button>
                <Button type="submit" disabled={submitting} className={`flex-1 text-xs h-9 text-white font-semibold ${activeTab === 'QUIZ' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-violet-600 hover:bg-violet-500'}`}>
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />{editingAssignment ? 'Save Changes' : 'Create'}</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" />Generate with AI</h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAiGenerate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Number</label>
                  <Input type="number" min={1} max={3} value={aiForm.number} onChange={e => setAiForm(p => ({ ...p, number: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Questions</label>
                  <Input type="number" min={1} max={20} value={aiForm.num_questions} onChange={e => setAiForm(p => ({ ...p, num_questions: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Title / Topic</label>
                <Input value={aiForm.title} onChange={e => setAiForm(p => ({ ...p, title: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-xs h-9" placeholder="e.g. Linked Lists and Trees" required />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Deadline</label>
                <Input type="datetime-local" value={aiForm.deadline} onChange={e => setAiForm(p => ({ ...p, deadline: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white text-xs h-9" required />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowAiModal(false)} className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Cancel</Button>
                <Button type="submit" disabled={aiGenerating} className="flex-1 text-xs h-9 text-white font-semibold bg-indigo-600 hover:bg-indigo-500">
                  {aiGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating...</> : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Generate</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Edit Questions Modal */}
      {showAiEditModal && aiDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <h3 className="font-bold text-sm font-heading flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-400" />Review AI Questions</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{aiDraft.title}</p>
              </div>
              <button onClick={() => setShowAiEditModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {editingQs.map((q, idx) => (
                <div key={q.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Q{idx + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => undoQuestion(idx)} disabled={savingQ} title="Restore original"
                        className="text-slate-500 hover:text-amber-400 transition-colors p-1"><RotateCcw className="w-3 h-3" /></button>
                      <button onClick={() => setEditingQs(prev => prev.map((item, i) => i === idx ? { ...item, editing: !item.editing } : item))}
                        className="text-slate-500 hover:text-violet-400 transition-colors p-1"><Edit3 className="w-3 h-3" /></button>
                    </div>
                  </div>
                  {q.editing ? (
                    <div className="space-y-2">
                      <textarea value={q.draft} onChange={e => setEditingQs(prev => prev.map((item, i) => i === idx ? { ...item, draft: e.target.value } : item))}
                        className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:border-violet-500/50" />
                      <Button size="sm" onClick={() => saveQuestion(idx)} disabled={savingQ} className="h-7 px-3 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold">
                        {savingQ ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">{q.question}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-white/5 shrink-0 flex gap-2">
              <Button variant="ghost" onClick={() => setShowAiEditModal(false)} className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Discard</Button>
              <Button onClick={publishAiDraft} disabled={savingQ} className="flex-1 text-xs h-9 text-white font-semibold bg-emerald-600 hover:bg-emerald-500">
                {savingQ ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Publish'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Grade / Review Modal */}
      {showGradeModal && gradingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <p className="font-bold text-sm text-white">{gradingSub.student_name || gradingSub.student_username}</p>
                <p className="text-[10px] font-mono text-slate-500">{gradingSub.student_username} · {new Date(gradingSub.submitted_at).toLocaleString()}{gradingSub.is_late && <span className="text-rose-400 font-bold ml-1">(LATE)</span>}</p>
              </div>
              <button onClick={() => setShowGradeModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-white/5 shrink-0">
              <button onClick={() => setActiveGradeTab('view')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeGradeTab === 'view' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
                View Submission
              </button>
              <button onClick={() => setActiveGradeTab('grade')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeGradeTab === 'grade' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {gradingSub.status === 'GRADED' ? 'Edit Grade' : 'Set Grade'}
              </button>
            </div>

            <div className="overflow-y-auto flex-1">

              {/* View Tab */}
              {activeGradeTab === 'view' && (
                <div className="p-5 space-y-4">
                  {/* PDF attachment */}
                  {gradingSub.file_url && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted PDF</span>
                      <div className="w-full h-96 rounded-lg border border-white/10 overflow-hidden bg-white">
                        <object data={gradingSub.file_url} type="application/pdf" className="w-full h-full">
                          <div className="flex flex-col items-center justify-center h-full gap-3 bg-white/5">
                            <FileText className="w-8 h-8 text-slate-400" />
                            <a href={gradingSub.file_url} target="_blank" rel="noreferrer"
                              className="text-xs text-violet-400 hover:text-violet-300 underline">
                              Open PDF in new tab
                            </a>
                          </div>
                        </object>
                      </div>
                      <a href={gradingSub.file_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-violet-300">
                        <FileText className="w-3 h-3" />Open in new tab
                      </a>
                    </div>
                  )}

                  {/* Text answer */}
                  {gradingSub.text_answer && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Text Answer</span>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {gradingSub.text_answer}
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  {gradingSub.comments && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Comments</span>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-xs text-slate-400 italic">
                        "{gradingSub.comments}"
                      </div>
                    </div>
                  )}

                  {!gradingSub.file_url && !gradingSub.text_answer && (
                    <p className="text-xs text-slate-500 text-center py-6">No submission content available.</p>
                  )}

                  {/* Grading action buttons */}
                  <div className="pt-2 grid grid-cols-2 gap-3 border-t border-white/5">
                    <button onClick={() => setActiveGradeTab('grade')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left">
                      <Award className="w-5 h-5 text-violet-400" />
                      <div>
                        <p className="text-xs font-semibold text-white">Check Manually</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Set marks & feedback yourself</p>
                      </div>
                    </button>
                    <button onClick={handleAiGrade} disabled={aiGrading}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left disabled:opacity-50">
                      {aiGrading ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
                      <div>
                        <p className="text-xs font-semibold text-white">{aiGrading ? 'AI Grading...' : 'Check with AI'}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Auto-suggest marks & feedback</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Grade Tab */}
              {activeGradeTab === 'grade' && (
                <div className="p-5 space-y-4">

                  {/* AI breakdown */}
                  {aiDetails.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />AI Grading Breakdown
                      </span>
                      <div className="space-y-2">
                        {aiDetails.map((d, i) => (
                          <div key={d.id ?? i} className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400">Q{d.id}</span>
                              <span className="text-[10px] font-bold text-indigo-300">{d.marks_obtained} / {d.max_marks} marks</span>
                            </div>
                            {d.question && <p className="text-[10px] text-slate-500 italic line-clamp-1">{d.question}</p>}
                            <p className="text-xs text-slate-300">{d.feedback}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <form id="grade-form" onSubmit={handleGrade} className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">
                        Marks (out of {selectedAssignment?.max_marks})
                      </label>
                      <Input type="number" min={0} max={selectedAssignment?.max_marks} step={0.5}
                        value={gradeForm.marks_obtained}
                        onChange={e => setGradeForm(p => ({ ...p, marks_obtained: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Feedback</label>
                      <textarea value={gradeForm.feedback}
                        onChange={e => setGradeForm(p => ({ ...p, feedback: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-2 min-h-[90px] resize-none focus:outline-none focus:border-violet-500/50"
                        placeholder="Feedback for the student..." />
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
              {activeGradeTab === 'view' ? (
                <>
                  <Button variant="ghost" onClick={() => setShowGradeModal(false)}
                    className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Close</Button>
                  <Button onClick={() => setActiveGradeTab('grade')}
                    className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                    <Award className="w-3.5 h-3.5 mr-1.5" />{gradingSub.status === 'GRADED' ? 'Edit Grade' : 'Set Grade'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setActiveGradeTab('view')}
                    className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Back</Button>
                  <Button type="submit" form="grade-form" disabled={submitting}
                    className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Award className="w-3.5 h-3.5 mr-1.5" />Save Grade</>}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

export default function TeacherAssignmentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    }>
      <TeacherAssignmentsPageComponent />
    </Suspense>
  );
}
