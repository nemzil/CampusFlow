'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getRegistrationStatus, 
  getEnrollmentAvailableCourses, 
  getMyEnrollments, 
  registerForCourse, 
  dropCourse 
} from '@/lib/api';
import { 
  BookMarked, Clock, CheckCircle, AlertTriangle, AlertCircle, 
  Trash2, Plus, Loader2, Calendar, BookOpen, Layers, Search 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term, setTerm] = useState('2024F');
  const [windowStatus, setWindowStatus] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // stores course_id or enrollment_id

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      loadEnrollmentData();
    }
  }, [user, authLoading, router, term]);

  const loadEnrollmentData = async () => {
    setLoading(true);
    try {
      const [statusData, myData, availData] = await Promise.all([
        getRegistrationStatus(term),
        getMyEnrollments(term),
        getEnrollmentAvailableCourses(term)
      ]);

      setWindowStatus(statusData);
      setMyEnrollments(myData.enrollments || []);
      setAvailableCourses(availData.courses || []);
    } catch (err) {
      showError(err.message || 'Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (courseId) => {
    setActionLoading(courseId);
    try {
      await registerForCourse(courseId, term);
      showSuccess('Enrolled in course successfully!');
      await loadEnrollmentData();
    } catch (err) {
      showError(err.message || 'Failed to register for course');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDrop = async (enrollmentId) => {
    if (!confirm('Are you sure you want to drop this course? This action is permanent during the registration window.')) return;
    setActionLoading(enrollmentId);
    try {
      await dropCourse(enrollmentId, term);
      showSuccess('Course dropped successfully!');
      await loadEnrollmentData();
    } catch (err) {
      showError(err.message || 'Failed to drop course');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter available courses
  const filteredAvailable = availableCourses.filter(c => {
    const matchesSearch = c.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.course_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || c.category?.toUpperCase() === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryTheme = (category) => {
    switch (category?.toUpperCase()) {
      case 'TH': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'LAB': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const totalRegisteredCredits = myEnrollments.reduce((sum, item) => sum + (item.credit_hours || 0), 0);

  if (authLoading || (loading && availableCourses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading course registration...</p>
        </div>
      </div>
    );
  }

  const isWindowOpen = windowStatus?.status === 'OPEN' && (() => {
    if (!windowStatus?.start_date || !windowStatus?.end_date) return false;
    const now = new Date();
    const start = new Date(windowStatus.start_date);
    const end = new Date(windowStatus.end_date);
    return now >= start && now <= end;
  })();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">SSUET Registrar Office</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Course Registration</h1>
          <p className="text-slate-400 mt-1 font-sans">
            Enroll in core/elective courses and manage your academic load for Term <span className="font-mono text-white font-semibold">{term}</span>.
          </p>
        </div>

        {/* Term Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-white/[0.02] border border-white/5 p-1 rounded-lg">
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

      {/* Registration Status Indicator Window */}
      <Card className={`overflow-hidden border-white/5 backdrop-blur-xl ${
        isWindowOpen 
          ? 'bg-gradient-to-r from-emerald-500/[0.04] to-transparent border-emerald-500/20' 
          : 'bg-gradient-to-r from-rose-500/[0.04] to-transparent border-rose-500/20'
      }`}>
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
              isWindowOpen ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              {isWindowOpen ? <Clock className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg flex items-center gap-2">
                Registration Status: 
                <span className={isWindowOpen ? 'text-emerald-400' : 'text-rose-400'}>
                  {isWindowOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-1 max-w-2xl font-sans">
                {isWindowOpen 
                  ? `Enrollment window is active. Registration closes on ${new Date(windowStatus.end_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}. You have ${windowStatus.days_remaining} day(s) remaining to modify enrollments.`
                  : windowStatus?.status === 'OPEN' && windowStatus?.start_date && new Date(windowStatus.start_date) > new Date()
                    ? `Registration opens on ${new Date(windowStatus.start_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}. Please check back then.`
                    : 'The course registration window is currently closed. You cannot enroll or drop courses. Contact administrator for manual overrides.'
                }
              </p>
            </div>
          </div>
          {isWindowOpen && (
            <Badge className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 select-none animate-pulse shrink-0">
              {windowStatus.days_remaining} Days Remaining
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Registered Course Enrollments */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-violet-400" /> My Enrolled Courses 
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-[10px] ml-1">
              {totalRegisteredCredits} Credits Total
            </Badge>
          </h2>
        </div>

        {myEnrollments.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01]">
            <CardContent className="p-8 text-center text-slate-400">
              <Layers className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-xs">No active course registrations for this term.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myEnrollments.map((course) => (
              <Card key={course.id} className="bg-white/[0.03] border-white/5 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1 bg-violet-600/40" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest uppercase block">{course.course_code}</span>
                      <h3 className="font-bold text-sm text-white font-heading mt-1 leading-snug line-clamp-1">{course.course_name}</h3>
                    </div>
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] font-mono px-1">
                      {course.credit_hours} CH
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-400 border-t border-white/5 pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Instructor</span>
                      <span className="font-medium text-slate-300">{course.teacher_name}</span>
                    </div>

                    {isWindowOpen && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionLoading !== null}
                        onClick={() => handleDrop(course.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 h-8 px-2.5 text-[11px] font-semibold transition-colors"
                      >
                        {actionLoading === course.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><Trash2 className="w-3.5 h-3.5 mr-1" /> Drop</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Available Registration Catalog */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="text-lg font-bold font-heading flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" /> Available Registration Catalog
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code, title..."
                className="h-8 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500 text-xs"
              />
            </div>

            {/* Category Select tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'TH', 'LAB'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-semibold border tracking-wider transition-all shrink-0 ${
                    categoryFilter === cat
                      ? 'bg-violet-600/25 border-violet-500/50 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'ALL CATEGORIES' : cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredAvailable.length === 0 ? (
          <Card className="border-white/5 bg-transparent">
            <CardContent className="p-16 text-center">
              <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-white text-base">No available registration courses found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                There are no unregistered courses matching your criteria or prerequisites.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAvailable.map((course) => {
              const isEnrolled = course.is_enrolled || myEnrollments.some(e => e.course_code === course.course_code);
              const isEligible = course.is_eligible !== false && course.prerequisites_met !== false;
              const seatsLeft = course.seats_available !== undefined ? course.seats_available : (course.max_students - (course.enrolled_count || 0));
              const isFull = seatsLeft <= 0;

              return (
                <Card 
                  key={course.id} 
                  className={`relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/25 transition-all duration-300 flex flex-col justify-between ${
                    isEnrolled ? 'ring-1 ring-violet-500/20' : ''
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    isEnrolled ? 'bg-violet-600/40' : (isEligible ? (isFull ? 'bg-amber-500/40' : 'bg-emerald-500/40') : 'bg-rose-500/40')
                  }`} />

                  <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-xs font-bold text-violet-400 tracking-wider uppercase block">{course.course_code}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className={`${getCategoryTheme(course.category)} text-[8px] uppercase font-mono px-1`}>
                            {course.category || 'TH'}
                          </Badge>
                          <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[8px] font-mono px-1">
                            {course.credit_hours} CH
                          </Badge>
                        </div>
                      </div>
                      <h3 className="font-heading font-bold text-sm text-white mt-1 leading-snug line-clamp-1">{course.course_name}</h3>
                      <p className="text-[10px] text-slate-500 leading-normal font-sans">Instructor: {course.teacher_name || 'TBA'}</p>
                    </div>

                    {/* Prerequisite chips */}
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Prerequisites</span>
                      {course.prerequisites && course.prerequisites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {course.prerequisites.map(p => {
                            const isMissing = course.missing_prerequisites?.includes(p);
                            return (
                              <Badge 
                                key={p} 
                                variant="outline" 
                                className={`text-[8px] font-mono px-1 ${
                                  isMissing ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-white/5 border-white/10 text-slate-400'
                                }`}
                              >
                                {p}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-400">None</span>
                      )}
                    </div>

                    {/* Eligibility notification banner */}
                    <div className={`p-2 rounded-lg border text-[10px] ${
                      isEnrolled 
                        ? 'bg-violet-600/5 border-violet-500/10 text-violet-300' 
                        : (isEligible ? (isFull ? 'bg-amber-500/5 border-amber-500/10 text-amber-300' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300') : 'bg-rose-500/5 border-rose-500/10 text-rose-300')
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isEnrolled ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                            <span>Already Enrolled</span>
                          </>
                        ) : isEligible ? (
                          isFull ? (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                              <span>Course section is full.</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <span>Eligible ({seatsLeft} seats left)</span>
                            </>
                          )
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                            <span>Missing: {course.missing_prerequisites?.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Register button */}
                    {!isEnrolled && isWindowOpen && (
                      <Button
                        disabled={!isEligible || isFull || actionLoading !== null}
                        onClick={() => handleRegister(course.id)}
                        className={`w-full h-8 text-xs font-semibold shrink-0 mt-2 ${
                          isEligible && !isFull
                            ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/10'
                            : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {actionLoading === course.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><Plus className="w-3.5 h-3.5 mr-1" /> Register Course</>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
