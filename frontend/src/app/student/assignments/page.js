'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudentAssignments, submitAssignment, getMyEnrollments, uploadPdf, unsubmitAssignment } from '@/lib/api';
import { getCurrentAcademicTerm } from '@/lib/utils';
import {
  ClipboardList, Clock, AlertCircle, Loader2, Calendar, Search,
  MessageSquare, UploadCloud, CheckSquare, Award, X, FileUp, CheckCircle2, Eye, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileDropzone from '@/components/ui/file-dropzone';

export default function StudentAssignmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term, setTerm] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [comments, setComments] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) router.push('/login');
    else if (!authLoading && user) loadInitialData();
  }, [user, authLoading, selectedCourseId]);

  useEffect(() => {
    const handleFocus = () => {
      if (user && !authLoading) {
        const refreshData = async () => {
          try {
            const courseFilterId = selectedCourseId === 'ALL' ? null : selectedCourseId;
            const data = await getStudentAssignments(courseFilterId, null);
            setAssignments(data.assignments || data || []);
          } catch (e) {
            console.error('Silent refresh failed:', e);
          }
        };
        refreshData();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, authLoading, selectedCourseId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const enrollmentsData = await getMyEnrollments(term);
      setCourses(enrollmentsData.enrollments || []);
      const resolvedTerm = enrollmentsData.term || getCurrentAcademicTerm();
      if (!term) {
        setTerm(resolvedTerm);
      }
      const courseFilterId = selectedCourseId === 'ALL' ? null : selectedCourseId;
      // Don't pass term filter - show all assignments from enrolled courses
      const data = await getStudentAssignments(courseFilterId, null);
      console.log('Fetched assignments:', data); // Debug log
      setAssignments(data.assignments || data || []);
    } catch (err) {
      console.error('Load error:', err); // Debug log
      showError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);

  const handleOpenView = (assignment) => {
    setViewingAssignment(assignment);
    setShowViewModal(true);
  };

  const handleOpenSubmit = (assignment) => {
    setSelectedAssignment(assignment);
    setPdfFile(null);
    setTextAnswer('');
    setComments('');
    setShowSubmitModal(true);
  };

  const handleUnsubmit = async (assignment) => {
    if (!confirm('Are you sure you want to unsubmit this assignment? This action cannot be undone.')) {
      return;
    }
    
    try {
      await unsubmitAssignment(assignment.id || assignment._id);
      showSuccess('Submission removed successfully');
      await loadInitialData();
    } catch (err) {
      showError(err.message || 'Failed to unsubmit');
    }
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
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    // Show all assignments for enrolled courses regardless of term
    const matchesSearch =
      a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course_code?.toLowerCase().includes(searchQuery.toLowerCase());
    const sub = a.my_submission;
    let matchesStatus = true;
    if (statusFilter === 'PENDING') matchesStatus = !sub;
    else if (statusFilter === 'SUBMITTED') matchesStatus = sub && sub.status === 'SUBMITTED';
    else if (statusFilter === 'GRADED') matchesStatus = sub && sub.status === 'GRADED';
    else if (statusFilter === 'LATE') matchesStatus = sub && sub.is_late;
    return matchesSearch && matchesStatus;
  });

  const getDaysLeftText = (daysLeft, isOverdue) => {
    if (isOverdue) return 'Overdue';
    if (daysLeft === 0) return 'Due today';
    if (daysLeft === 1) return 'Due tomorrow';
    return `${daysLeft} days left`;
  };

  if (authLoading || (loading && assignments.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-medium">Loading Coursework...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Assignments & Quizzes</h1>
          <p className="text-slate-500 mt-1">Submit coursework and view grading results for the current session.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Course</span>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
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
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
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
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title or course code..."
                className="h-9 pl-9 bg-slate-50 border-slate-200 text-slate-850 placeholder:text-slate-400 rounded-xl text-xs" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Layout */}
      <div className="space-y-4">
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {filteredAssignments.length === 0 ? (
              <div className="p-16 flex flex-col items-center text-center">
                <ClipboardList className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800 mb-2">No coursework found</h3>
                <p className="text-slate-500 max-w-sm text-xs">No assignments or quizzes match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Assignment Title</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Max Marks</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Deadline</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Score</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssignments.map((assignment, idx) => {
                      const sub = assignment.my_submission;
                      const isSubmitted = !!sub;
                      const isGraded = sub?.status === 'GRADED';
                      const isOverdue = assignment.is_overdue;

                      return (
                        <tr key={assignment.id || idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs">
                            <span className="font-mono font-bold text-slate-700 block">{assignment.course_code}</span>
                            <Badge variant="outline" className="mt-1 bg-sky-50 text-sky-600 border-sky-100 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5">
                              {assignment.type} {assignment.number}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs">
                            <span className="font-bold text-slate-900 block">{assignment.title}</span>
                            {assignment.description && (
                              <span className="text-slate-400 text-[10px] mt-0.5 block line-clamp-1 max-w-[280px]">
                                {assignment.description}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold font-mono text-slate-600">
                            {assignment.max_marks}
                          </td>
                          <td className="p-4 text-xs text-slate-600">
                            {new Date(assignment.deadline).toLocaleDateString(undefined, { 
                              month: 'short', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </td>
                          <td className="p-4">
                            {isGraded ? (
                              <Badge className="bg-sky-50 text-sky-600 border border-sky-100 font-bold text-[9px] uppercase tracking-wider">
                                Graded
                              </Badge>
                            ) : isSubmitted ? (
                              <Badge className="bg-slate-50 text-slate-600 border border-slate-200 font-bold text-[9px] uppercase tracking-wider">
                                Submitted {sub.is_late && '(Late)'}
                              </Badge>
                            ) : (
                              <Badge className={
                                isOverdue 
                                  ? 'bg-red-50 text-red-600 border border-red-200 font-bold text-[9px] uppercase tracking-wider' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[9px] uppercase tracking-wider'
                              }>
                                {getDaysLeftText(assignment.days_left, isOverdue)}
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-xs font-bold font-mono">
                            {isGraded ? (
                              <span className="text-sky-600">{sub.marks_obtained}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                onClick={() => handleOpenView(assignment)}
                                size="sm"
                                variant="outline"
                                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold text-xs h-7 px-2.5 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                View
                              </Button>
                              {!isSubmitted && !isOverdue ? (
                                <Button
                                  onClick={() => handleOpenSubmit(assignment)}
                                  size="sm"
                                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs h-7 px-3 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  Submit
                                </Button>
                              ) : isOverdue && !isSubmitted ? (
                                <Badge className="bg-red-50 text-red-600 border border-red-150 text-[9px] py-1 px-2.5 font-bold uppercase tracking-wider">
                                  Closed
                                </Badge>
                              ) : isSubmitted && !isGraded ? (
                                <>
                                  <Badge className="bg-sky-50 text-sky-600 border border-sky-100 text-[9px] py-1 px-2.5 font-bold uppercase tracking-wider">
                                    Pending Review
                                  </Badge>
                                  <Button
                                    onClick={() => handleUnsubmit(assignment)}
                                    size="sm"
                                    variant="outline"
                                    className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700 font-bold text-xs h-7 px-2.5 cursor-pointer"
                                  >
                                    Unsubmit
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Assignment Modal */}
      <AnimatePresence>
        {showViewModal && viewingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-x border-b border-t-0 border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <div>
                  <span className="font-mono text-[10px] text-sky-600 font-bold uppercase tracking-wider block">
                    {viewingAssignment.course_code} · {viewingAssignment.type} {viewingAssignment.number}
                  </span>
                  <h3 className="font-heading font-extrabold text-base text-slate-900 mt-1">{viewingAssignment.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Due: {new Date(viewingAssignment.deadline).toLocaleString()} · {viewingAssignment.max_marks} Marks</p>
                </div>
                <button onClick={() => setShowViewModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {viewingAssignment.description && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</span>
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3">{viewingAssignment.description}</p>
                  </div>
                )}

                {viewingAssignment.questions?.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions ({viewingAssignment.questions.length})</span>
                    <ol className="space-y-2.5">
                      {viewingAssignment.questions.map((q, i) => (
                        <li key={q.id ?? i} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                          <span className="text-sky-600 font-bold shrink-0">Q{i + 1}.</span>
                          <p className="text-slate-700 leading-relaxed">{q.question}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No questions listed. Check with your instructor.</p>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
                <Button variant="ghost" onClick={() => setShowViewModal(false)}
                  className="flex-1 text-xs h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold rounded-xl cursor-pointer">
                  Close
                </Button>
                {!viewingAssignment.my_submission && !viewingAssignment.is_overdue && (
                  <Button onClick={() => { setShowViewModal(false); handleOpenSubmit(viewingAssignment); }}
                    className="flex-1 text-xs h-9 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl cursor-pointer shadow-sm">
                    <UploadCloud className="w-4 h-4 mr-1.5" />Submit Assignment
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border-x border-b border-t-0 border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                <div>
                  <span className="font-mono text-[10px] text-sky-600 font-bold uppercase tracking-wider block">
                    {selectedAssignment.course_code} · {selectedAssignment.type} {selectedAssignment.number}
                  </span>
                  <h3 className="font-heading font-extrabold text-base text-slate-900 mt-1">{selectedAssignment.title}</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Due: {new Date(selectedAssignment.deadline).toLocaleString()}</p>
                </div>
                <button onClick={() => setShowSubmitModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {/* Questions */}
                {selectedAssignment.questions?.length > 0 && (
                  <div className="p-5 border-b border-slate-100 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Questions to Answer</span>
                    <ol className="space-y-2.5">
                      {selectedAssignment.questions.map((q, i) => (
                        <li key={q.id ?? i} className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                          <span className="text-sky-600 font-bold shrink-0">Q{i + 1}.</span>
                          <p className="text-slate-700 leading-relaxed">{q.question}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <form id="submit-form" onSubmit={handleSubmit}>
                  <div className="p-5 space-y-4">

                    {/* PDF Upload */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Upload PDF <span className="text-slate-400 normal-case font-normal">(max 10MB)</span>
                      </label>
                      <FileDropzone
                        accept="application/pdf"
                        maxSize={10 * 1024 * 1024}
                        selectedFile={pdfFile}
                        onFileSelect={setPdfFile}
                        onClear={() => setPdfFile(null)}
                        label="Upload PDF File"
                        hint="Click to browse or drag and drop"
                      />
                    </div>

                    {/* Text Answer */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Text Answer <span className="text-slate-400 normal-case font-normal">(optional)</span>
                      </label>
                      <textarea 
                        value={textAnswer} 
                        onChange={e => setTextAnswer(e.target.value)}
                        placeholder="Type your answers here if not uploading a PDF..."
                        className="w-full h-24 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 resize-none focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10 transition-all" 
                      />
                    </div>

                    {/* Comments */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />Comments <span className="text-slate-400 normal-case font-normal">(optional)</span>
                      </label>
                      <textarea 
                        value={comments} 
                        onChange={e => setComments(e.target.value)}
                        placeholder="Any notes for your instructor..."
                        className="w-full h-14 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-800 resize-none focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/10 transition-all" 
                      />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-2 shrink-0">
                <Button type="button" variant="ghost" onClick={() => setShowSubmitModal(false)}
                  className="flex-1 text-xs h-9 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold rounded-xl cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" form="submit-form" disabled={submitting}
                  className="flex-1 text-xs h-9 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl cursor-pointer shadow-sm">
                  {uploading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Uploading...</>
                  ) : submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Submitting...</>
                  ) : (
                    <><UploadCloud className="w-3.5 h-3.5 mr-1.5" />Submit Coursework</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
