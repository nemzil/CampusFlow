'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { getMyAttendanceSummary, getMyFeeVoucher, getMyCgpa } from '@/lib/api';
import { GraduationCap, Building, BookOpen, Calendar, DollarSign, User, ArrowRight, Loader2, Activity } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [avgAttendance, setAvgAttendance] = useState(null);
  const [semesterFees, setSemesterFees] = useState(null);
  const [cgpa, setCgpa] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    else if (!loading && user && user.role !== 'STUDENT') router.push('/login');
    else if (!loading && user) {
      getMyAttendanceSummary('ALL')
        .then(d => setAvgAttendance(d?.overall_percentage ?? null))
        .catch(() => {});

      getMyFeeVoucher()
        .then(d => setSemesterFees(d?.summary?.grand_total ?? null))
        .catch(() => {});

      getMyCgpa()
        .then(d => setCgpa(d?.cgpa ?? null))
        .catch(() => {});
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 text-sm font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Registration No', value: user.registration_no, Icon: GraduationCap, colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { label: 'Department', value: user.department, Icon: Building, colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Program', value: user.program, Icon: BookOpen, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Semester', value: `Semester ${user.current_semester}`, Icon: Calendar, colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  ];

  const quickActions = [
    { 
      href: '/student/attendance', 
      label: 'Avg Attendance', 
      value: avgAttendance !== null ? `${avgAttendance}%` : '—',
      desc: 'Overall attendance across all courses', 
      Icon: Activity, 
      colorTheme: 'violet' 
    },
    { 
      href: '/student/fees', 
      label: 'Semester Fees', 
      value: semesterFees !== null ? `Rs. ${semesterFees.toLocaleString()}` : '—',
      desc: 'View your fee voucher for this semester', 
      Icon: DollarSign, 
      colorTheme: 'cyan' 
    },
    { 
      href: '/student/exams', 
      label: 'CGPA', 
      value: cgpa !== null ? cgpa.toFixed(2) : '—',
      desc: 'Cumulative Grade Point Average', 
      Icon: GraduationCap, 
      colorTheme: 'emerald' 
    },
  ];

  const themeMap = {
    violet: { grad: 'from-violet-600/20 to-indigo-600/20', border: 'border-violet-500/20', hover: 'hover:border-violet-500/50', icon: 'text-violet-400' },
    cyan:   { grad: 'from-cyan-600/20 to-blue-600/20',    border: 'border-cyan-500/20',   hover: 'hover:border-cyan-500/50',   icon: 'text-cyan-400'   },
    emerald:{ grad: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/20',hover: 'hover:border-emerald-500/50',icon: 'text-emerald-400'},
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

        {/* Header */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="badge-violet text-xs">Student Portal</Badge>
            <Badge variant="outline" className="badge-cyan font-mono text-xs">{user.registration_no}</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-heading">
            Welcome back, <span className="gradient-text-violet">{user.first_name}</span>!
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">Here's an overview of your academic profile and activities today.</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => {
            const IconComponent = stat.Icon;
            return (
              <motion.div key={i} whileHover={{ y: -2 }} className="h-full">
                <Card className="glass-card h-full border-white/5 bg-white/5 overflow-hidden relative group">
                  <div className={`absolute top-0 left-0 w-full h-1 opacity-50 transition-opacity group-hover:opacity-100 ${stat.colorClass.split(' ')[1]}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</span>
                      <div className={`p-2 rounded-lg border ${stat.colorClass}`}><IconComponent className="w-4 h-4" /></div>
                    </div>
                    <p className="text-xl font-bold text-white tracking-tight truncate font-heading">{stat.value}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white font-heading">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, i) => {
              const ActionIcon = action.Icon;
              const t = themeMap[action.colorTheme];
              return (
                <Link key={i} href={action.href}>
                  <motion.div whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    className={`group flex flex-col justify-between p-5 rounded-xl border border-white/10 bg-gradient-to-br ${t.grad} ${t.hover} backdrop-blur-md cursor-pointer transition-all duration-300 h-full`}>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-background/50 border ${t.border} ${t.icon} group-hover:scale-110 transition-transform duration-300`}>
                          <ActionIcon className="w-6 h-6" />
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-extrabold text-white tracking-tight font-heading">
                            {action.value}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 font-heading">{action.label}</h3>
                      <p className="text-slate-400 text-sm mb-4 leading-relaxed">{action.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      View Details <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
