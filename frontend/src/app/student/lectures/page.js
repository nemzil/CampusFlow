'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { getMyLectures } from '@/lib/api';
import { Video, Loader2, Download, Clock, Search, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function StudentLecturesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();

  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) router.push('/login');
    else if (!authLoading && user) load();
  }, [user, authLoading]);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getMyLectures();
      setLectures(d.lectures || []);
    } catch (e) { showError(e.message || 'Failed to load lectures'); }
    finally { setLoading(false); }
  };

  const filtered = lectures.filter(l =>
    l.topic.toLowerCase().includes(search.toLowerCase()) ||
    l.course_code.toLowerCase().includes(search.toLowerCase()) ||
    (l.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by course
  const grouped = filtered.reduce((acc, l) => {
    if (!acc[l.course_code]) acc[l.course_code] = [];
    acc[l.course_code].push(l);
    return acc;
  }, {});

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">My Lectures</Badge>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Recorded Lectures</h1>
          <p className="text-slate-400 mt-1 text-sm">Download lectures from your enrolled courses. Available for 7 days after upload.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by topic or course..."
          className="pl-9 h-9 bg-white/[0.03] border-white/10 text-white placeholder-slate-500" />
      </div>

      {/* Content */}
      {lectures.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center text-center">
            <Video className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No lectures available</h3>
            <p className="text-slate-400 max-w-sm text-sm">Your teachers haven't uploaded any lectures yet, or they may have expired.</p>
          </CardContent>
        </Card>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">No lectures match your search.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([courseCode, courseLectures]) => (
            <div key={courseCode} className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold font-heading text-slate-200 uppercase tracking-wider">{courseCode}</h2>
                <span className="text-[10px] text-slate-500">{courseLectures.length} lecture{courseLectures.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2.5">
                {courseLectures.sort((a, b) => a.lecture_no - b.lecture_no).map(lec => (
                  <motion.div key={lec.id} whileHover={{ x: 2 }} transition={{ duration: 0.15 }}>
                    <Card className="bg-white/[0.03] border-white/5 hover:border-violet-500/20 transition-all duration-200 relative overflow-hidden">
                      <div className="absolute left-0 top-0 h-full w-1 bg-violet-500/30" />
                      <CardContent className="p-4 pl-5 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Lecture {lec.lecture_no}</span>
                            <Badge className={`text-[8px] px-1.5 py-0 font-bold ${
                              lec.days_left <= 1 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : lec.days_left <= 3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            }`}>
                              <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                              {lec.days_left === 0 ? 'Expires today' : `${lec.days_left}d left`}
                            </Badge>
                          </div>
                          <p className="font-semibold text-white text-sm">{lec.topic}</p>
                          {lec.description && (
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{lec.description}</p>
                          )}
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            By {lec.teacher_name} · {new Date(lec.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <a href={lec.file_url} target="_blank" rel="noreferrer" download={lec.file_name}>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white text-xs font-semibold transition-colors shrink-0">
                            <Download className="w-3.5 h-3.5" />Download
                          </button>
                        </a>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
