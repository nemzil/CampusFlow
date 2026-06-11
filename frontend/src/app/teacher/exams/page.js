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
  deleteAiExam, deleteManualExam, getMyCourses,
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

  const [tab, setTab] = useState('ai');
  const [aiExams, setAiExams] = useState([]);
  const [manualExams, setManualExams] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Create modals
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [showManualCreate, setShowManualCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // AI form
  const [aiForm, setAiForm] = useState({ batch: '', subject: '', topic: '', num_questions: 5 });
  // Manual form
  const [manualForm, setManualForm] = useState({ batch: '', subject: '', title: '' });
  const [questions, setQuestions] = useState([EMPTY_Q()]);

  // Edit AI questions
  const [editExam, setEditExam] = useState(null);
  const [editingQs, setEditingQs] = useState([]);
  const [savingQ, setSavingQ] = useState(null);

  // Set live
  const [liveTarget, setLiveTarget] = useState(null);
  const [liveForm, setLiveForm] = useState({ start_time: '', end_time: '' });
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
      setAiExams(Array.isArray(ai) ? ai : []);
      setManualExams(Array.isArray(manual) ? manual : []);
      setMyCourses(Array.isArray(courses) ? courses : []);
    } catch { showError('Failed to load'); }
    finally { setLoading(false); }
  };

  // ── Derived: unique batches (terms) from teacher's courses ──────
  const batches = useMemo(() => [...new Set(myCourses.map(c => c.term))].sort().reverse(), [myCourses]);

  // ── Courses filtered by selected batch ──────────────────────────
  const coursesForBatch = (batch) => myCourses.filter(c => c.term === batch);

  // ── Handlers ───────────────────────────────────────────────────
  const handleAiCreate = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await createAiExam({ class_name: aiForm.batch, subject: aiForm.subject, topic: aiForm.topic, num_questions: aiForm.num_questions });
      showSuccess('Exam generated!');
      setShowAiCreate(false);
      setAiForm({ batch: '', subject: '', topic: '', num_questions: 5 });
      await loadAll();
    } catch (e) { showError(e.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const addQuestion = () => setQuestions(p => [...p, { ...EMPTY_Q(), question_number: p.length + 1 }]);
  const removeQ = (i) => setQuestions(p => p.filter((_, j) => j !== i).map((q, j) => ({ ...q, question_number: j + 1 })));
  const updateQ = (i, field, val) => setQuestions(p => p.map((q, j) => j === i ? { ...q, [field]: val } : q));

  const handleManualCreate = async (e) => {
    e.preventDefault(); setCreating(true);
    try {
      await createManualExam({ class_name: manualForm.batch, subject: manualForm.subject, title: manualForm.title, questions });
      showSuccess('Exam created!');
      setShowManualCreate(false);
      setManualForm({ batch: '', subject: '', title: '' });
      setQuestions([EMPTY_Q()]);
      await loadAll();
    } catch (e) { showError(e.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (exam, type) => {
    if (!confirm(`Delete "${type === 'ai' ? exam.topic : exam.title}"? This cannot be undone.`)) return;
    try {
      if (type === 'ai') await deleteAiExam(exam.exam_id);
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
      const { exam, type } = liveTarget;
      // Convert datetime-local to ISO string (includes timezone)
      const startISO = new Date(liveForm.start_time).toISOString();
      const endISO = new Date(liveForm.end_time).toISOString();
      
      if (type === 'ai') await setAiExamLive(exam.exam_id, startISO, endISO);
      else await setManualExamLive(exam.id, startISO, endISO);
      showSuccess('Exam is live!');
      setLiveTarget(null);
      await loadAll();
    } catch (e) { showError(e.message); }
    finally { setSettingLive(false); }
  };

  const handleEnd = async (exam, type) => {
    if (!confirm('End this exam?')) return;
    try {
      if (type === 'ai') await endAiExam(exam.exam_id);
      else await endManualExam(exam.id);
      showSuccess('Exam ended.');
      await loadAll();
    } catch (e) { showError(e.message); }
  };

  const openSubs = async (exam, type) => {
    setSubsTarget({ exam, type }); setSubsLoading(true);
    try {
      const data = type === 'ai' ? await getAiExamSubmissions(exam.exam_id) : await getManualExamSubmissions(exam.id);
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) { showError(e.message); }
    finally { setSubsLoading(false); }
  };

  const openGrade = async (exam, username) => {
    setGradeTarget({ exam, username }); setGrading(true); setGradeResults(null);
    try {
      const res = await gradeAiExam(exam.exam_id, username);
      setGradeResults(res.results || []);
    } catch (e) { showError(e.message); }
    finally { setGrading(false); }
  };

  const confirmGrade = async () => {
    setSaving(true);
    try {
      await confirmAiResult(gradeTarget.exam.exam_id, gradeTarget.username,
        gradeResults.map(r => ({ id: r.id, marks_obtained: r.marks_obtained, max_marks: r.max_marks, feedback: r.feedback })));
      showSuccess('Result saved!');
      setGradeTarget(null);
      if (subsTarget) openSubs(subsTarget.exam, 'ai');
    } catch (e) { showError(e.message); }
    finally { setSaving(false); }
  };

  const openMark = (sub) => {
    setMarkTarget(sub);
    setMarkForm((sub.answers || []).map(a => ({ question_number: a.question_number, awarded_marks: a.awarded_marks ?? 0, feedback: a.teacher_feedback ?? '' })));
  };

  const confirmMark = async () => {
    setMarking(true);
    try {
      const total = markForm.reduce((s, m) => s + Number(m.awarded_marks), 0);
      await markManualSubmission(markTarget.id, { question_marks: markForm, total_marks: total });
      showSuccess('Marked!');
      setMarkTarget(null);
      if (subsTarget) openSubs(subsTarget.exam, 'manual');
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

  const examStatus = (exam, type) => type === 'ai' ? exam.status?.toUpperCase() : (exam.live ? 'LIVE' : 'DRAFT');

  const curExams = tab === 'ai' ? aiExams : manualExams;

  if (authLoading || (loading && !aiExams.length && !manualExams.length)) {
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
          <div className="relative">
            <Button onClick={() => setShowPicker(p => !p)} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9">
              <Plus className="w-4 h-4 mr-1.5" />New Exam
            </Button>
            {showPicker && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-11 z-50 bg-[#0d0e1a] border border-white/10 rounded-xl shadow-2xl w-56 overflow-hidden">
                <button onClick={() => { setShowPicker(false); setShowAiCreate(true); setTab('ai'); }}
                  className="w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-colors text-left">
                  <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">AI Generated</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Give a prompt — AI writes the questions</p>
                  </div>
                </button>
                <div className="h-px bg-white/5" />
                <button onClick={() => { setShowPicker(false); setShowManualCreate(true); setTab('manual'); }}
                  className="w-full flex items-start gap-3 p-4 hover:bg-white/5 transition-colors text-left">
                  <PenLine className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white">Manual</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Write your own questions and marks</p>
                  </div>
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="relative inline-flex p-1 bg-white/5 border border-white/10 rounded-lg">
        {[['ai', 'AI Exams', Sparkles], ['manual', 'Manual Exams', PenLine]].map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${tab === key ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
            {tab === key && <motion.div layoutId="examTab" className="absolute inset-0 bg-violet-600 rounded-md" style={{ zIndex: -1 }} transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
          </button>
        ))}
      </div>

      {/* Exam list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
      ) : curExams.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.01]">
          <CardContent className="p-16 text-center">
            <p className="text-slate-500 text-xs">No {tab} exams yet.</p>
            <Button onClick={() => tab === 'ai' ? setShowAiCreate(true) : setShowManualCreate(true)}
              className="mt-4 text-xs h-8 bg-violet-600 hover:bg-violet-500 text-white"><Plus className="w-3.5 h-3.5 mr-1" />Create one</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {curExams.map(exam => {
            const type = tab;
            const id = type === 'ai' ? exam.exam_id : exam.id;
            const status = examStatus(exam, type);
            const title = type === 'ai' ? exam.topic : exam.title;
            const isDraft = status === 'DRAFT';
            return (
              <Card key={id} className="bg-white/[0.03] border-white/5">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLOR[status] || STATUS_COLOR.DRAFT}`}>{status}</Badge>
                      <span className="font-mono text-[10px] text-violet-400">{exam.class_name}</span>
                      <span className="text-[10px] text-slate-500">{exam.subject}</span>
                    </div>
                    <p className="font-bold text-white">{title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {(exam.questions?.length || 0)} questions
                      {exam.start_time && ` · ${new Date(exam.start_time).toLocaleString()}`}
                      {exam.end_time && ` → ${new Date(exam.end_time).toLocaleString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {isDraft && (
                      <>
                        {type === 'ai' && (
                          <Button size="sm" variant="ghost" onClick={() => openEditAi(exam)}
                            className="h-7 px-2 text-slate-400 hover:text-violet-400 text-xs">
                            <Edit3 className="w-3 h-3 mr-1" />Edit Qs
                          </Button>
                        )}
                        <Button size="sm" onClick={() => { setLiveTarget({ exam, type }); setLiveForm({ start_time: '', end_time: '' }); }}
                          className="h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">
                          <Play className="w-3 h-3 mr-1" />Set Live
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(exam, type)}
                          className="h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    {status === 'LIVE' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openSubs(exam, type)}
                          className="h-7 px-2 text-slate-400 hover:text-violet-400 text-xs">
                          <Users className="w-3 h-3 mr-1" />Submissions
                        </Button>
                        <Button size="sm" onClick={() => handleEnd(exam, type)}
                          className="h-7 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
                          <Square className="w-3 h-3 mr-1" />End
                        </Button>
                      </>
                    )}
                    {status === 'ENDED' && (
                      <Button size="sm" variant="ghost" onClick={() => openSubs(exam, type)}
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

      {/* ── AI Create Modal ───────────────────────────────────────── */}
      {showAiCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-400" />AI Generated Exam</h3>
              <button onClick={() => setShowAiCreate(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAiCreate} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Batch</label>
                  <select value={aiForm.batch} onChange={e => setAiForm(p => ({ ...p, batch: e.target.value, subject: '' }))} className={selectCls} required>
                    <option value="">Select batch</option>
                    {batches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Subject</label>
                  <select value={aiForm.subject} onChange={e => setAiForm(p => ({ ...p, subject: e.target.value }))} className={selectCls} required disabled={!aiForm.batch}>
                    <option value="">Select subject</option>
                    {coursesForBatch(aiForm.batch).map(c => <option key={c.course_code} value={c.course_name}>{c.course_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Topic / Prompt</label>
                <textarea value={aiForm.topic} onChange={e => setAiForm(p => ({ ...p, topic: e.target.value }))}
                  placeholder="e.g. Scenario-based questions on Python marksheet program"
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-2 min-h-[70px] resize-none focus:outline-none focus:border-violet-500/50 placeholder:text-slate-600" required />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">Questions</label>
                <div className="flex gap-2">
                  {[3, 5, 7, 10].map(n => (
                    <button key={n} type="button" onClick={() => setAiForm(p => ({ ...p, num_questions: n }))}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${aiForm.num_questions === n ? 'bg-violet-600 border-violet-500 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="bg-violet-500/5 border border-violet-500/10 rounded-lg p-3 text-[10px] text-violet-300">
                Gemini will generate <strong>{aiForm.num_questions}</strong> questions based on your prompt.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAiCreate(false)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={creating} className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                  {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ── Manual Create Modal ───────────────────────────────────── */}
      {showManualCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <h3 className="font-bold text-sm flex items-center gap-2"><PenLine className="w-4 h-4 text-indigo-400" />Manual Exam</h3>
              <button onClick={() => setShowManualCreate(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleManualCreate} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-3 border-b border-white/5 shrink-0">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Batch</label>
                    <select value={manualForm.batch} onChange={e => setManualForm(p => ({ ...p, batch: e.target.value, subject: '' }))} className={selectCls} required>
                      <option value="">Select batch</option>
                      {batches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Subject</label>
                    <select value={manualForm.subject} onChange={e => setManualForm(p => ({ ...p, subject: e.target.value }))} className={selectCls} required disabled={!manualForm.batch}>
                      <option value="">Select subject</option>
                      {coursesForBatch(manualForm.batch).map(c => <option key={c.course_code} value={c.course_name}>{c.course_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Title</label>
                    <Input value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Mid Exam" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                  </div>
                </div>
              </div>
              <div className="overflow-y-auto flex-1 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Questions</span>
                  <Button type="button" onClick={addQuestion} variant="ghost" className="h-7 px-2 text-xs text-violet-400 hover:text-violet-300"><Plus className="w-3 h-3 mr-1" />Add</Button>
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
              <div className="p-4 border-t border-white/5 shrink-0 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowManualCreate(false)} className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={creating} className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />Create Exam</>}
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
                          <Button size="sm" onClick={() => subsTarget.type === 'ai' ? openGrade(subsTarget.exam, username) : openMark(sub)}
                            className="h-7 px-2 bg-violet-600/80 hover:bg-violet-600 text-white text-[10px] font-bold">
                            <Award className="w-3 h-3 mr-1" />{subsTarget.type === 'ai' ? 'AI Grade' : 'Mark'}
                          </Button>
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
