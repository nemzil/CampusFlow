'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableCourses, getCourses } from '@/lib/api';
import { 
  BookOpen, Search, Info, AlertCircle, 
  CheckCircle, Users, Loader2 
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

  // Emil Kowalski snappy easing
  const customEase = [0.23, 1, 0.32, 1];

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
      let data = [];
      try {
        const res = await getAvailableCourses();
        data = res.courses || res || [];
      } catch (err) {
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
      case 'TH': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'LAB': return 'bg-sky-50 text-sky-600 border-sky-100/50';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'core': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'elective': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const handleOpenDetail = (course) => {
    setSelectedCourse(course);
    setShowDetailModal(true);
  };

  const filteredCourses = courses.filter(c => {
    const matchesType = typeFilter === 'ALL' || c.course_type?.toUpperCase() === typeFilter;
    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    const matchesSearch = c.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.course_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesCategory && matchesSearch;
  });

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-medium font-sans">Loading available courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-white text-slate-800 min-h-screen font-sans">
      {/* Header */}
      <div>
        <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200 mb-2">
          Academic Year {new Date().getFullYear()}
        </Badge>
        <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Course Catalog</h1>
        <p className="text-slate-500 mt-1 font-sans">
          Browse and verify core and elective course eligibility for your current semester (Semester {user?.current_semester || 4}).
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Type Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Course Type</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
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
              <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Code or course title..." 
                className="h-9 pl-9 bg-white border-slate-200 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Table Format */}
      {filteredCourses.length === 0 ? (
        <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2 font-heading">No courses found</h3>
            <p className="text-slate-500 max-w-sm">No courses matching the filters are scheduled for your current semester.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Code</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Title</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Type</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Category</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Credit Hours</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Instructor</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Seats</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredCourses.map((course) => {
                      const isEligible = course.is_eligible !== undefined ? course.is_eligible : (course.prerequisites_met !== undefined ? course.prerequisites_met : true);
                      const seatsLeft = course.seats_available !== undefined ? course.seats_available : (course.max_students - (course.enrolled_count || 0));
                      const isFull = seatsLeft <= 0;

                      return (
                        <tr key={course.course_code} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs font-bold font-mono text-slate-700">{course.course_code}</td>
                          <td className="p-4 text-xs font-bold text-slate-800">{course.course_name}</td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={`${getTypeBadgeColor(course.course_type)} uppercase text-[8.5px] px-2 py-0.5 rounded-full font-bold`}>
                              {course.course_type || 'core'}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className={`${getCategoryBadgeColor(course.category)} uppercase text-[8.5px] px-2 py-0.5 rounded-full font-bold`}>
                              {course.category}
                            </Badge>
                          </td>
                          <td className="p-4 text-xs font-bold font-mono text-slate-700 text-center">{course.credit_hours} CH</td>
                          <td className="p-4 text-xs font-medium text-slate-650">{course.teacher_name || 'TBA'}</td>
                          <td className="p-4 text-xs font-bold font-mono text-center">
                            <span className={isFull ? 'text-red-500' : 'text-sky-600'}>
                              {seatsLeft > 0 ? `${seatsLeft} Left` : 'Full'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {isEligible ? (
                              isFull ? (
                                <Badge className="bg-amber-50 border-amber-250 text-amber-600 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Section Full
                                </Badge>
                              ) : (
                                <Badge className="bg-sky-50 border-sky-100 text-sky-650 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Eligible
                                </Badge>
                              )
                            ) : (
                              <Badge className="bg-red-50 border-red-100 text-red-650 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                Blocked
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <Button 
                              onClick={() => handleOpenDetail(course)} 
                              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 h-7 text-[11px] px-2.5 font-bold rounded-lg cursor-pointer"
                            >
                              <Info className="w-3 h-3 mr-1" /> Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
      <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="h-1 w-full bg-sky-500 shrink-0" />
        
        <DialogHeader className="p-5 pb-3 border-b border-slate-100 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold text-sky-600 tracking-wider uppercase block">{course.course_code}</span>
              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-500 text-[9px] px-1.5 uppercase rounded-full font-bold">{course.course_type}</Badge>
              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-500 text-[9px] px-1.5 uppercase rounded-full font-bold">{course.category}</Badge>
            </div>
            <DialogTitle className="text-lg font-bold font-heading leading-tight text-slate-900">{course.course_name}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Course curriculum details and registration eligibility check.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-sm">
          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Semester</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block">{course.semester || '4'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Credit Hours</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block font-mono">{course.credit_hours} CH</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Term</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 block font-mono">{course.term}</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Description</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              {course.description || "No catalog description available for this syllabus variant. Contact department admin for syllabus objectives."}
            </p>
          </div>

          {/* Teacher and Seats Info */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Instructor</span>
              <p className="text-xs text-slate-800 font-medium">{course.teacher_name || 'TBD (To Be Decided)'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Seat Vacancy</span>
              <p className="text-xs text-slate-800 font-medium">{seatsLeft} seats left ({course.enrolled_count || 0}/{course.max_students || 60} enrolled)</p>
            </div>
          </div>

          {/* Prerequisites */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Prerequisite Requirements</span>
            {course.prerequisites && course.prerequisites.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {course.prerequisites.map(pre => {
                    const isMissing = missing.includes(pre);
                    return (
                      <Badge 
                        key={pre} 
                        variant="outline" 
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                          isMissing 
                            ? 'bg-red-50 border-red-200 text-red-600' 
                            : 'bg-slate-50 border-slate-200 text-slate-500'
                        }`}
                      >
                        {pre} {isMissing && '(Not Passed)'}
                      </Badge>
                    );
                  })}
                </div>
                {!isEligible && (
                  <p className="text-[11px] text-red-600 font-bold mt-1 leading-normal flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                    You cannot enroll in this course because you have not completed the highlighted prerequisite requirements.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-medium">None. This course has no prerequisite requirements.</p>
            )}
          </div>
        </div>

        <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <Button onClick={onClose} size="sm" className="bg-sky-500 hover:bg-sky-600 text-white h-8 text-xs px-4 font-bold rounded-xl cursor-pointer">
            Close Catalog View
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
