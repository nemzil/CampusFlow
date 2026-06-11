'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCourses, 
  createCourse, 
  updateCourse, 
  deleteCourse, 
  assignTeacher,
  unassignTeacher,
  listUsers
} from '@/lib/api';
import { 
  BookOpen, Plus, Search, Edit2, Trash2, UserCheck, 
  Layers, Calendar, Users, Loader2, X, Check, PowerOff, Power, HelpCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
<<<<<<< HEAD
import { canViewCourseManagement, canEditCourseManagement } from '@/lib/adminAccess';
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e

export default function AdminCoursesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [allCourseCodes, setAllCourseCodes] = useState([]); // For prerequisite selection
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [semesterFilter, setSemesterFilter] = useState('ALL');
  const [termFilter, setTermFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // Null for create, object for edit
  const [selectedCourseForTeacher, setSelectedCourseForTeacher] = useState(null);

  useEffect(() => {
<<<<<<< HEAD
    if (!authLoading && (!user || !canViewCourseManagement(user))) {
=======
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      router.push('/login');
    } else if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading, router, semesterFilter, termFilter, typeFilter, categoryFilter]);

<<<<<<< HEAD
  const canEdit = canEditCourseManagement(user);

=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
  const fetchData = async () => {
    setLoading(true);
    try {
      // Build filters object
      const filters = {};
      if (semesterFilter !== 'ALL') filters.semester = parseInt(semesterFilter);
      if (termFilter !== 'ALL') filters.term = termFilter;
      if (typeFilter !== 'ALL') filters.type = typeFilter.toLowerCase();
      if (categoryFilter !== 'ALL') filters.category = categoryFilter;

      const coursesData = await getCourses(filters);
      setCourses(coursesData.courses || coursesData || []);
      
      // Fetch all courses without filter to populate prerequisites list
      const rawAllCourses = await getCourses({});
      const listAll = rawAllCourses.courses || rawAllCourses || [];
      setAllCourseCodes(listAll.map(c => c.course_code));

      // Fetch teachers for assign dropdown
      const teachersData = await listUsers('TEACHER');
      setTeachers(teachersData || []);
    } catch (error) {
      showError(error.message || 'Failed to fetch course data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseCode, enrolledCount) => {
    if (enrolledCount > 0) {
      showError('Cannot delete a course with enrolled students.');
      return;
    }
    if (!confirm(`Are you sure you want to delete course "${courseCode}"?`)) return;
    
    try {
      await deleteCourse(courseCode);
      showSuccess('Course deleted successfully');
      fetchData();
    } catch (error) {
      showError(error.message || 'Failed to delete course');
    }
  };

  const handleToggleStatus = async (course) => {
    try {
      const updatedStatus = !course.is_active;
      await updateCourse(course.course_code, { is_active: updatedStatus });
      showSuccess(`Course ${updatedStatus ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      showError(error.message || 'Failed to update course status');
    }
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setShowCourseModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const openAssignModal = (course) => {
    setSelectedCourseForTeacher(course);
    setShowAssignModal(true);
  };

  // Local Search Filtering
  const filteredCourses = courses.filter(c => 
    c.course_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.course_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'TH': return 'badge-green bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'LAB': return 'badge-orange bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'core': return 'badge-blue bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'elective': return 'badge-purple bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (authLoading || (loading && courses.length === 0)) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[#060813]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading courses catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-transparent text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
<<<<<<< HEAD
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">
            {canEdit ? 'Academics' : 'View Only'}
          </Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Course Management</h1>
          <p className="text-slate-400 mt-1 font-sans">
            {canEdit
              ? 'Create and manage course configurations, prerequisite trees, and faculty assignments.'
              : 'View course catalog and faculty assignments (read-only).'}
          </p>
        </div>
        
        {canEdit && (
        <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] shrink-0 self-start sm:self-center">
          <Plus className="w-4 h-4 mr-2" /> Add Course
        </Button>
        )}
=======
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Academics</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">Course Management</h1>
          <p className="text-slate-400 mt-1 font-sans">Create and manage course configurations, prerequisite trees, and faculty assignments.</p>
        </div>
        
        <Button onClick={openCreateModal} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] shrink-0 self-start sm:self-center">
          <Plus className="w-4 h-4 mr-2" /> Add Course
        </Button>
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
      </div>

      {/* Filters & Search Control */}
      <Card className="border-white/5 bg-black/20 backdrop-blur-xl">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
          {/* Semester Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Semester</span>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Semesters</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Type</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="CORE">Core</SelectItem>
                <SelectItem value="ELECTIVE">Elective</SelectItem>
<<<<<<< HEAD
                <SelectItem value="COMPULSORY">Compulsory</SelectItem>
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
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

          {/* Term Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Term</span>
            <Select value={termFilter} onValueChange={setTermFilter}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-300">
                <SelectValue placeholder="Select Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Terms</SelectItem>
<<<<<<< HEAD
                <SelectItem value="Fall">Fall</SelectItem>
                <SelectItem value="Spring">Spring</SelectItem>
=======
                <SelectItem value="2024F">Fall 2024 (2024F)</SelectItem>
                <SelectItem value="2025S">Spring 2025 (2025S)</SelectItem>
                <SelectItem value="2025F">Fall 2025 (2025F)</SelectItem>
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
              </SelectContent>
            </Select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block ml-1">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Code, title, dept..." 
                className="h-9 pl-9 bg-background/50 border-white/10 text-white placeholder-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Catalog Grid */}
      {filteredCourses.length === 0 ? (
        <Card className="border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No courses registered</h3>
            <p className="text-slate-400 max-w-sm">No courses matching your search or filters were found in the catalog database.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => {
              const teacherName = course.teacher_name || (teachers.find(t => t.username === course.teacher_id) 
                ? `${teachers.find(t => t.username === course.teacher_id).first_name} ${teachers.find(t => t.username === course.teacher_id).last_name}`
                : null);

              return (
                <motion.div
                  key={course.course_code}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.2 }}
                  layout
                >
                  <Card className={`relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-violet-500/25 transition-all duration-300 flex flex-col h-full ${!course.is_active ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                    {/* Status Top Strip */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${course.is_active ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} />

                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      {/* Course Identity */}
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
                        <h3 className="font-heading font-bold text-base text-white leading-snug line-clamp-1 hover:line-clamp-none transition-all">{course.course_name}</h3>
                        <p className="text-xs text-slate-500 font-sans">{course.department || 'Software Engineering'}</p>
                      </div>

                      {/* Course Stats / Details */}
                      <div className="grid grid-cols-3 gap-2.5 py-3 border-y border-white/5 text-center shrink-0">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Semester</span>
                          <span className="text-sm font-semibold text-white">{course.semester}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Credits</span>
                          <span className="text-sm font-semibold text-white">{course.credit_hours} CH</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Enrolled</span>
                          <span className="text-sm font-semibold text-white">{course.enrolled_count || 0}/{course.max_students || 60}</span>
                        </div>
                      </div>

                      {/* Teacher assigned */}
                      <div className="flex items-center gap-2.5 text-xs">
                        <Users className="w-4 h-4 text-slate-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-500 block text-[9px] font-bold uppercase tracking-wider">Instructor</span>
                          <span className={`font-medium block truncate ${teacherName ? 'text-slate-300' : 'text-amber-500 font-sans'}`}>
                            {teacherName || 'Not Assigned'}
                          </span>
                        </div>
                      </div>

                      {/* Prerequisites tags */}
                      {course.prerequisites && course.prerequisites.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Prerequisites</span>
                          <div className="flex flex-wrap gap-1">
                            {course.prerequisites.map(pre => (
                              <Badge key={pre} variant="outline" className="bg-white/5 border-white/10 text-slate-300 text-[9px] px-1 font-mono">{pre}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {course.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 italic">{course.description}</p>
                      )}

                      {/* Action buttons */}
<<<<<<< HEAD
                      {canEdit && (
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                      <div className="flex gap-2 pt-3 border-t border-white/5 mt-auto shrink-0">
                        <Button variant="secondary" size="sm" onClick={() => openEditModal(course)} className="flex-1 bg-white/5 hover:bg-white/10 text-white h-8 text-xs">
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => openAssignModal(course)}
                          className="flex-1 bg-white/5 hover:bg-white/10 text-white h-8 text-xs"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Instructor
                        </Button>
                        
                        {/* Toggle active / inactive */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(course)}
                          className={`h-8 px-2.5 text-white ${course.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'}`}
                          title={course.is_active ? 'Deactivate Course' : 'Activate Course'}
                        >
                          {course.is_active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        </Button>

                        {/* Trash trigger */}
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => handleDelete(course.course_code, course.enrolled_count)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 h-8"
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
<<<<<<< HEAD
                      )}
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Course Create/Edit Modal */}
      {showCourseModal && (
        <CourseModal
          course={editingCourse}
          allCourseCodes={allCourseCodes}
          onClose={() => setShowCourseModal(false)}
          onSuccess={() => {
            setShowCourseModal(false);
            fetchData();
          }}
        />
      )}

      {/* Assign Instructor Modal */}
      {showAssignModal && selectedCourseForTeacher && (
        <AssignInstructorModal
          course={selectedCourseForTeacher}
          teachers={teachers}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

// --------------------------------- COURSE CONFIG MODAL ---------------------------------
function CourseModal({ course, allCourseCodes, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    course_code: course ? course.course_code : '',
    course_name: course ? course.course_name : '',
    course_type: course ? (course.course_type || 'core') : 'core',
    category: course ? course.category : 'TH',
    semester: course ? course.semester : 1,
    credit_hours: course ? course.credit_hours : 3,
<<<<<<< HEAD
    term: course ? course.term : 'Fall',
=======
    term: course ? course.term : '2024F',
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
    department: course ? (course.department || 'Software Engineering') : 'Software Engineering',
    max_students: course ? (course.max_students || 60) : 60,
    description: course ? (course.description || '') : '',
    prerequisites: course ? (course.prerequisites || []) : [],
  });

  // Track the available course codes to select as prerequisites (exclude the current course code to prevent self-prerequisite)
  const availablePrereqs = allCourseCodes.filter(code => code !== formData.course_code);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validations
      if (!formData.course_code || !formData.course_name) {
        throw new Error('Course code and course name are required');
      }

      // Check course code formatting
      const codeRegex = /^[A-Z]{2,4}-\d{3}[T|L]?$/;
      if (!codeRegex.test(formData.course_code)) {
        throw new Error('Course code must follow the standard format, e.g., SE-102T, SE-103L, HS-104');
      }

      // Credit hours sanity check
      if (formData.category === 'LAB' && formData.credit_hours !== 1) {
        throw new Error('Laboratory courses must have exactly 1 credit hour');
      }
      if (formData.credit_hours < 1 || formData.credit_hours > 3) {
        throw new Error('Credit hours must be between 1 and 3');
      }

      const payload = {
        ...formData,
        semester: parseInt(formData.semester),
        credit_hours: parseInt(formData.credit_hours),
        max_students: parseInt(formData.max_students),
      };

      if (course) {
        // Update operation (code is read-only)
        const updates = { ...payload };
        delete updates.course_code; // Do not send code
        await updateCourse(course.course_code, updates);
        showSuccess('Course updated successfully!');
      } else {
        // Create operation
        await createCourse(payload);
        showSuccess('Course created successfully!');
      }
      onSuccess();
    } catch (error) {
      showError(error.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePrereq = (code) => {
    setFormData(prev => {
      const alreadySelected = prev.prerequisites.includes(code);
      const updated = alreadySelected
        ? prev.prerequisites.filter(c => c !== code)
        : [...prev.prerequisites, code];
      return { ...prev, prerequisites: updated };
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl flex flex-col max-h-[90vh]">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
        <DialogHeader className="p-4 pb-3 border-b border-white/5 shrink-0">
          <DialogTitle className="text-lg font-bold font-heading">
            {course ? `Edit Course: ${course.course_code}` : 'Create New Course'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Configure course metrics, types, credit hours, and prerequisite dependencies.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-5">
          <form id="course-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Code */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course Code *</label>
                <Input
                  name="course_code"
                  value={formData.course_code}
                  onChange={handleChange}
                  disabled={!!course}
                  required
                  placeholder="e.g. SE-102T"
                  className="h-9 text-xs bg-background/50 border-white/10 text-white disabled:opacity-50"
                />
              </div>

              {/* Course Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course Name *</label>
                <Input
                  name="course_name"
                  value={formData.course_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Programming Fundamentals"
                  className="h-9 text-xs bg-background/50 border-white/10 text-white"
                />
              </div>

              {/* Course Type (Core / Elective) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Course Type *</label>
                <Select
                  value={formData.course_type}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, course_type: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="elective">Elective</SelectItem>
<<<<<<< HEAD
                    <SelectItem value="compulsory">Compulsory</SelectItem>
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                  </SelectContent>
                </Select>
              </div>

              {/* Category (TH / LAB) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category *</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData(prev => ({ 
                    ...prev, 
                    category: val,
                    credit_hours: val === 'LAB' ? 1 : prev.credit_hours 
                  }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TH">Theory (TH)</SelectItem>
                    <SelectItem value="LAB">Laboratory (LAB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Semester */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Semester *</label>
                <Select
                  value={formData.semester.toString()}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, semester: parseInt(val) }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Credit Hours */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit Hours *</label>
                <Select
                  value={formData.credit_hours.toString()}
                  disabled={formData.category === 'LAB'}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, credit_hours: parseInt(val) }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200 disabled:opacity-75">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Credit Hour</SelectItem>
                    <SelectItem value="2">2 Credit Hours</SelectItem>
                    <SelectItem value="3">3 Credit Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Term */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Academic Term *</label>
                <Select
                  value={formData.term}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, term: val }))}
                >
                  <SelectTrigger className="h-9 text-xs bg-background/50 border-white/10 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
<<<<<<< HEAD
                    <SelectItem value="Fall">Fall</SelectItem>
                    <SelectItem value="Spring">Spring</SelectItem>
=======
                    <SelectItem value="2024F">Fall 2024 (2024F)</SelectItem>
                    <SelectItem value="2025S">Spring 2025 (2025S)</SelectItem>
                    <SelectItem value="2025F">Fall 2025 (2025F)</SelectItem>
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
                  </SelectContent>
                </Select>
              </div>

              {/* Max Student Capacity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Students Limit *</label>
                <Input
                  type="number"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleChange}
                  required
                  min="1"
                  className="h-9 text-xs bg-background/50 border-white/10 text-white"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Department Name</label>
                <Input
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g. Computer Science"
                  className="h-9 text-xs bg-background/50 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Prerequisites tree */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Select Prerequisites</label>
              <div className="p-3 bg-black/30 border border-white/5 rounded-lg max-h-44 overflow-y-auto">
                {availablePrereqs.length === 0 ? (
                  <p className="text-xs text-slate-500">No other courses exist in system catalog to select as dependencies.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availablePrereqs.map(code => {
                      const isSelected = formData.prerequisites.includes(code);
                      return (
                        <div 
                          key={code} 
                          onClick={() => togglePrereq(code)}
                          className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? 'bg-violet-600/20 border-violet-500/50 text-white' 
                              : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10'
                          }`}
                        >
                          <span className="text-xs font-mono">{code}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Brief course objectives and syllabus notes..."
                className="w-full p-2.5 text-xs bg-background/50 border border-white/10 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </form>
        </ScrollArea>

        <div className="p-3.5 border-t border-white/5 bg-black/25 flex justify-end gap-2 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-8 text-xs">
            Cancel
          </Button>
          <Button type="submit" form="course-form" size="sm" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-8 text-xs">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving...</> : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------- ASSIGN INSTRUCTOR MODAL ---------------------------------
function AssignInstructorModal({ course, teachers, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(course.teacher_id || 'unassigned');

  const handleAssign = async () => {
    setLoading(true);
    try {
      if (selectedTeacher === 'unassigned') {
        // Remove currently assigned teacher
        if (course.teacher_id) {
          await unassignTeacher(course.course_code);
          showSuccess('Teacher assignment removed successfully.');
        } else {
          showSuccess('No teacher was assigned.');
        }
      } else {
        await assignTeacher(course.course_code, selectedTeacher);
        showSuccess('Faculty member assigned as Course Instructor.');
      }
      onSuccess();
    } catch (error) {
      showError(error.message || 'Failed to update teacher assignment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#090b14]/95 border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl">
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base font-bold font-heading">Assign Course Instructor</DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Select a faculty member for <span className="font-mono text-violet-400 font-semibold">{course.course_code}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Instructor</label>
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="h-9 bg-background/50 border-white/10 text-slate-200">
                <SelectValue placeholder="Choose Instructor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">-- Unassigned (None) --</SelectItem>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.username} value={teacher.username}>
                    {teacher.first_name} {teacher.last_name} (@{teacher.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={handleAssign} size="sm" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-8 text-xs">
              {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Updating...</> : 'Update Assignment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
