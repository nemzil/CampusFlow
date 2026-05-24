'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableCourses, getCourses } from '@/lib/api';
import { 
  BookOpen, Search, Info, HelpCircle, AlertCircle, 
  CheckCircle, Users, Layers, GraduationCap, Loader2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function StudentCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError } = useToast();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected course for detail modal
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    } else if (!authLoading && user) {
      fetchCourses();
    }
  }, [user, authLoading, router]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      // First try to fetch from student-specific available endpoint
      let data = [];
      try {
        const res = await getAvailableCourses();
        data = res.courses || res || [];
      } catch (err) {
        // Fallback to general list filtering by student's current semester
        console.warn('Fallback to general list due to:', err);
        const filters = { semester: user.current_semester };
        const res = await getCourses(filters);
        data = res.courses || res || [];
      }
      setCourses(data);
    } catch (error) {
      showError(error.message || 'Failed to fetch available courses');
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

  const handleOpenDetail = (course) => {
    setSelectedCourse(course);
    setShowDetailModal(true);
  };

  // Local filtering based on semester, type, category and search query
  const filteredCourses = courses.filter(c => {
    // Current semester filtering is handled by backend or fallback, 
    // but we allow searching and filtering by category/type.
    const matchesType = typeFilter === 'ALL' || c.course_type?.toUpperCase() === typeFilter;
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchesSearch = c.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.course_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesCategory && matchesSearch;
  });

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading available courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-transparent text-white min-h-screen">
      {/* Header */}
      <div>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">
          Academic Year {new Date().getFullYear()}
        </Badge>
        <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Course Catalog</h1>
        <p className="text-slate-400 mt-1 font-sans">
          Browse and verify core and elective course eligibility for your current semester (Semester {user?.current_semester || 1}).
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-white/5 bg-black/20 backdrop-blur-xl">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Type Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Course Type</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CORE">Core</SelectItem>
                <SelectItem value="ELECTIVE">Elective</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Category</span>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="TH">Theory (TH)</SelectItem>
                <SelectItem value="LAB">Laboratory (LAB)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Search Course</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Code or course title..." 
                className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Cards Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
            <p className="text-slate-400 max-w-sm">No courses matching the filters are scheduled for your current semester.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => {
              // Eligibility determination
              // If backend provides is_eligible, use it. Otherwise, assume eligible or perform basic check
              const isEligible = course.is_eligible !== undefined ? course.is_eligible : (course.prerequisites_met !== undefined ? course.prerequisites_met : true);
              const seatsLeft = course.seats_available !== undefined ? course.seats_available : (course.max_students - (course.enrolled_count || 0));
              const isFull = seatsLeft <= 0;

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
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                      isEligible ? (isFull ? 'bg-amber-500/40' : 'bg-emerald-500/40') : 'bg-rose-500/40'
                    }`} />

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
                      <div className="grid grid-cols-2 gap-2.5 py-3 border-y border-white/5 text-center shrink-0">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Credit Hours</span>
                          <span className="text-sm font-semibold text-white">{course.credit_hours} CH</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Available Seats</span>
                          <span className={`text-sm font-semibold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {seatsLeft > 0 ? `${seatsLeft} Left` : 'Full'}
                          </span>
                        </div>
                      </div>

                      {/* Teacher assigned */}
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Users className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Instructor</span>
                          <span className="font-medium block truncate">{course.teacher_name || 'TBD (To Be Decided)'}</span>
                        </div>
                      </div>

                      {/* Eligibility Banner */}
                      <div className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                        isEligible 
                          ? (isFull ? 'bg-amber-500/5 border-amber-500/10 text-amber-300' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300')
                          : 'bg-rose-500/5 border-rose-500/10 text-rose-300'
                      }`}>
                        {isEligible ? (
                          isFull ? (
                            <>
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                              <span className="text-[10px] leading-normal font-sans">Eligible, but all seat vacancies are filled.</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                              <span className="text-[10px] leading-normal font-sans">You are eligible to register for this course.</span>
                            </>
                          )
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                            <span className="text-[10px] leading-normal font-sans">Prerequisites not met. View details for requirements.</span>
                          </>
                        )}
                      </div>

                      {/* View details button */}
                      <Button 
                        onClick={() => handleOpenDetail(course)} 
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 h-8 text-xs shrink-0"
                      >
                        <Info className="w-3.5 h-3.5 mr-1.5" /> View Full Details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Course Detail Modal */}
      {showDetailModal && selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

// --------------------------------- COURSE DETAIL MODAL ---------------------------------
function CourseDetailModal({ course, onClose }) {
  const isEligible = course.is_eligible !== undefined ? course.is_eligible : (course.prerequisites_met !== undefined ? course.prerequisites_met : true);
  const missing = course.missing_prerequisites || [];
  const seatsLeft = course.seats_available !== undefined ? course.seats_available : (course.max_students - (course.enrolled_count || 0));

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
        
        <DialogHeader className="p-5 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-semibold text-violet-400 uppercase tracking-widest">{course.course_code}</span>
            <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 uppercase">{course.course_type}</Badge>
            <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1.5 uppercase">{course.category}</Badge>
          </div>
          <DialogTitle className="text-lg font-bold font-heading leading-tight">{course.course_name}</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Course curriculum details and registration eligibility check.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg text-center">
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Semester</span>
              <span className="text-sm font-semibold text-white mt-0.5 block">{course.semester}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Credit Hours</span>
              <span className="text-sm font-semibold text-white mt-0.5 block">{course.credit_hours} CH</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">Term</span>
              <span className="text-sm font-semibold text-white mt-0.5 block font-mono">{course.term}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Description</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {course.description || "No catalog description available for this syllabus variant. Contact department admin for syllabus objectives."}
            </p>
          </div>

          {/* Teacher and Seats Info */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Instructor</span>
              <p className="text-xs text-slate-300 font-medium">{course.teacher_name || 'TBD (To Be Decided)'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Seat Vacancy</span>
              <p className="text-xs text-slate-300 font-medium">{seatsLeft} seats left ({course.enrolled_count || 0}/{course.max_students || 60} enrolled)</p>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Prerequisite Requirements</span>
            {course.prerequisites && course.prerequisites.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {course.prerequisites.map(pre => {
                    const isMissing = missing.includes(pre);
                    return (
                      <Badge 
                        key={pre} 
                        variant="outline" 
                        className={`text-[10px] font-mono px-1.5 py-0.5 ${
                          isMissing 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        {pre} {isMissing && '(Not Passed)'}
                      </Badge>
                    );
                  })}
                </div>
                {!isEligible && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1">
                    * You cannot enroll in this course because you have not completed the highlighted prerequisite requirements.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-medium">None. This course has no prerequisite requirements.</p>
            )}
          </div>
        </div>

        <div className="p-3.5 border-t border-white/5 bg-black/25 flex justify-end shrink-0">
          <Button onClick={onClose} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white h-8 text-xs px-4">
            Close Catalog View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
