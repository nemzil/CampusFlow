'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
<<<<<<< HEAD
import { motion } from 'framer-motion';
import { getStudentAssignments, submitAssignment, getMyEnrollments, uploadPdf } from '@/lib/api';
import { getCurrentAcademicTerm } from '@/lib/utils';
import {
  ClipboardList, Clock, AlertCircle, Loader2, Calendar, Search,
  MessageSquare, UploadCloud, CheckSquare, Award, X, FileUp, CheckCircle2, Eye
=======
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getStudentAssignments, 
  submitAssignment, 
  getMyEnrollments 
} from '@/lib/api';
import { 
  ClipboardList, Clock, CheckCircle, AlertTriangle, AlertCircle, 
  Plus, Loader2, Calendar, BookOpen, Layers, Search, FileText, 
  MessageSquare, UploadCloud, ChevronRight, CheckSquare, Award
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
<<<<<<< HEAD
=======
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

<<<<<<< HEAD
  const term = getCurrentAcademicTerm();
=======
  const [term, setTerm] = useState('2024F');
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
<<<<<<< HEAD
  const [uploading, setUploading] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [comments, setComments] = useState('');

=======

  // Submit Modal States
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [comments, setComments] = useState('');

  // Search & Filter
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
<<<<<<< HEAD
    if (!authLoading && (!user || user.role !== 'STUDENT')) router.push('/login');
    else if (!authLoading && user) loadInitialData();
  }, [user, authLoading, selectedCourseId]);
=======
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadInitialData();
    }
  }, [user, authLoading, router, term, selectedCourseId]);
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

  const loadInitialData = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      const enrollmentsData = await getMyEnrollments(term);
      setCourses(enrollmentsData.enrollments || []);
      const courseFilterId = selectedCourseId === 'ALL' ? null : selectedCourseId;
      const data = await getStudentAssignments(courseFilterId);
      setAssignments(data.assignments || data || []);
    } catch (err) {
      showError(err.message || 'Failed to load assignments');
=======
      // Load enrolled courses
      const enrollmentsData = await getMyEnrollments(term);
      const enrollments = enrollmentsData.enrollments || [];
      setCourses(enrollments);

      // Load student assignments
      const courseFilterId = selectedCourseId === 'ALL' ? null : selectedCourseId;
      const assignmentsData = await getStudentAssignments(courseFilterId);
      setAssignments(assignmentsData.assignments || assignmentsData || []);
    } catch (err) {
      showError(err.message || 'Failed to load assignments database');
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);

  const handleOpenView = (assignment) => {
    setViewingAssignment(assignment);
    setShowViewModal(true);
  };

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setPdfFile(null);
=======
  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setFileUrl('');
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    setTextAnswer('');
    setComments('');
    setShowSubmitModal(true);
  };

<<<<<<< HEAD
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      showError('Only PDF files are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('File too large. Maximum 10MB.');
      e.target.value = '';
      return;
    }
    setPdfFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pdfFile && !textAnswer.trim()) {
      showError('Please upload a PDF or provide a text answer');
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl = null;
      if (pdfFile) {
        setUploading(true);
        const result = await uploadPdf(pdfFile);
        fileUrl = result.url;
        setUploading(false);
      }
      await submitAssignment(selectedAssignment.id || selectedAssignment._id, {
        file_url: fileUrl,
        text_answer: textAnswer || null,
        comments: comments || null,
      });
      showSuccess('Submitted successfully!');
      setShowSubmitModal(false);
      await loadInitialData();
    } catch (err) {
      setUploading(false);
      showError(err.message || 'Failed to submit');
=======
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileUrl && !textAnswer) {
      showError('Please provide either a File URL or a Text Answer');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        file_url: fileUrl || null,
        text_answer: textAnswer || null,
        comments: comments || null
      };
      const assignmentId = selectedAssignment.id || selectedAssignment._id;
      await submitAssignment(assignmentId, payload);
      showSuccess('Assignment submitted successfully!');
      setShowSubmitModal(false);
      await loadInitialData();
    } catch (err) {
      showError(err.message || 'Failed to submit assignment');
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    } finally {
      setSubmitting(false);
    }
  };

<<<<<<< HEAD
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch =
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const sub = a.my_submission;
    let matchesStatus = true;
    if (statusFilter === 'PENDING') matchesStatus = !sub;
    else if (statusFilter === 'SUBMITTED') matchesStatus = sub && sub.status === 'SUBMITTED';
    else if (statusFilter === 'GRADED') matchesStatus = sub && sub.status === 'GRADED';
    else if (statusFilter === 'LATE') matchesStatus = sub && sub.is_late;
=======
  // Local filters
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          a.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          a.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const submission = a.my_submission;
    let matchesStatus = true;
    if (statusFilter === 'PENDING') {
      matchesStatus = !submission;
    } else if (statusFilter === 'SUBMITTED') {
      matchesStatus = submission && submission.status === 'SUBMITTED';
    } else if (statusFilter === 'GRADED') {
      matchesStatus = submission && submission.status === 'GRADED';
    } else if (statusFilter === 'LATE') {
      matchesStatus = submission && submission.is_late;
    }

>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    return matchesSearch && matchesStatus;
  });

  const getDaysLeftText = (daysLeft, isOverdue) => {
    if (isOverdue) return 'Overdue';
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

<<<<<<< HEAD
  if (authLoading || (loading && assignments.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
=======
  const getScorePercentage = (submission) => {
    if (!submission || submission.marks_obtained === null) return 0;
    return (submission.marks_obtained / submission.max_marks) * 100;
  };

  if (authLoading || (loading && assignments.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading Assignments Portal...</p>
        </div>
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
<<<<<<< HEAD

=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">My Assessments</Badge>
<<<<<<< HEAD
          <h1 className="text-3xl font-bold font-heading tracking-tight">Assignments & Quizzes</h1>
          <p className="text-slate-400 mt-1 text-sm">Submit coursework and view grading results for the current session.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
            {term}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-white/5 bg-black/20">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Course</span>
=======
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Assignments & Quizzes</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Submit coursework assignments, practice quizzes, and view grading results.
          </p>
        </div>

        {/* Term Switcher */}
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

      {/* Filter and Search Bar */}
      <Card className="border-white/5 bg-black/20 backdrop-blur-xl">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          {/* Course filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Select Course</span>
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Enrolled Courses</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id || c.course_id} value={c.id || c.course_id}>
                    {c.course_code} - {c.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
<<<<<<< HEAD
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="GRADED">Graded</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title or course code..."
                className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500" />
=======

          {/* Status filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending Submission</SelectItem>
                <SelectItem value="SUBMITTED">Submitted (Ungraded)</SelectItem>
                <SelectItem value="GRADED">Graded</SelectItem>
                <SelectItem value="LATE">Submitted Late</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Search Coursework</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, code, instruction keywords..." 
                className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500"
              />
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
            </div>
          </div>
        </CardContent>
      </Card>

<<<<<<< HEAD
      {/* Cards */}
      {filteredAssignments.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center text-center">
=======
      {/* Grid of coursework items */}
      {filteredAssignments.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
            <ClipboardList className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No coursework found</h3>
            <p className="text-slate-400 max-w-sm">No assignments or quizzes match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<<<<<<< HEAD
          {filteredAssignments.map(assignment => {
            const sub = assignment.my_submission;
            const isSubmitted = !!sub;
            const isGraded = sub?.status === 'GRADED';
            const isOverdue = assignment.is_overdue;

            return (
              <motion.div key={assignment.id} whileHover={{ y: -3 }} transition={{ duration: 0.2 }} className="h-full flex flex-col">
                <Card className="relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300 flex flex-col h-full">
                  <div className={`absolute top-0 left-0 w-full h-1 ${isGraded ? 'bg-emerald-500/40' : isSubmitted ? 'bg-indigo-500/40' : isOverdue ? 'bg-rose-500/40' : 'bg-amber-500/40'}`} />
                  <CardContent className="p-5 flex-1 flex flex-col gap-4">

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-violet-400 uppercase tracking-widest">{assignment.course_code}</span>
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 uppercase font-semibold">{assignment.type} {assignment.number}</Badge>
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 font-semibold">{assignment.max_marks} Marks</Badge>
                        </div>
                      </div>
                      <h3 className="font-heading font-bold text-sm text-white leading-snug">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{assignment.description}</p>
                      )}
                    </div>

                    {/* Questions — shown in View modal, not on card */}

                    <div className="space-y-2 py-3 border-y border-white/5 mt-auto">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Due</span>
                        <span className="font-medium text-slate-200">{new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Status</span>
                        {isGraded ? (
                          <span className="font-semibold text-emerald-400 flex items-center gap-1"><Award className="w-3.5 h-3.5" />Graded</span>
                        ) : isSubmitted ? (
                          <span className="font-semibold text-indigo-400 flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" />Submitted{sub.is_late && ' (Late)'}</span>
                        ) : (
                          <span className={`font-semibold flex items-center gap-1 ${isOverdue ? 'text-rose-400' : 'text-amber-400'}`}>
                            <AlertCircle className="w-3.5 h-3.5" />{getDaysLeftText(assignment.days_left, isOverdue)}
=======
          {filteredAssignments.map((assignment) => {
            const submission = assignment.my_submission;
            const isSubmitted = !!submission;
            const isGraded = submission && submission.status === 'GRADED';
            const daysLeft = assignment.days_left;
            const isOverdue = assignment.is_overdue;

            return (
              <motion.div
                key={assignment.id || assignment._id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <Card className="relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300 flex flex-col h-full justify-between">
                  {/* Status Strip */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    isGraded ? 'bg-emerald-500/40' : (isSubmitted ? 'bg-indigo-500/40' : (isOverdue ? 'bg-rose-500/40' : 'bg-amber-500/40'))
                  }`} />

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-violet-400 uppercase tracking-widest">{assignment.course_code}</span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 uppercase font-semibold">
                            {assignment.type} {assignment.number}
                          </Badge>
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 font-semibold">
                            {assignment.max_marks} Marks
                          </Badge>
                        </div>
                      </div>
                      <h3 className="font-heading font-bold text-sm text-white leading-snug line-clamp-1">{assignment.title}</h3>
                      <p className="text-xs text-slate-400 font-sans line-clamp-2 leading-relaxed">{assignment.description}</p>
                    </div>

                    {/* Deadline block */}
                    <div className="space-y-2 py-3 border-y border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Due Date
                        </span>
                        <span className="font-medium text-slate-200">
                          {new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Status
                        </span>
                        {isGraded ? (
                          <span className="font-semibold text-emerald-400 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" /> Graded
                          </span>
                        ) : isSubmitted ? (
                          <span className="font-semibold text-indigo-400 flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" /> Submitted {submission.is_late && '(Late)'}
                          </span>
                        ) : (
                          <span className={`font-semibold ${isOverdue ? 'text-rose-400' : 'text-amber-400'} flex items-center gap-1`}>
                            <AlertCircle className="w-3.5 h-3.5" /> {getDaysLeftText(daysLeft, isOverdue)}
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                          </span>
                        )}
                      </div>
                    </div>

<<<<<<< HEAD
                    {isGraded && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Marks</span>
                          <span className="text-xs font-bold text-emerald-400">{sub.marks_obtained} / {assignment.max_marks}</span>
                        </div>
                        {sub.feedback && <p className="text-[10px] text-slate-300 border-t border-white/5 pt-1 italic">"{sub.feedback}"</p>}
                      </div>
                    )}

                    {/* Action buttons — always show View, conditionally show Submit */}
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => handleOpenView(assignment)}
                        className="flex-1 h-8 text-xs border border-white/10 text-slate-300 hover:text-white hover:bg-white/5">
                        <Eye className="w-3.5 h-3.5 mr-1.5" />View
                      </Button>
                      {!isSubmitted && !isOverdue ? (
                        <Button onClick={() => handleOpenSubmit(assignment)}
                          className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                          <UploadCloud className="w-3.5 h-3.5 mr-1.5" />Submit
                        </Button>
                      ) : isOverdue && !isSubmitted ? (
                        <div className="flex-1 h-8 flex items-center justify-center rounded-md bg-rose-500/5 border border-rose-500/10">
                          <span className="text-[10px] font-bold text-rose-400">Closed</span>
                        </div>
                      ) : isSubmitted && !isGraded ? (
                        <div className="flex-1 h-8 flex items-center justify-center rounded-md bg-indigo-500/5 border border-indigo-500/10">
                          <span className="text-[10px] font-bold text-indigo-400">Pending</span>
                        </div>
                      ) : (
                        <div className="flex-1 h-8 flex items-center justify-center rounded-md bg-emerald-500/5 border border-emerald-500/10">
                          <span className="text-[10px] font-bold text-emerald-400">Graded</span>
                        </div>
                      )}
                    </div>
=======
                    {/* Graded Details */}
                    {isGraded && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Obtained Marks</span>
                          <span className="text-xs font-bold text-emerald-400">{submission.marks_obtained} / {assignment.max_marks}</span>
                        </div>
                        {submission.feedback && (
                          <p className="text-[10px] text-slate-300 leading-normal border-t border-white/5 pt-1 mt-1 italic">
                            "{submission.feedback}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isSubmitted && !isOverdue && (
                      <Button
                        onClick={() => handleOpenSubmit(assignment)}
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white h-8 text-xs font-semibold shrink-0"
                      >
                        <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Submit Work
                      </Button>
                    )}

                    {!isSubmitted && isOverdue && (
                      <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-center shrink-0">
                        <span className="text-[10px] font-bold text-rose-400 uppercase block">Submission Closed</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Deadline has passed. Late submissions disabled.</span>
                      </div>
                    )}

                    {isSubmitted && !isGraded && (
                      <div className="p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-center shrink-0">
                        <span className="text-[10px] font-bold text-indigo-400 uppercase block">Pending Grading</span>
                        <span className="text-[9px] text-slate-500 mt-0.5 block">Submitted on {new Date(submission.submitted_at).toLocaleDateString()}.</span>
                      </div>
                    )}
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

<<<<<<< HEAD
      {/* View Assignment Modal */}
      {showViewModal && viewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <span className="font-mono text-[10px] text-violet-400 font-bold uppercase tracking-wider block">
                  {viewingAssignment.course_code} · {viewingAssignment.type} {viewingAssignment.number}
                </span>
                <h3 className="font-bold text-sm font-heading mt-0.5">{viewingAssignment.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(viewingAssignment.deadline).toLocaleString()} · {viewingAssignment.max_marks} Marks</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-white shrink-0 ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {viewingAssignment.description && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                  <p className="text-xs text-slate-300 leading-relaxed">{viewingAssignment.description}</p>
                </div>
              )}

              {viewingAssignment.questions?.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Questions ({viewingAssignment.questions.length})</span>
                  <ol className="space-y-3">
                    {viewingAssignment.questions.map((q, i) => (
                      <li key={q.id ?? i} className="flex gap-3 bg-white/[0.03] border border-white/5 rounded-lg p-3">
                        <span className="text-violet-400 font-bold text-xs shrink-0 mt-0.5">Q{i + 1}.</span>
                        <p className="text-xs text-slate-200 leading-relaxed">{q.question}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No questions listed. Check with your instructor.</p>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
              <Button variant="ghost" onClick={() => setShowViewModal(false)}
                className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Close</Button>
              {!viewingAssignment.my_submission && !viewingAssignment.is_overdue && (
                <Button onClick={() => { setShowViewModal(false); handleOpenSubmit(viewingAssignment); }}
                  className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                  <UploadCloud className="w-3.5 h-3.5 mr-1.5" />Submit Assignment
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

            <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
              <div>
                <span className="font-mono text-[10px] text-violet-400 font-bold uppercase tracking-wider block">
                  {selectedAssignment.course_code} · {selectedAssignment.type} {selectedAssignment.number}
                </span>
                <h3 className="font-bold text-sm font-heading mt-0.5">{selectedAssignment.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Due: {new Date(selectedAssignment.deadline).toLocaleString()}</p>
              </div>
              <button onClick={() => setShowSubmitModal(false)} className="text-slate-400 hover:text-white shrink-0 ml-4">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Questions */}
              {selectedAssignment.questions?.length > 0 && (
                <div className="p-5 border-b border-white/5 space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions to Answer</span>
                  <ol className="space-y-3">
                    {selectedAssignment.questions.map((q, i) => (
                      <li key={q.id ?? i} className="flex gap-3 bg-white/[0.03] border border-white/5 rounded-lg p-3">
                        <span className="text-violet-400 font-bold text-xs shrink-0 mt-0.5">Q{i + 1}.</span>
                        <p className="text-xs text-slate-200 leading-relaxed">{q.question}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <form id="submit-form" onSubmit={handleSubmit}>
                <div className="p-5 space-y-4">

                  {/* PDF Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Upload PDF <span className="text-slate-600 normal-case font-normal">(max 10MB)</span>
                    </label>
                    <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${pdfFile ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}>
                      <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                      {pdfFile ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-violet-400" />
                          <span className="text-xs font-semibold text-violet-300">{pdfFile.name}</span>
                          <span className="text-[10px] text-slate-500">{(pdfFile.size / 1024).toFixed(0)} KB · Click to change</span>
                        </>
                      ) : (
                        <>
                          <FileUp className="w-6 h-6 text-slate-500" />
                          <span className="text-xs text-slate-400">Click to select a PDF file</span>
                          <span className="text-[10px] text-slate-600">PDF only · Max 10MB</span>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Text Answer */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Text Answer <span className="text-slate-600 normal-case font-normal">(optional)</span>
                    </label>
                    <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)}
                      placeholder="Type your answers here if not uploading a PDF..."
                      className="w-full h-24 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none focus:outline-none focus:border-violet-500/50" />
                  </div>

                  {/* Comments */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3" />Comments <span className="text-slate-600 normal-case font-normal">(optional)</span>
                    </label>
                    <textarea value={comments} onChange={e => setComments(e.target.value)}
                      placeholder="Any notes for your instructor..."
                      className="w-full h-14 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none focus:outline-none focus:border-violet-500/50" />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-white/5 flex gap-2 shrink-0">
              <Button type="button" variant="ghost" onClick={() => setShowSubmitModal(false)}
                className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Cancel</Button>
              <Button type="submit" form="submit-form" disabled={submitting}
                className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                {uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Uploading...</>
                ) : submitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Submitting...</>
                ) : (
                  <><UploadCloud className="w-3.5 h-3.5 mr-1.5" />Submit Assignment</>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

=======
      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <Dialog open={true} onOpenChange={(open) => !open && setShowSubmitModal(false)}>
          <DialogContent className="max-w-md bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl">
            <div className="h-1 w-full bg-violet-600 shrink-0" />
            
            <DialogHeader className="p-5 pb-3 border-b border-white/5">
              <span className="font-mono text-[10px] text-violet-400 font-bold uppercase tracking-wider block">
                {selectedAssignment.course_code} - {selectedAssignment.type} {selectedAssignment.number}
              </span>
              <DialogTitle className="text-base font-bold font-heading mt-0.5">{selectedAssignment.title}</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Deadline: {new Date(selectedAssignment.deadline).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="p-5 space-y-4 text-xs">
                {/* File Url submission */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Attachment File URL</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      value={fileUrl}
                      onChange={(e) => setFileUrl(e.target.value)}
                      placeholder="https://drive.google.com/your-file-pdf"
                      className="pl-9 bg-black/40 border-white/10 text-white h-9"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500">Provide link to your PDF, DOCX, ZIP or Cloudinary folder.</span>
                </div>

                {/* Text answer */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Text Answer / Submission Notes</label>
                  <textarea
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Enter write-up or online text solution here..."
                    className="w-full h-24 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Comments */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Private Comments to Instructor</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Optional notes regarding submission..."
                      className="w-full h-12 rounded-lg bg-black/40 border border-white/10 pl-9 pr-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 border-t border-white/5 bg-black/25 flex justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSubmitModal(false)}
                  className="h-8 text-xs border border-white/5 hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit Assignment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    </div>
  );
}
