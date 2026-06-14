'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { 
  getMyAttendanceSummary, 
  getMyFeeVoucher, 
  getMyCgpa, 
  getTodos, 
  getAnnouncements 
} from '@/lib/api';
import { 
  GraduationCap, 
  Building, 
  BookOpen, 
  Calendar, 
  DollarSign, 
  ArrowRight, 
  Loader2, 
  Activity, 
  Award,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Megaphone,
  CheckSquare,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [attendanceData, setAttendanceData] = useState(null);
  const [semesterFees, setSemesterFees] = useState(null);
  const [cgpaData, setCgpaData] = useState(null);
  const [pendingTodos, setPendingTodos] = useState([]);
  const [latestAnnouncement, setLatestAnnouncement] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  // Emil Kowalski inspired snappy easing
  const customEase = [0.23, 1, 0.32, 1];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/student/login');
    } else if (!loading && user && user.role !== 'STUDENT') {
      router.push('/student/login');
    } else if (!loading && user) {
      Promise.all([
        getMyAttendanceSummary('ALL').catch(() => null),
        getMyFeeVoucher().catch(() => null),
        getMyCgpa().catch(() => null),
        getTodos({ completed: false }).catch(() => []),
        getAnnouncements({ limit: 3 }).catch(() => null)
      ]).then(([att, fee, cgpaObj, todoList, annObj]) => {
        setAttendanceData(att);
        setSemesterFees(fee);
        setCgpaData(cgpaObj);
        
        // Filter out completed client-side just in case
        const todos = Array.isArray(todoList) ? todoList.filter(t => !t.completed) : [];
        setPendingTodos(todos);

        const announcements = annObj?.announcements || annObj || [];
        setLatestAnnouncement(announcements[0] || null);

        setLoadingData(false);
      });
    }
  }, [user, loading, router]);

  if (loading || !user || loadingData) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-[var(--on-surface-variant)] text-sm font-medium animate-pulse font-sans">
            Loading dashboard data...
          </p>
        </div>
      </div>
    );
  }

  // Profile fields helper
  const profileDetails = [
    { label: 'Registration No', value: user.registration_no, Icon: GraduationCap },
    { label: 'Department', value: user.department || 'Computer Science', Icon: Building },
    { label: 'Program', value: user.program || 'BS Computer Science', Icon: BookOpen },
    { label: 'Current Semester', value: user.current_semester ? `Semester ${user.current_semester}` : 'Semester 4', Icon: Calendar },
  ];

  // Circle progress calculation values
  const cgpaValue = cgpaData?.cgpa ?? 0.0;
  const maxCgpa = 4.0;
  const circleRadius = 45;
  const circleStrokeWidth = 8;
  const circumference = circleRadius * 2 * Math.PI;
  
  // CGPA circle progress
  const cgpaPercentage = cgpaValue > 0 ? (cgpaValue / maxCgpa) * 100 : 0;
  const cgpaStrokeDashoffset = circumference - (cgpaPercentage / 100) * circumference;

  // Overall Attendance progress
  const attendanceVal = attendanceData?.overall_percentage ?? 0;
  const attStrokeDashoffset = circumference - (attendanceVal / 100) * circumference;

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: customEase } } };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen bg-white text-[var(--on-background)] font-sans space-y-8">
      
      {/* Top Welcome Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: customEase }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-[var(--outline)] bg-slate-50/50"
      >
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200 text-xs">Student Portal</Badge>
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-mono text-xs">{user.registration_no}</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
            Welcome back, <span className="text-sky-500">{user.first_name}</span>!
          </h1>
          <p className="text-[var(--on-surface-variant)] text-sm mt-1 font-sans">
            SSUET Portal — Keep track of your academic metrics, course attendance, and fee history.
          </p>
        </div>

        {/* Mini profile stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[var(--outline)] shadow-sm">
          {profileDetails.map((item, idx) => {
            const Icon = item.Icon;
            return (
              <div key={idx} className="flex flex-col min-w-[110px] px-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Icon className="w-3 h-3 text-sky-500" />
                  {item.label}
                </span>
                <span className="text-xs font-bold text-slate-800 mt-1 truncate">{item.value}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Primary Metrics: Circle Ring Dials & Payments */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Card 1: CGPA Circular Progress Dial */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white border-[var(--outline)] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Cumulative GPA (CGPA)</h3>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Calculated across completed terms</p>
                </div>
                <Award className="w-5 h-5 text-sky-500" />
              </div>

              {/* Progress Ring container */}
              <div className="flex items-center gap-6 py-2">
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                      className="text-slate-100"
                      strokeWidth={circleStrokeWidth}
                      stroke="currentColor"
                      fill="transparent"
                      r={circleRadius}
                      cx="56"
                      cy="56"
                    />
                    {/* Foreground Progress Circle */}
                    <motion.circle
                      className="text-sky-500"
                      strokeWidth={circleStrokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={cgpaStrokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r={circleRadius}
                      cx="56"
                      cy="56"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: cgpaStrokeDashoffset }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                      {cgpaValue > 0 ? cgpaValue.toFixed(2) : '0.00'}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      of 4.0
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">Academic Status:</div>
                  <div className={`text-sm font-extrabold ${cgpaValue < 2.0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {cgpaValue >= 3.5 ? 'Excellent Stand' : cgpaValue >= 3.0 ? 'Good Stand' : cgpaValue >= 2.0 ? 'Satisfactory' : 'Academic Warning'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono leading-none">
                    Credits Completed: {cgpaData?.total_credits ?? 0}
                  </div>
                </div>
              </div>

              <Link href="/student/results" className="w-full">
                <button className="w-full py-2.5 rounded-xl border border-sky-100 text-sky-600 font-bold text-xs hover:bg-sky-50/50 hover:border-sky-300 transition-all flex items-center justify-center gap-1 cursor-pointer">
                  View Semester Marks
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Overall Attendance Circular Progress Dial */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white border-[var(--outline)] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Overall Attendance</h3>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Average rate across all courses</p>
                </div>
                <Activity className="w-5 h-5 text-sky-500" />
              </div>

              {/* Progress Ring container */}
              <div className="flex items-center gap-6 py-2">
                <div className="relative flex items-center justify-center w-28 h-28">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                      className="text-slate-100"
                      strokeWidth={circleStrokeWidth}
                      stroke="currentColor"
                      fill="transparent"
                      r={circleRadius}
                      cx="56"
                      cy="56"
                    />
                    {/* Foreground Progress Circle */}
                    <motion.circle
                      className={attendanceVal >= 75 ? "text-sky-500" : "text-red-500"}
                      strokeWidth={circleStrokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={attStrokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r={circleRadius}
                      cx="56"
                      cy="56"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: attStrokeDashoffset }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                      {Math.round(attendanceVal)}%
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      attendance
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500">Attendance Rating:</div>
                  <div className="flex items-center gap-1 text-sm font-extrabold text-slate-800">
                    {attendanceVal >= 75 ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Eligible
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Shortage risk
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono leading-none">
                    Required: 75% for exam admit
                  </div>
                </div>
              </div>

              <Link href="/student/attendance" className="w-full">
                <button className="w-full py-2.5 rounded-xl border border-sky-100 text-sky-600 font-bold text-xs hover:bg-sky-50/50 hover:border-sky-300 transition-all flex items-center justify-center gap-1 cursor-pointer">
                  View Detailed Logs
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Semester Fee Voucher Status */}
        <motion.div variants={itemVariants} className="h-full">
          <Card className="bg-white border-[var(--outline)] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tuition & Semester Fees</h3>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Current semester billing details</p>
                </div>
                <DollarSign className="w-5 h-5 text-sky-500" />
              </div>

              <div className="py-2 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-semibold text-slate-500">Amount Due:</span>
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    Rs. {semesterFees?.summary?.grand_total ? semesterFees.summary.grand_total.toLocaleString() : '0'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Voucher Status</span>
                  <Badge 
                    className={`font-semibold text-[10px] uppercase tracking-wider ${
                      semesterFees?.summary?.status === 'PAID' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-red-50 text-red-600 border-red-200'
                    }`} 
                    variant="outline"
                  >
                    {semesterFees?.summary?.status || 'UNPAID'}
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-400 font-mono leading-tight">
                  Due Date: {semesterFees?.summary?.due_date ? new Date(semesterFees.summary.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <Link href="/student/fees" className="w-full">
                <button className="w-full py-2.5 rounded-xl border border-sky-100 text-sky-600 font-bold text-xs hover:bg-sky-50/50 hover:border-sky-300 transition-all flex items-center justify-center gap-1 cursor-pointer">
                  Pay or Verify Fees
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Grid: Left (Attendance Table), Right (Sneak Peak & Todos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        {/* Attendance Column (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">Course Attendance Summary</h2>
              <p className="text-xs text-slate-500">Attendance percentages and eligibility records.</p>
            </div>
            <Link href="/student/attendance">
              <span className="text-xs font-bold text-sky-500 hover:text-sky-600 transition-colors flex items-center gap-1 cursor-pointer">
                Full Attendance History
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Link>
          </div>

          <Card className="bg-white border-[var(--outline)] shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[var(--outline)]">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Code</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Title</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Conducted</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Present / Absent</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Percentage</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceData?.courses && attendanceData.courses.length > 0 ? (
                      attendanceData.courses.map((course, idx) => {
                        const pct = course.attendance_percentage || 0;
                        const isShortage = pct < 75;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-xs font-bold font-mono text-slate-700">{course.course_code}</td>
                            <td className="p-4 text-xs font-bold text-slate-800">{course.course_name}</td>
                            <td className="p-4 text-xs text-slate-600 font-mono text-center">{course.total}</td>
                            <td className="p-4 text-xs text-slate-600 font-mono text-center">
                              <span className="text-emerald-600 font-semibold">{course.present}</span>
                              <span className="text-slate-300 mx-1">/</span>
                              <span className="text-red-500 font-semibold">{course.absent}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold font-mono text-slate-800 w-9">{Math.round(pct)}%</span>
                                <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${isShortage ? 'bg-red-500' : 'bg-sky-500'}`} 
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                className={`text-[9px] uppercase font-bold tracking-wider ${
                                  isShortage 
                                    ? 'bg-red-50 text-red-600 border-red-150' 
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`} 
                                variant="outline"
                              >
                                {isShortage ? 'Shortage Risk' : 'Eligible'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-xs text-slate-400 font-sans">
                          No course enrollments or attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel: Sneak Peak Announcements & Todos */}
        <div className="space-y-6">
          {/* Announcements Board Sneak Peak */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
              <Megaphone className="w-4.5 h-4.5 text-sky-500" />
              Board Sneak Peak
            </h2>

            <Card className="bg-white border-[var(--outline)] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardContent className="p-5 space-y-4">
                {latestAnnouncement ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-sky-50 text-sky-600 border-sky-100 text-[9px] uppercase tracking-wider font-bold" variant="outline">
                        {latestAnnouncement.category || 'General'}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        {latestAnnouncement.created_at ? new Date(latestAnnouncement.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{latestAnnouncement.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-3">
                        {latestAnnouncement.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 font-sans">
                    No active announcements posted recently.
                  </div>
                )}

                <Link href="/student/announcements" className="w-full block">
                  <button className="w-full py-2 rounded-xl border border-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer">
                    Read Announcement Board
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Pending Tasks / Todos */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <CheckSquare className="w-4.5 h-4.5 text-sky-500" />
                Pending Todos
              </h2>
              <Link href="/student/todos">
                <span className="text-[11px] font-bold text-sky-500 hover:underline cursor-pointer">Manage</span>
              </Link>
            </div>

            <Card className="bg-white border-[var(--outline)] shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardContent className="p-4 space-y-3">
                {pendingTodos.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto">
                    {pendingTodos.slice(0, 4).map((todo, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{todo.title}</p>
                          {todo.due_date && (
                            <span className="text-[9px] text-slate-400 font-mono font-bold flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {new Date(todo.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {todo.priority === 'HIGH' && (
                          <Badge className="bg-red-50 text-red-600 border-red-100 text-[8px] font-bold py-0 px-1.5" variant="outline">
                            High
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-slate-400 font-sans">
                    All tasks completed! Awesome job.
                  </div>
                )}

                <Link href="/student/todos" className="w-full block pt-1">
                  <button className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-1 cursor-pointer">
                    Open Todos Dashboard
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
