'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, Building2, BookOpen, ClipboardList, Megaphone, CheckSquare, ArrowRight, Loader2, Award, Calendar, BookMarked, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getMyCourses, getTodos, getAnnouncements, getTeacherExamStats, getMyTeachingSchedule } from '@/lib/api';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [todos, setTodos] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [examStats, setExamStats] = useState(null);
  const [todaysClasses, setTodaysClasses] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/teacher/login');
    } else if (!loading && user && user.role !== 'TEACHER') {
      router.push('/teacher/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const [coursesData, todosData, annData, statsData, scheduleData] = await Promise.all([
          getMyCourses().catch(() => []),
          getTodos({ completed: false }).catch(() => []),
          getAnnouncements({ limit: 4 }).catch(() => null),
          getTeacherExamStats().catch(() => null),
          getMyTeachingSchedule().catch(() => null)
        ]);

        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setTodos(Array.isArray(todosData) ? todosData : []);
        setAnnouncements(annData?.announcements || []);
        setExamStats(statsData);
        
        // Filter today's classes
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const schedules = scheduleData?.timetables || [];
        const todaySchedule = schedules.filter(entry => entry.days?.includes(today)).sort((a, b) => a.time_start.localeCompare(b.time_start));
        setTodaysClasses(todaySchedule);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading || !user || dataLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Employee ID', value: user.employee_id || 'N/A', Icon: UserCheck, colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { label: 'Department', value: user.department || 'N/A', Icon: Building2, colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
    { label: 'Designation', value: user.designation || 'N/A', Icon: Award, colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  ];

  const quickActions = [
    { href: '/teacher/assignments', label: 'Create Assignment', desc: 'Manage your course assignments', Icon: ClipboardList, colorTheme: 'emerald' },
    { href: '/teacher/attendance', label: 'Mark Attendance', desc: 'Record daily attendance logs', Icon: Calendar, colorTheme: 'amber' },
    { href: '/teacher/messages', label: 'Chat Messages', desc: 'Interact with your students', Icon: MessageSquare, colorTheme: 'sky' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } }
  };

  // Calculate Grading Progress
  const totalSubmissions = examStats?.total_submissions || 0;
  const totalGraded = examStats?.total_graded || 0;
  const gradingPercent = totalSubmissions > 0 ? Math.round((totalGraded / totalSubmissions) * 100) : 100;
  
  const circleRadius = 50;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleStrokeOffset = circleCircumference - (gradingPercent / 100) * circleCircumference;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/30">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Greeting */}
        <motion.div variants={itemVariants} className="space-y-1.5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 font-mono text-xs">{user.employee_id || 'STAFF'}</Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs font-bold uppercase tracking-wider">{user.department}</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 font-heading">
              Welcome back, <span className="text-emerald-600">{user.first_name}</span>!
            </h1>
            <p className="text-slate-500 text-sm max-w-2xl mt-1 font-medium">
              Here's a snapshot of your teaching activities, assigned courses, and pending tasks.
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={itemVariants} 
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Identity Stats */}
          {stats.map((stat, i) => {
            const IconComponent = stat.Icon;
            return (
              <motion.div key={i} whileHover={{ y: -4 }} className="h-full">
                <Card className="h-full border-slate-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 relative group overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {stat.label}
                      </span>
                      <div className={`p-2.5 rounded-xl border ${stat.colorClass} group-hover:scale-110 transition-transform`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-xl font-black text-slate-800 tracking-tight truncate font-heading">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Courses & Todos */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* My Schedule */}
            <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold font-heading text-slate-800">My Schedule</h2>
                </div>
                <Link href="/teacher/timetable">
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer font-bold text-[10px] uppercase tracking-wider transition-colors border-none shadow-sm">
                    View Full Schedule
                  </Badge>
                </Link>
              </div>
              <div className="p-0">
                {todaysClasses.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No classes scheduled</p>
                    <p className="text-xs text-slate-500 mt-1">You currently have no classes scheduled for today.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Class</th>
                          <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Date</th>
                          <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Timings</th>
                          <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400">Room</th>
                          <th className="px-5 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-400 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {todaysClasses.slice(0, 4).map((entry, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 font-mono text-[10px]">
                                  {entry.subject || 'CLASS'}
                                </Badge>
                                <span className="font-bold text-xs text-slate-800">{entry.department || 'Dept'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-xs font-medium text-slate-500">Today</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{entry.time_start} - {entry.time_end}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="text-xs font-medium text-slate-500">{entry.class_no || 'N/A'}</span>
                            </td>
                            <td className="px-5 py-3.5 whitespace-nowrap text-right">
                              <Link href={`/teacher/timetable`}>
                                <button className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                                  Details
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="space-y-3">
              <h2 className="text-sm font-bold font-heading text-slate-800 px-1 uppercase tracking-wider">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {quickActions.map((action, i) => {
                  const ActionIcon = action.Icon;
                  const themeStyles = {
                    emerald: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                    amber: 'from-amber-500/10 to-orange-500/10 border-amber-200 text-amber-600 hover:bg-amber-50',
                    sky: 'from-sky-500/10 to-blue-500/10 border-sky-200 text-sky-600 hover:bg-sky-50'
                  };

                  return (
                    <Link key={i} href={action.href}>
                      <motion.div
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className={`group flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-br ${themeStyles[action.colorTheme]} cursor-pointer transition-all h-full shadow-sm hover:shadow`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-inherit shadow-sm group-hover:scale-110 transition-transform">
                          <ActionIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold mb-0.5">{action.label}</h3>
                          <p className="text-[10px] opacity-80 leading-tight pr-2">{action.desc}</p>
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

          </div>

          {/* Right Column: Todos & Announcements */}
          <div className="space-y-6">
            
            {/* Pending Todos */}
            <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[350px]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold font-heading text-slate-800">Pending Tasks</h2>
                </div>
                <Link href="/teacher/todos">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer text-slate-500 hover:text-slate-800">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {todos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <CheckSquare className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-500">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {todos.slice(0, 5).map((todo, i) => (
                      <Link key={todo.id} href="/teacher/todos">
                        <div className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-100 flex gap-3 items-start">
                          <div className={`w-3 h-3 rounded-sm mt-1 flex-shrink-0 border-2 ${
                            todo.priority === 'HIGH' ? 'border-red-400 bg-red-50' :
                            todo.priority === 'MEDIUM' ? 'border-amber-400 bg-amber-50' :
                            'border-emerald-400 bg-emerald-50'
                          }`} />
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight mb-1">{todo.title}</p>
                            {todo.due_date && (
                              <p className="text-[10px] font-mono text-slate-400">Due: {new Date(todo.due_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Recent Announcements */}
            <motion.div variants={itemVariants} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[300px]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm font-bold font-heading text-slate-800">Notice Board</h2>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Megaphone className="w-8 h-8 text-slate-200 mb-2" />
                    <p className="text-xs font-bold text-slate-500">No new announcements</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-snug">{ann.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            {new Date(ann.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>

      </motion.div>
    </div>
  );
}
