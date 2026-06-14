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
  Trash2, Plus, Loader2, BookOpen, Layers, Search 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function StudentEnrollmentPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [term] = useState('ALL');
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
  }, [user, authLoading, router]);

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
      case 'TH': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'LAB': return 'bg-sky-50 text-sky-700 border-sky-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const totalRegisteredCredits = myEnrollments.reduce((sum, item) => sum + (item.credit_hours || 0), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-medium font-sans">Loading course registration...</p>
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Course Registration</h1>
          <p className="text-slate-500 mt-1 font-sans">
            Enroll in courses for Semester <span className="font-semibold text-slate-800">{user?.current_semester || '4'}</span>.
          </p>
        </div>
      </div>

      {/* Registration Status Indicator Window */}
      <Card className={`overflow-hidden border-slate-200 shadow-sm rounded-2xl ${
        isWindowOpen 
          ? 'bg-sky-50/10 border-sky-200' 
          : 'bg-red-50/20 border-red-200'
      }`}>
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isWindowOpen ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-red-600'
            }`}>
              {isWindowOpen ? <Clock className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-heading font-bold text-slate-900 text-base flex items-center gap-2">
                Registration Window: 
                <span className={isWindowOpen ? 'text-sky-600' : 'text-red-600'}>
                  {isWindowOpen ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </h3>
              <p className="text-slate-500 text-xs mt-1 max-w-3xl font-sans">
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
            <Badge className="bg-sky-50 border-sky-100 text-sky-600 text-xs font-semibold px-2.5 py-1 select-none shrink-0" variant="outline">
              {windowStatus.days_remaining} Days Remaining
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Registered Course Enrollments in Table Format */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold font-heading flex items-center gap-2 text-slate-900">
          <BookMarked className="w-5 h-5 text-sky-500" /> My Enrolled Courses 
          <Badge className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] ml-1">
            {totalRegisteredCredits} Credits Total
          </Badge>
        </h2>

        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Code</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Title</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Credit Hours</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Category</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Instructor</th>
                    {isWindowOpen && <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myEnrollments.length > 0 ? (
                    myEnrollments.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-xs font-bold font-mono text-slate-700">{course.course_code}</td>
                        <td className="p-4 text-xs font-bold text-slate-800">{course.course_name}</td>
                        <td className="p-4 text-xs font-bold font-mono text-slate-700 text-center">{course.credit_hours} CH</td>
                        <td className="p-4 text-center">
                          <Badge variant="outline" className={`${getCategoryTheme(course.category)} text-[8.5px] uppercase font-mono px-2 py-0.5`}>
                            {course.category || 'TH'}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-600">{course.teacher_name}</td>
                        {isWindowOpen && (
                          <td className="p-4 text-center">
                            <Button
                              variant="ghost"
                              disabled={actionLoading !== null}
                              onClick={() => handleDrop(course.id)}
                              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 h-8 px-3 text-[11px] font-semibold transition-colors mx-auto cursor-pointer"
                            >
                              {actionLoading === course.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <><Trash2 className="w-3.5 h-3.5 mr-1" /> Drop</>
                              )}
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isWindowOpen ? 6 : 5} className="p-8 text-center text-xs text-slate-400 font-sans">
                        No active course registrations for this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Registration Catalog — Table Format */}
      {isWindowOpen && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-lg font-bold font-heading flex items-center gap-2 text-slate-900">
              <BookOpen className="w-5 h-5 text-sky-500" /> Available Registration Catalog
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
              {/* Search Input */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course code, title..."
                  className="h-8 pl-9 bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 text-xs"
                />
              </div>

              {/* Category Select tabs */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                {['ALL', 'TH', 'LAB'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-[10px] font-semibold border tracking-wider transition-all shrink-0 cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-sky-100 border-sky-200 text-sky-700 shadow-sm'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {cat === 'ALL' ? 'ALL CATEGORIES' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Code</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Title</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Credit Hours</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Category</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Instructor</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Prerequisites</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAvailable.length > 0 ? (
                      filteredAvailable.map((course) => {
                        const isEnrolled = course.is_enrolled || myEnrollments.some(e => e.course_code === course.course_code);
                        const isEligible = course.is_eligible !== false && course.prerequisites_met !== false;
                        const seatsLeft = course.seats_available !== undefined ? course.seats_available : (course.max_students - (course.enrolled_count || 0));
                        const isFull = seatsLeft <= 0;

                        return (
                          <tr key={course.id} className={`hover:bg-slate-50/50 transition-colors ${isEnrolled ? 'bg-sky-50/10' : ''}`}>
                            <td className="p-4 text-xs font-bold font-mono text-slate-700">{course.course_code}</td>
                            <td className="p-4 text-xs font-bold text-slate-800">{course.course_name}</td>
                            <td className="p-4 text-xs font-bold font-mono text-slate-700 text-center">{course.credit_hours} CH</td>
                            <td className="p-4 text-center">
                              <Badge variant="outline" className={`${getCategoryTheme(course.category)} text-[8.5px] uppercase font-mono px-2 py-0.5`}>
                                {course.category || 'TH'}
                              </Badge>
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-600">{course.teacher_name || 'TBA'}</td>
                            <td className="p-4">
                              {course.prerequisites && course.prerequisites.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {course.prerequisites.map(p => {
                                    const isMissing = course.missing_prerequisites?.includes(p);
                                    return (
                                      <Badge 
                                        key={p} 
                                        variant="outline" 
                                        className={`text-[8.5px] font-mono px-1.5 py-0.5 ${
                                          isMissing ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}
                                      >
                                        {p}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[11px] font-bold text-sky-650">None</span>
                              )}
                            </td>
                            <td className="p-4 text-xs">
                              {isEnrolled ? (
                                <Badge className="bg-sky-50 text-sky-600 border-sky-100 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Enrolled
                                </Badge>
                              ) : isEligible ? (
                                isFull ? (
                                  <Badge className="bg-red-50 text-red-600 border-red-100 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                    Section Full
                                  </Badge>
                                ) : (
                                  <Badge className="bg-sky-50 text-sky-600 border-sky-100 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                    Eligible ({seatsLeft} seats)
                                  </Badge>
                                )
                              ) : (
                                <Badge className="bg-red-50 text-red-600 border-red-150 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Blocked
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {!isEnrolled ? (
                                <Button
                                  disabled={!isEligible || isFull || actionLoading !== null}
                                  onClick={() => handleRegister(course.id)}
                                  className={`h-8 text-[11px] font-bold shrink-0 cursor-pointer ${
                                    isEligible && !isFull
                                      ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-sm'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                  }`}
                                >
                                  {actionLoading === course.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <><Plus className="w-3.5 h-3.5 mr-1" /> Register</>
                                  )}
                                </Button>
                              ) : (
                                <span className="text-xs text-sky-500 font-bold font-sans">Enrolled</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-slate-400 font-sans">
                          No available courses match the filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
