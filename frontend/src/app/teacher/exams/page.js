'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import {
  createAiExam, getAiExams, getAiExam, updateAiQuestion, undoAiQuestion,
  setAiExamLive, endAiExam, getAiExamSubmissions, gradeAiExam, confirmAiResult,
  getTeacherResults, createManualExam, getManualExams, setManualExamLive,
  endManualExam, getManualExamSubmissions, markManualSubmission,
  deleteAiExam, deleteManualExam, getMyCourses, gradeGenericExam,
} from '@/lib/api';
import {
  GraduationCap, Plus, Loader2, X, Save, Sparkles, RotateCcw, Edit3,
  Award, Play, Square, CheckCircle2, Users, BarChart2, PenLine, Trash2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const EMPTY_Q = () => ({ question_number: 1, text: '', max_marks: 5, correct_answer: '' });

const STATUS_COLOR = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  LIVE:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ENDED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function TeacherExamsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [allExams, setAllExams] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Unified create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState('ai'); // 'ai' or 'manual'
  const [creating, setCreating] = useState(false);

  // Unified exam form
  const [examForm, setExamForm] = useState({ 
    batch: '', 
    courseId: '',
    title: '', // User enters "Mid", "Final", etc.
    examType: 'midterm', // Still track internally for grading
    totalMarks: 30,
    topic: '', // For AI generation
    num_questions: 5,
    require_seb: false
  });
  const [questions, setQuestions] = useState([EMPTY_Q()]);

  // Edit AI questions
  const [editExam, setEditExam] = useState(null);
  const [editingQs, setEditingQs] = useState([]);
  const [savingQ, setSavingQ] = useState(null);

  // Set live
  const [liveTarget, setLiveTarget] = useState(null);
  const [liveForm, setLiveForm] = useState({ start_time: '', end_time: '', require_seb: false });
  const [settingLive, setSettingLive] = useState(false);

  // Submissions
  const [subsTarget, setSubsTarget] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  // AI grade
  const [gradeTarget, setGradeTarget] = useState(null);
  const [gradeResults, setGradeResults] = useState(null);
  const [grading, setGrading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manual mark
  const [markTarget, setMarkTarget] = useState(null);
  const [markForm, setMarkForm] = useState([]);
  const [marking, setMarking] = useState(false);

  // Results
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) router.push('/login');
    else if (!authLoading && user) loadAll();
  }, [user, authLoading]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ai, manual, courses] = await Promise.all([
        getAiExams({ teacher_username: user.username }).catch(() => []),
        getManualExams({ teacher_username: user.username }).catch(() => []),
        getMyCourses().catch(() => []),
      ]);
      
      // Merge AI and Manual exams into single list
      const aiExamsWithType = (Array.isArray(ai) ? ai : []).map(e => ({ ...e, creation_mode: 'ai', id: e.exam_id }));
      const manualExamsWithType = (Array.isArray(manual) ? manual : []).map(e => ({ ...e, creation_mode: 'manual' }));
      const merged = [...aiExamsWithType, ...manualExamsWithType].sort((a, b) => {
        // Sort by date if available, newest first
        return new Date(b.start_time || 0) - new Date(a.start_time || 0);
      });
      
      setAllExams(merged);
      setMyCourses(Array.isArray(courses) ? courses : []);
    } catch { showError('Failed to load'); }
    finally { setLoading(false); }
  };

  // ── Derived: unique batches (terms) from teacher's courses ──────
  const batches = useMemo(() => [...new Set(myCourses.map(c => c.term))].sort().reverse(), [myCourses]);

  // ── Courses filtered by selected batch ──────────────────────────
  const coursesForBatch = (batch) => myCourses.filter(c => c.term === batch);

  // ── Handlers ───────────────────────────────────────────────────
  const handleCreateExam = async (e) => {
    e.preventDefault(); 
    setCreating(true);
    
    try {
      const selectedCourse = myCourses.find(c => c.id === examForm.courseId);
      
      if (creationMode === 'ai') {
        // AI-generated exam
        await createAiExam({ 
          batch: examForm.batch,
          course_id: examForm.courseId,
          subject: selectedCourse?.course_name || '',
          topic: examForm.topic, 
          num_questions: examForm.num_questions,
          exam_type: examForm.examType,
          total_marks: examForm.totalMarks
        });
        showSuccess('AI exam generated!');
      } else {
        // Manual exam
        await createManualExam({ 
          batch: examForm.batch,
          course_id: examForm.courseId,
          subject: selectedCourse?.course_name || '',
          title: examForm.title, 
          exam_type: examForm.examType,
          total_marks: examForm.totalMarks,
          questions 
        });
        showSuccess('Exam created!');
      }
      
      setShowCreateModal(false);
      setExamForm({ batch: '', courseId: '', title: '', examType: 'midterm', totalMarks: 30, topic: '', num_questions: 5, require_seb: false });
      setQuestions([EMPTY_Q()]);
      await loadAll();
    } catch (e) { 
      showError(e.message || 'Failed'); 
    } finally { 
      setCreating(false); 
    }
  };

  const addQuestion = () => setQuestions(p => [...p, { ...EMPTY_Q(), question_number: p.length + 1 }]);
  const removeQ = (i) => setQuestions(p => p.filter((_, j) => j !== i).map((q, j) => ({ ...q, question_number: j + 1 })));
  const updateQ = (i, field, val) => setQuestions(p => p.map((q, j) => j === i ? { ...q, [field]: val } : q));

  const handleDelete = async (exam) => {
    const displayTitle = exam.creation_mode === 'ai' ? exam.topic : exam.title;
    if (!confirm(`Delete "${displayTitle}"? This cannot be undone.`)) return;
    try {
      if (exam.creation_mode === 'ai') await deleteAiExam(exam.exam_id || exam.id);
      else await deleteManualExam(exam.id);
      showSuccess('Deleted.');
      await loadAll();
    } catch (e) { showError(e.message || 'Failed to delete'); }
  };

  const openEditAi = async (exam) => {
    try {
      const full = await getAiExam(exam.exam_id);
      setEditExam(full);
      setEditingQs(full.questions.map(q => ({ ...q, _draft: q.question })));
    } catch (e) { showError(e.message); }
  };

  const saveQ = async (q) => {
    setSavingQ(q.id);
    try {
      await updateAiQuestion(editExam.exam_id, q.id, q._draft);
      setEditingQs(p => p.map(x => x.id === q.id ? { ...x, question: x._draft } : x));
      showSuccess('Saved.');
    } catch (e) { showError(e.message); }
    finally { setSavingQ(null); }
  };

  const undoQ = async (q) => {
    setSavingQ(q.id);
    try {
      await undoAiQuestion(editExam.exam_id, q.id);
      const fresh = await getAiExam(editExam.exam_id);
      setEditingQs(fresh.questions.map(x => ({ ...x, _draft: x.question })));
    } catch (e) { showError(e.message); }
    finally { setSavingQ(null); }
  };

  const handleSetLive = async (e) => {
    e.preventDefault(); setSettingLive(true);
    try {
      const { exam } = liveTarget;
      const startISO = new Date(liveForm.start_time).toISOString();
      const endISO = new Date(liveForm.end_time).toISOString();
      
      if (exam.creation_mode === 'ai') await setAiExamLive(exam.exam_id || exam.id, startISO, endISO, liveForm.require_seb);
      else await setManualExamLive(exam.id, startISO, endISO, liveForm.require_seb);
      showSuccess('Exam is live!');
      setLiveTarget(null);
      await loadAll();
    } catch (e) { showError(e.message); }
    finally { setSettingLive(false); }
  };

  const handleEnd = async (exam) => {
    if (!confirm('End this exam?')) return;
    try {
      if (exam.creation_mode === 'ai') await endAiExam(exam.exam_id || exam.id);
      else await endManualExam(exam.id);
      showSuccess('Exam ended.');
      await loadAll();
    } catch (e) { showError(e.message); }
  };

  const openSubs = async (exam) => {
    setSubsTarget({ exam, type: exam.creation_mode }); setSubsLoading(true);
    try {
      const data = exam.creation_mode === 'ai' 
        ? await getAiExamSubmissions(exam.exam_id || exam.id)
        : await getManualExamSubmissions(exam.id);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) { showError(e.message); }
    finally { setSubsLoading(false); }
  };

  const openGrade = async (exam, username) => {
    setGradeTarget({ exam, username }); setGrading(true); setGradeResults(null);
    try {
      const res = await gradeAiExam(exam.exam_id || exam.id, username);
      setGradeResults(res.results || []);
    } catch (e) { showError(e.message); }
    finally { setGrading(false); }
  };

  const openGradeManual = async (exam, submission) => {
    const studentUsername = submission.student_username;
    setGradeTarget({ exam, username: studentUsername }); setGrading(true); setGradeResults(null);
    try {
      const res = await gradeGenericExam(
        exam.title,
        exam.questions.map(q => ({
          id: q.question_number,
          text: q.text,
          correct_answer: q.correct_answer || 'N/A',
          max_marks: q.max_marks
        })),
        submission.answers.map(a => ({
          id: a.question_number,
          student_answer: a.answer_text
        }))
      );
      
      // Merge AI marks/feedback with question details for rendering
      const mergedResults = exam.questions.map(q => {
        const aiRes = (res.results || []).find(r => r.id === q.question_number) || {};
        return {
          id: q.question_number,
          question: q.text,
          max_marks: q.max_marks,
          marks_obtained: aiRes.marks_obtained ?? 0,
          feedback: aiRes.feedback || ''
        };
      });
      setGradeResults(mergedResults);
    } catch (e) { showError(e.message); }
    finally { setGrading(false); }
  };

  const confirmGrade = async () => {
    setSaving(true);
    try {
      const isAi = gradeTarget.exam.creation_mode === 'ai';
      if (isAi) {
        await confirmAiResult(gradeTarget.exam.exam_id || gradeTarget.exam.id, gradeTarget.username,
          gradeResults.map(r => ({ id: r.id, marks_obtained: r.marks_obtained, max_marks: r.max_marks, feedback: r.feedback })));
      } else {
        // Find the submission ID for the manual exam student
        const submission = submissions.find(s => s.student_username === gradeTarget.username);
        if (!submission) throw new Error('Submission not found');
        
        await markManualSubmission(submission.id, {
          question_marks: gradeResults.map(r => ({
            question_number: r.id,
            awarded_marks: r.marks_obtained,
            feedback: r.feedback
          })),
          total_marks: gradeResults.reduce((s, r) => s + (r.marks_obtained || 0), 0)
        });
      }
      showSuccess('Result saved!');
      setGradeTarget(null);
      if (subsTarget) openSubs(subsTarget.exam);
    } catch (e) { showError(e.message); }
    finally { setSaving(false); }
  };

  const openMark = (sub) => {
    const isAi = sub.answers && sub.answers.length > 0 && ('student_answer' in sub.answers[0] || 'marks' in sub.answers[0]);
    const normalizedAnswers = (sub.answers || []).map(a => {
      if (isAi) {
        return {
          question_number: a.id || a.questionNumber,
          question: a.question,
          answer_text: a.student_answer,
          correct_answer: a.correct_answer,
          max_marks: a.marks || a.max_marks || 5,
          awarded_marks: a.awarded_marks ?? 0,
          teacher_feedback: a.teacher_feedback ?? ''
        };
      } else {
        return {
          question_number: a.question_number,
          question: a.question,
          answer_text: a.answer_text,
          correct_answer: a.correct_answer,
          max_marks: a.max_marks,
          awarded_marks: a.awarded_marks ?? 0,
          teacher_feedback: a.teacher_feedback ?? ''
        };
      }
    });

    setMarkTarget({ ...sub, answers: normalizedAnswers });
    setMarkForm(normalizedAnswers.map(a => ({ question_number: a.question_number, awarded_marks: a.awarded_marks, feedback: a.teacher_feedback })));
  };

  const confirmMark = async () => {
    setMarking(true);
    try {
      const total = markForm.reduce((s, m) => s + Number(m.awarded_marks), 0);
      if (subsTarget.type === 'ai') {
        const items = markForm.map(m => ({
          id: m.question_number,
          marks_obtained: Number(m.awarded_marks),
          max_marks: markTarget.answers.find(a => a.question_number === m.question_number)?.max_marks || 5,
          feedback: m.feedback
        }));
        await confirmAiResult(
          subsTarget.exam.exam_id || subsTarget.exam.id,
          markTarget.student_username,
          items
        );
      } else {
        await markManualSubmission(markTarget.id, { question_marks: markForm, total_marks: total });
      }
      showSuccess('Marked!');
      setMarkTarget(null);
      if (subsTarget) openSubs(subsTarget.exam);
    } catch (e) { showError(e.message); }
    finally { setMarking(false); }
  };

  const openResults = async () => {
    setShowResults(true); setResultsLoading(true);
    try {
      const data = await getTeacherResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) { showError(e.message); }
    finally { setResultsLoading(false); }
  };

  const examStatus = (exam) => {
    return exam.status?.toUpperCase() || 'DRAFT';
  };

  if (authLoading || (loading && !allExams.length)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#060813]"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>;
  }

  // ── Shared dropdown style ──────────────────────────────────────
  const selectCls = "w-full bg-white/5 border border-white/10 text-white text-xs h-9 rounded-md px-2 focus:outline-none focus:border-violet-500/50 appearance-none";

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Faculty Portal</Badge>
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-violet-400" />Exams
          </h1>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          <Button onClick={openResults} variant="ghost" className="text-xs h-9 border border-white/10 text-slate-400 hover:text-white">
            <BarChart2 className="w-3.5 h-3.5 mr-1.5" />Results
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9">
            <Plus className="w-4 h-4 mr-1.5" />Create Exam
          </Button>
        </div>
      </div>

      {/* Exam list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
      ) : allExams.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.01]">
          <CardContent className="p-16 text-center">
            <p className="text-slate-500 text-xs">No exams yet.</p>
            <Button onClick={() => setShowCreateModal(true)}
              className="mt-4 text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white"><Plus className="w-3.5 h-3.5 mr-1" />Create one</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {allExams.map(exam => {
            const id = exam.id;
            const status = examStatus(exam);
            const title = exam.creation_mode === 'ai' ? exam.topic : exam.title;
            const isDraft = status === 'DRAFT';
            const isAI = exam.creation_mode === 'ai';
            
            return (
              <Card key={id} className="bg-white/[0.03] border-white/5">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLOR[status] || STATUS_COLOR.DRAFT}`}>{status}</Badge>
                      {isAI && <Badge className="text-[9px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">AI</Badge>}
                      <span className="font-mono text-[10px] text-violet-400">{exam.class_name}</span>
                      <span className="text-[10px] text-slate-500">{exam.subject}</span>
                    </div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(exam.questions?.length || 0)} questions · {exam.total_marks || 30} marks
                      {exam.start_time && ` · ${new Date(exam.start_time).toLocaleString()}`}
                      {exam.end_time && ` → ${new Date(exam.end_time).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {isDraft && (
                      <>
                        {isAI && (
                          <Button size="sm" variant="ghost" onClick={() => openEditAi(exam)}
                            className="h-7 px-2 text-slate-400 hover:text-violet-400 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />Edit Qs
                          </Button>
                        )}
                        <Button size="sm" onClick={() => { setLiveTarget({ exam }); setLiveForm({ start_time: '', end_time: '', require_seb: exam.require_seb || exam.requireSeb || false }); }}
                          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                          <Play className="w-3 h-3 mr-1" />Set Live
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(exam)}
                          className="h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {status === 'LIVE' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openSubs(exam)}
                          className="h-7 px-2 text-slate-400 hover:text-violet-400 text-xs">
                          <Users className="w-3 h-3 mr-1" />Submissions
                        </Button>
                        <Button size="sm" onClick={() => handleEnd(exam)}
                          className="h-7 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
                          <Square className="w-3 h-3 mr-1" />End
                        </Button>
                      </>
                    )}
                    {status === 'ENDED' && (
                      <Button size="sm" variant="ghost" onClick={() => openSubs(exam)}
                        className="h-7 px-2 text-slate-400 hover:text-violet-400 text-xs">
                        <Users className="w-3 h-3 mr-1" />Submissions
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Unified Create Modal ───────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-sm">Create Exam</h3>
                <div className="flex bg-white/5 rounded-lg p-1">
                  <button type="button" onClick={() => setCreationMode('ai')} className={`text-[10px] px-3 py-1 rounded-md font-semibold transition-colors ${creationMode === 'ai' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>AI Generate</button>
                  <button type="button" onClick={() => setCreationMode('manual')} className={`text-[10px] px-3 py-1 rounded-md font-semibold transition-colors ${creationMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manual</button>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateExam} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 border-b border-white/5 shrink-0">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Batch</label>
                    <select value={examForm.batch} onChange={e => setExamForm(p => ({ ...p, batch: e.target.value, courseId: '' }))} className={selectCls} required>
                      <option value="">Select batch</option>
                      {batches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Subject</label>
                    <select value={examForm.courseId} onChange={e => setExamForm(p => ({ ...p, courseId: e.target.value }))} className={selectCls} required disabled={!examForm.batch}>
                      <option value="">Select subject</option>
                      {coursesForBatch(examForm.batch).map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Exam Type</label>
                    <select
                      value={examForm.examType}
                      onChange={e => {
                        const val = e.target.value;
                        setExamForm(p => ({
                          ...p,
                          examType: val,
                          totalMarks: val === 'final' ? 50 : 30
                        }));
                      }}
                      className={selectCls}
                      required
                    >
                      <option value="midterm">Midterm</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                  {creationMode === 'manual' && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Title</label>
                      <Input value={examForm.title} onChange={e => setExamForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Mid Exam" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                    </div>
                  )}
                  {creationMode === 'manual' && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Total Marks</label>
                      <Input type="number" value={examForm.totalMarks} onChange={e => setExamForm(p => ({ ...p, totalMarks: parseInt(e.target.value) || 0 }))} className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <input 
                    type="checkbox" 
                    id="require_seb_create" 
                    checked={examForm.require_seb} 
                    onChange={e => setExamForm(p => ({ ...p, require_seb: e.target.checked }))} 
                    className="rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500/50 cursor-pointer" 
                  />
                  <label htmlFor="require_seb_create" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                    Require Safe Exam Browser (SEB) for this exam
                  </label>
                </div>

                {creationMode === 'ai' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Topic / Prompt</label>
                      <textarea value={examForm.topic} onChange={e => setExamForm(p => ({ ...p, topic: e.target.value }))}
                        placeholder="e.g. Scenario-based questions on Python marksheet program"
                        className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 min-h-[70px] resize-none focus:outline-none focus:border-violet-500/50 placeholder:text-slate-600" required />
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">Questions</label>
                        <div className="flex gap-2">
                          {[3, 5, 7, 10].map(n => (
                            <button key={n} type="button" onClick={() => setExamForm(p => ({ ...p, num_questions: n }))}
                              className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${examForm.num_questions === n ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>{n}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">Total Marks</label>
                        <Input type="number" value={examForm.totalMarks} onChange={e => setExamForm(p => ({ ...p, totalMarks: parseInt(e.target.value) || 0 }))} className="bg-white/5 border-white/10 text-white text-xs h-8 w-24" required />
                      </div>
                    </div>
                    <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-[10px] text-violet-300">
                      Gemini will generate <strong>{examForm.num_questions}</strong> questions based on your prompt.
                    </div>
                  </div>
                )}
              </div>

              {creationMode === 'manual' && (
                <div className="overflow-y-auto flex-1 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Questions</span>
                    <Button type="button" onClick={addQuestion} variant="ghost" className="h-7 px-2 text-xs text-indigo-400 hover:text-indigo-300"><Plus className="w-3 h-3 mr-1" />Add</Button>
                  </div>
                  {questions.map((q, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-400">Q{i + 1}</span>
                        {questions.length > 1 && <button type="button" onClick={() => removeQ(i)} className="text-slate-600 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>}
                      </div>
                      <textarea value={q.text} onChange={e => updateQ(i, 'text', e.target.value)} placeholder="Question text..."
                        className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 min-h-[55px] resize-none focus:outline-none focus:border-indigo-500/50" required />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Marks</label>
                          <Input type="number" min={1} value={q.max_marks} onChange={e => updateQ(i, 'max_marks', parseInt(e.target.value))} className="bg-white/5 border-white/10 text-white text-xs h-8" />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1">Model Answer (optional)</label>
                          <Input value={q.correct_answer} onChange={e => updateQ(i, 'correct_answer', e.target.value)} placeholder="Key points..." className="bg-white/5 border-white/10 text-white text-xs h-8" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 border-t border-white/5 shrink-0 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={creating} className={`flex-1 text-xs h-9 text-white font-semibold ${creationMode === 'ai' ? 'bg-violet-600 hover:bg-violet-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                  {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />{creationMode === 'ai' ? 'Generating...' : 'Creating...'}</> : 
                    creationMode === 'ai' ? <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Create Exam</>
                  }
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Edit AI Questions ─────────────────────────────────────── */}
      {editExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div><h3 className="font-bold text-sm">Edit Questions</h3><p className="text-[10px] text-slate-500 mt-0.5">{editExam.topic}</p></div>
              <button onClick={() => setEditExam(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {editingQs.map((q, i) => (
                <div key={q.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-violet-400">Q{i + 1} · {q.max_marks}m</span>
                    {q.original_question && q.original_question !== q.question && (
                      <button onClick={() => undoQ(q)} disabled={savingQ === q.id} className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />Undo
                      </button>
                    )}
                  </div>
                  <textarea value={q._draft} onChange={e => setEditingQs(p => p.map(x => x.id === q.id ? { ...x, _draft: e.target.value } : x))}
                    className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:border-violet-500/50" />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-600 truncate max-w-[70%]">Answer: {q.correct_answer}</p>
                    <Button size="sm" onClick={() => saveQ(q)} disabled={savingQ === q.id || q._draft === q.question}
                      className="h-6 px-2 text-[10px] bg-violet-600 hover:bg-violet-500 text-white">
                      {savingQ === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5 shrink-0">
              <Button onClick={() => setEditExam(null)} className="w-full text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white">Done</Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Set Live ──────────────────────────────────────────────── */}
      {liveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm flex items-center gap-2"><Play className="w-4 h-4 text-emerald-400" />Set Live</h3>
              <button onClick={() => setLiveTarget(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSetLive} className="p-5 space-y-4">
              <p className="text-xs text-slate-400">{liveTarget.type === 'ai' ? liveTarget.exam.topic : liveTarget.exam.title} · {liveTarget.exam.class_name}</p>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Start Time</label>
                <Input type="datetime-local" value={liveForm.start_time} onChange={e => setLiveForm(p => ({ ...p, start_time: e.target.value }))} className="bg-white/5 border-white/10 text-white text-xs h-9" required />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">End Time</label>
                <Input type="datetime-local" value={liveForm.end_time} onChange={e => setLiveForm(p => ({ ...p, end_time: e.target.value }))} className="bg-white/5 border-white/10 text-white text-xs h-9" required />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="require_seb_live" 
                  checked={liveForm.require_seb} 
                  onChange={e => setLiveForm(p => ({ ...p, require_seb: e.target.checked }))} 
                  className="rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500/50 cursor-pointer" 
                />
                <label htmlFor="require_seb_live" className="text-xs text-slate-300 font-semibold cursor-pointer select-none">
                  Require Safe Exam Browser (SEB)
                </label>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setLiveTarget(null)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={settingLive} className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  {settingLive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Play className="w-3.5 h-3.5 mr-1.5" />Go Live</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Submissions ───────────────────────────────────────────── */}
      {subsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <h3 className="font-bold text-sm">Submissions</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">{subsTarget.type === 'ai' ? subsTarget.exam.topic : subsTarget.exam.title}</p>
              </div>
              <button onClick={() => setSubsTarget(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {subsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
              ) : submissions.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs">No submissions yet.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {submissions.map((sub, i) => {
                    const username = sub.student_username;
                    const checked = sub.checked || sub.checked_by_teacher;
                    return (
                      <div key={i} className="p-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white text-xs">{username}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{new Date(sub.submitted_at).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {checked
                            ? <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" />Graded</Badge>
                            : <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px]">Pending</Badge>}
                          <div className="flex gap-1.5">
                            <Button size="sm" onClick={() => subsTarget.type === 'ai' ? openGrade(subsTarget.exam, username) : openGradeManual(subsTarget.exam, sub)}
                              className="h-7 px-2.5 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-bold flex items-center gap-1">
                              {subsTarget.type === 'ai' ? <Award className="w-3 h-3" /> : <Sparkles className="w-3 h-3 text-violet-300 animate-pulse" />}
                              AI Grade
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openMark(sub)}
                              className="h-7 px-2 bg-white/5 hover:bg-white/10 text-white border-white/10 text-[10px] font-medium flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-slate-400" />Mark
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ── AI Grade ──────────────────────────────────────────────── */}
      {gradeTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div><h3 className="font-bold text-sm">AI Grade</h3><p className="text-[10px] text-slate-500">{gradeTarget.username}</p></div>
              <button onClick={() => setGradeTarget(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5">
              {grading ? (
                <div className="flex flex-col items-center py-12 gap-3"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /><p className="text-xs text-slate-400">Grading with AI...</p></div>
              ) : gradeResults && (
                <div className="space-y-3">
                  {gradeResults.map((r, i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-violet-400">Q{i + 1}</span>
                        <div className="flex items-center gap-2">
                          <input type="number" min={0} max={r.max_marks} value={r.marks_obtained}
                            onChange={e => setGradeResults(p => p.map((x, j) => j === i ? { ...x, marks_obtained: parseInt(e.target.value) || 0 } : x))}
                            className="w-12 bg-white/5 border border-white/10 text-white text-xs rounded px-2 py-1 text-center" />
                          <span className="text-[10px] text-slate-500">/ {r.max_marks}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{r.question}</p>
                      <p className="text-[10px] text-slate-500 italic">{r.feedback}</p>
                    </div>
                  ))}
                  <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 flex justify-between">
                    <span className="text-xs text-slate-400">Total</span>
                    <span className="text-sm font-bold text-violet-400">
                      {gradeResults.reduce((s, r) => s + (r.marks_obtained || 0), 0)} / {gradeResults.reduce((s, r) => s + r.max_marks, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {gradeResults && (
              <div className="p-4 border-t border-white/5 shrink-0 flex gap-2">
                <Button variant="ghost" onClick={() => setGradeTarget(null)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button onClick={confirmGrade} disabled={saving} className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Save Result</>}
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Manual Mark ───────────────────────────────────────────── */}
      {markTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div><h3 className="font-bold text-sm">Mark Submission</h3><p className="text-[10px] text-slate-500">{markTarget.student_username}</p></div>
              <button onClick={() => setMarkTarget(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-3">
              {(markTarget.answers || []).map((a, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400">Q{a.question_number} · max {a.max_marks}m</span>
                  <p className="text-xs text-slate-300">{a.question}</p>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-[10px] text-slate-500 mb-1">Student answer:</p>
                    <p className="text-xs text-white">{a.answer_text || '—'}</p>
                  </div>
                  {a.correct_answer && <p className="text-[10px] text-emerald-400">Model: {a.correct_answer}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Marks Awarded</label>
                      <Input type="number" min={0} max={a.max_marks} value={markForm[i]?.awarded_marks ?? 0}
                        onChange={e => setMarkForm(p => p.map((x, j) => j === i ? { ...x, awarded_marks: parseInt(e.target.value) || 0 } : x))}
                        className="bg-white/5 border-white/10 text-white text-xs h-8" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Feedback</label>
                      <Input value={markForm[i]?.feedback ?? ''} onChange={e => setMarkForm(p => p.map((x, j) => j === i ? { ...x, feedback: e.target.value } : x))}
                        placeholder="Optional..." className="bg-white/5 border-white/10 text-white text-xs h-8" />
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-3 flex justify-between">
                <span className="text-xs text-slate-400">Total</span>
                <span className="text-sm font-bold text-indigo-400">{markForm.reduce((s, m) => s + (Number(m.awarded_marks) || 0), 0)}</span>
              </div>
            </div>
            <div className="p-4 border-t border-white/5 shrink-0 flex gap-2">
              <Button variant="ghost" onClick={() => setMarkTarget(null)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
              <Button onClick={confirmMark} disabled={marking} className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                {marking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Save Marks</>}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────── */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2"><BarChart2 className="w-4 h-4 text-violet-400" />All Results</h3>
              <button onClick={() => setShowResults(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {resultsLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
              ) : results.length === 0 ? (
                <div className="p-10 text-center text-slate-500 text-xs">No results yet.</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {results.map(r => (
                    <div key={r.result_id} className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white text-xs">{r.student_username}</p>
                        <p className="text-[10px] text-slate-500">{r.title} · {r.class_name}</p>
                        <p className="text-[10px] text-slate-600">{new Date(r.checked_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-violet-400">{r.obtained_marks} / {r.total_marks}</p>
                        <p className="text-[10px] text-slate-500">{r.total_marks ? Math.round((r.obtained_marks / r.total_marks) * 100) : 0}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
