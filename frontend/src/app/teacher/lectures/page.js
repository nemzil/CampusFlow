'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { getMyCourses, getCourseLectures, uploadLecture, deleteLecture } from '@/lib/api';
import { Video, Plus, Loader2, ArrowLeft, Users, Trash2, Download, X, Upload, Clock, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function TeacherLecturesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({ lecture_no: '', topic: '', description: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) router.push('/login');
    else if (!authLoading && user) loadCourses();
  }, [user, authLoading]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const d = await getMyCourses();
      setCourses(d.courses || d || []);
    } catch (e) { showError(e.message || 'Failed to load courses'); }
    finally { setLoading(false); }
  };

  const selectCourse = async (course) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const d = await getCourseLectures(course.id || course._id);
      setLectures(d.lectures || []);
    } catch (e) { showError(e.message || 'Failed to load lectures'); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    if (!selectedCourse) return;
    try {
      const d = await getCourseLectures(selectedCourse.id || selectedCourse._id);
      setLectures(d.lectures || []);
    } catch (e) { showError(e.message); }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024) { showError('Max file size is 500MB'); e.target.value = ''; return; }
    setFile(f);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { showError('Please select a file'); return; }
    setUploading(true);
    setUploadProgress(0);
    try {
      const meta = {
        course_id: selectedCourse.id || selectedCourse._id,
        lecture_no: parseInt(form.lecture_no),
        topic: form.topic,
        description: form.description || undefined,
      };
      await uploadLecture(file, meta, setUploadProgress);
      showSuccess('Lecture uploaded!');
      setShowModal(false);
      setForm({ lecture_no: '', topic: '', description: '' });
      setFile(null);
      setUploadProgress(0);
      await refresh();
    } catch (e) { showError(e.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (lec) => {
    if (!confirm(`Delete Lecture ${lec.lecture_no}: "${lec.topic}"?`)) return;
    try {
      await deleteLecture(lec.id);
      showSuccess('Deleted.');
      await refresh();
    } catch (e) { showError(e.message || 'Failed to delete'); }
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
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Faculty Portal</Badge>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Lectures</h1>
          <p className="text-slate-400 mt-1 text-sm">Upload recorded lectures for your courses. Files are available for 7 days.</p>
        </div>
        {courses.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01] p-10 text-center text-slate-500 text-xs">No courses assigned.</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <motion.div key={course.course_code} whileHover={{ y: -3 }} onClick={() => selectCourse(course)} className="cursor-pointer">
                <Card className="bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300">
                  <CardContent className="p-6 space-y-3">
                    <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                    <h3 className="font-bold text-base text-white font-heading">{course.course_name}</h3>
                    <div className="flex justify-between text-xs text-slate-400 border-t border-white/5 pt-3">
                      <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />Manage Lectures</span>
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button onClick={() => setSelectedCourse(null)} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-medium mb-1">
            <ArrowLeft className="w-4 h-4" />Back to My Courses
          </button>
          <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase">{selectedCourse.course_code}</span>
          <h1 className="text-2xl font-bold font-heading tracking-tight">{selectedCourse.course_name}</h1>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9 self-start sm:self-center">
          <Plus className="w-4 h-4 mr-1.5" />Upload Lecture
        </Button>
      </div>

      {/* Lectures list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
      ) : lectures.length === 0 ? (
        <Card className="border-white/5 bg-white/[0.01]">
          <CardContent className="p-16 flex flex-col items-center text-center">
            <Video className="w-14 h-14 text-slate-700 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">No lectures yet</h3>
            <p className="text-slate-500 text-sm">Upload your first recorded lecture.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lectures.sort((a, b) => a.lecture_no - b.lecture_no).map(lec => (
            <Card key={lec.id} className="bg-white/[0.03] border-white/5 relative overflow-hidden">
              <div className="absolute left-0 top-0 h-full w-1 bg-violet-500/40" />
              <CardContent className="p-4 pl-5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Lecture {lec.lecture_no}</span>
                    <Badge className={`text-[8px] px-1.5 py-0 font-bold ${lec.days_left <= 1 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : lec.days_left <= 3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />{lec.days_left}d left
                    </Badge>
                  </div>
                  <p className="font-semibold text-white text-sm">{lec.topic}</p>
                  {lec.description && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{lec.description}</p>}
                  <p className="text-[10px] text-slate-600 mt-0.5">{lec.file_name} · Uploaded {new Date(lec.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={lec.file_url} target="_blank" rel="noreferrer" download={lec.file_name}>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(lec)} className="h-7 w-7 p-0 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading flex items-center gap-2">
                <Upload className="w-4 h-4 text-violet-400" />Upload Lecture
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Lecture No.</label>
                  <Input type="number" min={1} value={form.lecture_no}
                    onChange={e => setForm(p => ({ ...p, lecture_no: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Topic</label>
                  <Input value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder="e.g. Linked Lists" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Description <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of what's covered..."
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-2 min-h-[60px] resize-none focus:outline-none focus:border-violet-500/50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Lecture File <span className="text-slate-600 normal-case font-normal">(video, PDF, etc. · max 500MB)</span></label>
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${file ? 'border-violet-500/40 bg-violet-500/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}`}>
                  <input type="file" onChange={handleFileChange} className="hidden" />
                  {file ? (
                    <>
                      <Video className="w-5 h-5 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300 text-center break-all">{file.name}</span>
                      <span className="text-[10px] text-slate-500">{(file.size / (1024 * 1024)).toFixed(1)} MB · Click to change</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="text-xs text-slate-400">Click to select file</span>
                    </>
                  )}
                </label>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-300">This lecture will be automatically deleted after <span className="font-bold">7 days</span>.</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 text-xs h-9 text-slate-400 hover:text-white border border-white/10">Cancel</Button>
                <Button type="submit" disabled={uploading} className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                  {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Uploading {uploadProgress}%...</> : <><Upload className="w-3.5 h-3.5 mr-1.5" />Upload</>}
                </Button>
              </div>
              {uploading && (
                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                  <div className={`bg-violet-500 h-1.5 rounded-full transition-all duration-500 ${uploadProgress < 100 ? 'animate-pulse' : ''}`} style={{ width: `${uploadProgress || 100}%` }} />
                </div>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
