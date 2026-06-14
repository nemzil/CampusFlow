'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyCourses } from '@/lib/api';
import { 
  BookOpen, Users, Calendar, Layers, 
  Loader2, ClipboardList, BookOpenCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'TEACHER')) {
      router.push('/login');
    } else if (!authLoading && user) {
      fetchMyCourses();
    }
  }, [user, authLoading, router]);

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const data = await getMyCourses();
      setCourses(data.courses || data || []);
    } catch (error) {
      showError(error.message || 'Failed to fetch assigned courses');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'TH': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LAB': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'core': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'elective': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-transparent text-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-heading text-white tracking-tight">My Courses</h1>
        <p className="text-slate-400 mt-1 font-sans">
          List of course divisions assigned to you. Access enrolled students list, classroom materials, and grading sheets.
        </p>
      </div>

      {/* Assigned Courses Catalog Grid */}
      {courses.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <BookOpenCheck className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No courses assigned</h3>
            <p className="text-slate-400 max-w-sm">You are not registered as instructor for any course in this semester. Contact admin office if you think this is an error.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {courses.map((course) => {
              return (
                <motion.div
                  key={course.course_code}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Card className="relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/20 transition-all duration-300 flex flex-col h-full">
                    {/* Status Top Strip */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-violet-500/40" />

                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Identity & Badges */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-violet-400 uppercase tracking-widest">{course.course_code}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`${getTypeBadgeColor(course.course_type)} uppercase text-[9px] px-1.5`}>
                              {course.course_type || 'core'}
                            </Badge>
                            <Badge variant="outline" className={`${getCategoryBadgeColor(course.category)} uppercase text-[9px] px-1.5`}>
                              {course.category}
                            </Badge>
                          </div>
                        </div>
                        <h3 className="font-heading font-bold text-base text-white leading-snug line-clamp-1">{course.course_name}</h3>
                        <p className="text-xs text-slate-500 font-sans">{course.department || 'Software Engineering'}</p>
                      </div>

                      {/* Course Details Block */}
                      <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-white/5 text-center shrink-0">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Semester</span>
                          <span className="text-sm font-semibold text-white">{course.semester}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Credit Hours</span>
                          <span className="text-sm font-semibold text-white">{course.credit_hours} CH</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Enrolled</span>
                          <span className="text-sm font-semibold text-white">{course.enrolled_count || 0}/{course.max_students || 60}</span>
                        </div>
                      </div>

                      {/* Term & Class */}
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Active Term</span>
                          <span className="font-medium block truncate font-mono">{course.term}</span>
                        </div>
                      </div>

                      {/* Description */}
                      {course.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 italic">{course.description}</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-3 border-t border-white/5 mt-auto shrink-0">
                        <Button 
                          onClick={() => router.push(`/teacher/exams?course=${course.course_code}`)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 h-8 text-xs"
                        >
                          <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Manage Exams
                        </Button>
                        <Button 
                          onClick={() => router.push(`/teacher/messages?course=${course.course_code}`)}
                          className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-xs px-3"
                          title="Contact Students"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
