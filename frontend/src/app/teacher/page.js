'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { UserCheck, Building2, Award, MessageSquare, User, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/teacher/login');
    } else if (!loading && user && user.role !== 'TEACHER') {
      router.push('/teacher/login');
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
    { label: 'Employee ID', value: user.employee_id || 'N/A', Icon: UserCheck, colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
    { label: 'Department', value: user.department || 'N/A', Icon: Building2, colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Designation', value: user.designation || 'N/A', Icon: Award, colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  ];

  const quickActions = [
    { href: '/teacher/messages', label: 'Messages', desc: 'Interact with students & faculty', Icon: MessageSquare, colorTheme: 'cyan' },
    { href: '/teacher/profile', label: 'My Profile', desc: 'Manage your employment details', Icon: User, colorTheme: 'emerald' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Header Greeting */}
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="badge-cyan font-mono text-xs">{user.employee_id || 'N/A'}</Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-heading">
            Welcome back, <span className="gradient-text-violet">{user.first_name}</span>!
          </h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Here's a snapshot of your teaching activities and department records.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          variants={itemVariants} 
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {stats.map((stat, i) => {
            const IconComponent = stat.Icon;
            return (
              <motion.div key={i} whileHover={{ y: -4 }} className="h-full">
                <Card className="glass-card h-full border-white/5 bg-white/5 overflow-hidden relative group">
                  <div className={`absolute top-0 left-0 w-full h-1 opacity-50 transition-opacity group-hover:opacity-100 ${stat.colorClass.split(' ')[1]}`} />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {stat.label}
                      </span>
                      <div className={`p-2 rounded-lg border ${stat.colorClass}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-white tracking-tight truncate font-heading">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white font-heading">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, i) => {
              const ActionIcon = action.Icon;
              
              const themeStyles = {
                cyan: 'from-cyan-600/20 to-blue-600/20 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] text-cyan-400 border-cyan-500/20',
                emerald: 'from-emerald-600/20 to-teal-600/20 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)] text-emerald-400 border-emerald-500/20'
              };

              return (
                <Link key={i} href={action.href} >
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className={`group flex flex-col justify-between p-4 rounded-xl border border-white/10 bg-gradient-to-br ${themeStyles[action.colorTheme].split(' text-')[0]} backdrop-blur-md cursor-pointer transition-all duration-300 h-full`}
                  >
                    <div>
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-background/50 border mb-4 group-hover:scale-110 transition-transform duration-300 ${themeStyles[action.colorTheme].split(' hover:')[0].split(' ').pop()} ${themeStyles[action.colorTheme].split(' text-')[1].split(' ')[0]}`}>
                        <ActionIcon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-1.5 font-heading">{action.label}</h3>
                      <p className="text-slate-400 text-xs mb-4 leading-relaxed">{action.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                      Open Menu
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
