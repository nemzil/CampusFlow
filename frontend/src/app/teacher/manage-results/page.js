'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import {
  getMyCourses, getManageResults, updateManageResult, submitResultsToExamDept,
} from '@/lib/api';
import { GraduationCap, Loader2, Save, Send, ArrowLeft, Edit3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const COMPONENT_LABELS = {
  quiz1: 'Quiz 1 (3)', quiz2: 'Quiz 2 (3)', quiz3: 'Quiz 3 (4)',
  assignment1: 'Assignment 1 (3)', assignment2: 'Assignment 2 (3)', assignment3: 'Assignment 3 (4)',
  midterm: 'Midterm (30)', final: 'Final (50)',
};

export default function TeacherManageResultsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const [term, setTerm] = useState('2024F');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ components: {}, component_feedback: {}, teacher_remarks: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) router.push('/login');
    else if (!authLoading && user) loadCourses();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (courses.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get('courseId');
      if (courseId) {
        const course = courses.find(c => (c.id || c._id) === courseId);
        if (course) {
          loadResults(course);
        }
      }
    }
  }, [courses]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const d = await getMyCourses();
      setCourses(d.courses || d || []);
    } catch (e) {
      showError(e.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (course) => {
    setSelectedCourse(course);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('courseId', course.id || course._id);
      window.history.pushState({}, '', url.pathname + url.search);
    }
    setLoading(true);
    try {
      const courseTerm = course.term || '2024F';
      setTerm(courseTerm);
      const data = await getManageResults(course.id || course._id, courseTerm);
      setResults(data);
    } catch (e) {
      showError(e.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      components: { ...student.components },
      component_feedback: { ...(student.component_feedback || {}) },
      teacher_remarks: student.teacher_remarks || '',
    });
  };

  const handleSave = async () => {
    if (!editingStudent || !selectedCourse) return;
    setSubmitting(true);
    try {
      await updateManageResult({
        student_id: editingStudent.student_id,
        course_id: selectedCourse.id || selectedCourse._id,
        term,
        components: editForm.components,
        component_feedback: editForm.component_feedback,
        teacher_remarks: editForm.teacher_remarks,
      });
      showSuccess('Marks updated');
      setEditingStudent(null);
      await loadResults(selectedCourse);
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitToExamDept = async () => {
    if (!selectedCourse) return;
    if (!confirm('Submit compiled results to exam department?')) return;
    setSubmitting(true);
    try {
      const res = await submitResultsToExamDept(selectedCourse.id || selectedCourse._id, term);
      showSuccess(res.message || 'Submitted to exam department');
      await loadResults(selectedCourse);
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && !selectedCourse)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-heading">Manage Results</h1>
        <p className="text-slate-400 mt-1">Compile assignment, quiz, and exam marks and send to exam department.</p>
      </div>

      {!selectedCourse ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course.id || course._id} className="glass-card border-white/10 cursor-pointer hover:border-violet-500/40" onClick={() => loadResults(course)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-5 h-5 text-violet-400" />
                  <span className="font-bold text-white">{course.course_code}</span>
                </div>
                <p className="text-sm text-slate-400">{course.course_name}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Term: {course.term || 'N/A'}</span>
                  <span>Semester: {course.semester}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => {
              setSelectedCourse(null);
              setResults(null);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('courseId');
                window.history.pushState({}, '', url.pathname + url.search);
              }
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h2 className="text-xl font-bold text-white">
              {results ? (
                `${results.course_code} — ${results.course_name}`
              ) : (
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-16 bg-white/10" />
                  <span className="text-slate-600">—</span>
                  <Skeleton className="h-6 w-40 bg-white/10" />
                </div>
              )}
            </h2>
            <Button onClick={handleSubmitToExamDept} disabled={submitting || !results} className="ml-auto bg-violet-600">
              <Send className="w-4 h-4 mr-2" /> Send to Exam Dept
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="text-left p-3">Student</th>
                  <th className="p-3">Quizzes</th>
                  <th className="p-3">Assignments</th>
                  <th className="p-3">Midterm</th>
                  <th className="p-3">Final</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {!results ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-t border-white/5">
                      <td className="p-3">
                        <Skeleton className="h-4 w-32 bg-white/10 mb-2" />
                        <Skeleton className="h-3 w-20 bg-white/5" />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Skeleton className="h-4 w-6 bg-white/5" />
                          <span className="text-slate-600">/</span>
                          <Skeleton className="h-4 w-6 bg-white/5" />
                          <span className="text-slate-600">/</span>
                          <Skeleton className="h-4 w-6 bg-white/5" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Skeleton className="h-4 w-6 bg-white/5" />
                          <span className="text-slate-600">/</span>
                          <Skeleton className="h-4 w-6 bg-white/5" />
                          <span className="text-slate-600">/</span>
                          <Skeleton className="h-4 w-6 bg-white/5" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-4 w-8 bg-white/5" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-4 w-8 bg-white/5" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-4 w-10 bg-white/10" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-5 w-16 bg-white/5 rounded-full" />
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center">
                          <Skeleton className="h-8 w-8 bg-white/5 rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  results.students.map((s) => (
                  <tr key={s.student_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-medium text-white">{s.student_name}</div>
                      <div className="text-xs text-slate-500">{s.registration_no}</div>
                    </td>
                    <td className="p-3 text-center text-slate-300">
                      {[1, 2, 3].map((i) => s.components?.[`quiz${i}`] ?? '—').join(' / ')}
                    </td>
                    <td className="p-3 text-center text-slate-300">
                      {[1, 2, 3].map((i) => s.components?.[`assignment${i}`] ?? '—').join(' / ')}
                    </td>
                    <td className="p-3 text-center text-slate-300">{s.components?.midterm ?? '—'}</td>
                    <td className="p-3 text-center text-slate-300">{s.components?.final ?? '—'}</td>
                    <td className="p-3 text-center font-semibold text-white">{s.total_marks ?? '—'}</td>
                    <td className="p-3 text-center">
                      <Badge className={s.workflow_status === 'PUBLISHED' ? 'badge-emerald' : 'badge-violet'}>
                        {s.workflow_status || 'DRAFT'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} disabled={s.workflow_status === 'PUBLISHED'}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Edit Marks — {editingStudent.student_name}</h3>
            <div className="space-y-3">
              {Object.entries(COMPONENT_LABELS).map(([key, label]) => (
                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-slate-400">{label}</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editForm.components[key] ?? ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      components: { ...editForm.components, [key]: e.target.value === '' ? null : parseFloat(e.target.value) },
                    })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Teacher Remarks</label>
                <Input
                  value={editForm.teacher_remarks}
                  onChange={(e) => setEditForm({ ...editForm, teacher_remarks: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingStudent(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={submitting} className="flex-1 bg-violet-600">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
