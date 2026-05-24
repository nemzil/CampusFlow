'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term, setTerm] = useState('2024F');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Submit Modal States
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [textAnswer, setTextAnswer] = useState('');
  const [comments, setComments] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadInitialData();
    }
  }, [user, authLoading, router, term, selectedCourseId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setFileUrl('');
    setTextAnswer('');
    setComments('');
    setShowSubmitModal(true);
  };

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
    } finally {
      setSubmitting(false);
    }
  };

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

    return matchesSearch && matchesStatus;
  });

  const getDaysLeftText = (daysLeft, isOverdue) => {
    if (isOverdue) return 'Overdue';
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

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
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">My Assessments</Badge>
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of coursework items */}
      {filteredAssignments.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <ClipboardList className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No coursework found</h3>
            <p className="text-slate-400 max-w-sm">No assignments or quizzes match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          </span>
                        )}
                      </div>
                    </div>

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
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
