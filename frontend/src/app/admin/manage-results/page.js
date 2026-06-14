'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  getExamDeptPendingResults, examDeptUpdateResult, examDeptPublishResults,
} from '@/lib/api';
import { isExamManagementAdmin } from '@/lib/adminAccess';
import { GraduationCap, Loader2, Save, Send, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const COMPONENT_KEYS = ['quiz1', 'quiz2', 'quiz3', 'assignment1', 'assignment2', 'assignment3', 'midterm', 'final'];

export default function AdminManageResultsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const getCurrentTerm = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 1 && month <= 5 ? `${year}S` : `${year}F`;
  };
  const [term, setTerm] = useState(getCurrentTerm());
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ components: {}, teacher_remarks: '' });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.push('/login');
    else if (!authLoading && user && !isExamManagementAdmin(user)) router.push('/admin');
    else if (!authLoading && user) loadPending();
  }, [user, authLoading, router, term]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const data = await getExamDeptPendingResults(term);
      setCourses(data || []);
    } catch (e) {
      showError(e.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (courseId, student) => {
    setEditingStudent({ ...student, course_id: courseId });
    setEditForm({
      components: { ...student.components },
      teacher_remarks: student.teacher_remarks || '',
    });
  };

  const handleSave = async () => {
    if (!editingStudent) return;
    setSubmitting(true);
    try {
      await examDeptUpdateResult({
        student_id: editingStudent.student_id,
        course_id: editingStudent.course_id,
        term,
        components: editForm.components,
        teacher_remarks: editForm.teacher_remarks,
      });
      showSuccess('Result updated');
      setEditingStudent(null);
      await loadPending();
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (courseId) => {
    if (!confirm('Publish results to students? CGPA will generate when all courses are complete.')) return;
    setSubmitting(true);
    try {
      const res = await examDeptPublishResults(courseId, term);
      showSuccess(res.message || 'Published to students');
      if (res.cgpa_generated?.length) {
        showSuccess(`CGPA generated for ${res.cgpa_generated.length} student(s)`);
      }
      await loadPending();
    } catch (e) {
      showError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white font-heading">Manage Results</h1>
          <p className="text-slate-400 mt-1">Review teacher submissions, edit marks, and publish compiled CGPA to students.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 font-medium">Term:</span>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500/50"
          >
            {(() => {
              const options = [];
              const baseYear = 2024;
              const currentYear = new Date().getFullYear();
              for (let y = baseYear; y <= currentYear + 1; y++) {
                options.push(`${y}S`);
                options.push(`${y}F`);
              }
              return options.map((opt) => (
                <option key={opt} value={opt} className="bg-[#0b0c16]">
                  {opt}
                </option>
              ));
            })()}
          </select>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="glass-card border-white/10">
          <CardContent className="p-8 text-center text-slate-400">No submitted results pending review.</CardContent>
        </Card>
      ) : (
        courses.map((course) => (
          <Card key={`${course.course_id}-${course.term}`} className="glass-card border-white/10">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                <div className="flex-1">
                  <h2 className="font-bold text-white">{course.course_code} — {course.course_name}</h2>
                  <p className="text-xs text-slate-500">{course.students?.length || 0} students · Term {course.term}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setExpandedCourse(expandedCourse === course.course_id ? null : course.course_id)}>
                  {expandedCourse === course.course_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={() => handlePublish(course.course_id)} disabled={submitting} className="bg-cyan-600">
                  <Send className="w-4 h-4 mr-1" /> Publish to Students
                </Button>
              </div>

              {expandedCourse === course.course_id && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="text-left p-2">Student</th>
                        <th className="p-2">Marks</th>
                        <th className="p-2">Total</th>
                        <th className="p-2">Grade</th>
                        <th className="p-2">Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(course.students || []).map((s) => (
                        <tr key={s.student_id} className="border-b border-white/5">
                          <td className="p-2">
                            <div className="text-white font-medium">{s.student_name}</div>
                            <div className="text-xs text-slate-500">{s.registration_no}</div>
                          </td>
                          <td className="p-2 text-slate-300 text-xs">
                            {COMPONENT_KEYS.map((k) => `${k}:${s.components?.[k] ?? '—'}`).join(' · ')}
                          </td>
                          <td className="p-2 text-white font-semibold">{s.total_marks ?? '—'}</td>
                          <td className="p-2">{s.letter_grade ?? '—'}</td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(course.course_id, s)}>
                              <Edit3 className="w-4 h-4" />
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
        ))
      )}

      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Edit — {editingStudent.student_name}</h3>
            <div className="space-y-3">
              {COMPONENT_KEYS.map((key) => (
                <div key={key} className="grid grid-cols-2 gap-2 items-center">
                  <label className="text-sm text-slate-400 capitalize">{key}</label>
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
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingStudent(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={submitting} className="flex-1 bg-cyan-600">
                <Save className="w-4 h-4 mr-2" /> Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
