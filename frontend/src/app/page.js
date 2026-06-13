'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  DollarSign,
  FileText,
  BarChart3,
  Clock,
} from 'lucide-react';

export default function Home() {
  const modules = [
    {
      icon: Shield,
      title: 'Authentication & Users',
      description: 'JWT-based auth with role-based access control for students, teachers, and admins',
      status: 'Built',
    },
    {
      icon: CheckCircle,
      title: 'Todo System',
      description: 'Manual and auto-generated tasks from assignments with priority tracking',
      status: 'Built',
    },
    {
      icon: MessageSquare,
      title: 'Chat & Messaging',
      description: 'Real-time 1:1 messaging with file sharing and conversation history',
      status: 'Built',
    },
    {
      icon: FileText,
      title: 'Exams (Manual & AI)',
      description: 'Create exams manually or generate with AI, auto-grading support',
      status: 'Built',
    },
    {
      icon: BarChart3,
      title: 'Results & Statistics',
      description: 'Exam performance tracking with detailed analytics and insights',
      status: 'Built',
    },
    {
      icon: BookOpen,
      title: 'Course Management',
      description: 'Complete catalog with theory/lab variants, prerequisites, and credit hours',
      status: 'Planned',
    },
    {
      icon: Users,
      title: 'Enrollment System',
      description: 'Flexible registration windows with seat capacity and prerequisite validation',
      status: 'Planned',
    },
    {
      icon: Calendar,
      title: 'Attendance Management',
      description: '9-period daily tracking with 75% threshold for exam eligibility',
      status: 'Planned',
    },
    {
      icon: FileText,
      title: 'Assignments & Quizzes',
      description: '3+3+4 marks pattern with file uploads and deadline management',
      status: 'Planned',
    },
    {
      icon: TrendingUp,
      title: 'Grading System',
      description: 'Automated GPA/CGPA calculation with transcript generation',
      status: 'Planned',
    },
    {
      icon: DollarSign,
      title: 'Fee Management',
      description: 'Rs. 2,350/credit hour with voucher generation and payment tracking',
      status: 'Planned',
    },
    {
      icon: CheckCircle,
      title: 'Admit Card Generation',
      description: 'Per-course eligibility check (75% attendance + fees) with QR codes',
      status: 'Planned',
    },
    {
      icon: Sparkles,
      title: 'University Announcements',
      description: 'Rich text announcements with attachments and category filtering',
      status: 'Planned',
    },
    {
      icon: MessageSquare,
      title: 'Discussion Forum',
      description: 'Discord-like course channels for collaborative learning',
      status: 'Planned',
    },
    {
      icon: Clock,
      title: 'Class Timetable',
      description: 'Weekly schedule with 9 periods and conflict detection',
      status: 'Planned',
    },
  ];

  const stats = [
    { number: '15', label: 'Modules', sublabel: '5 Built, 10 Planned' },
    { number: '120+', label: 'API Endpoints', sublabel: 'RESTful Design' },
    { number: '3', label: 'User Roles', sublabel: 'Student, Teacher, Admin' },
    { number: '100%', label: 'Automated', sublabel: 'No Manual Work' },
  ];

  const techStack = [
    'Next.js 15',
    'FastAPI',
    'MongoDB',
    'AI Integration',
    'Real-time WebSocket',
    'PDF Generation',
  ];

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--bg-base)' }}>

      {/* ── Navbar ── */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-0 w-full z-50 glass-panel"
        style={{ borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.04 }} style={{ cursor: 'pointer' }}>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--violet-dark), var(--violet))' }}
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold gradient-text"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              CampusFlow
            </span>
          </motion.div>

          <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => (window.location.href = '/login')}
            className="btn btn-primary"
            style={{ borderRadius: 'var(--radius-full)', paddingInline: '24px' }}
          >
            Get Started
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => (window.location.href = '/exam-portal/login')}
            className="btn btn-ghost"
            style={{ borderRadius: 'var(--radius-full)', paddingInline: '20px' }}
          >
            Exam Portal
          </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="pt-36 pb-24 px-6 relative overflow-hidden">
        {/* Background orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
          className="absolute top-16 right-10 w-[480px] h-[480px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-10 left-10 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)' }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 glass"
                animate={{
                  boxShadow: [
                    '0 0 0 0 rgba(167,139,250,0.35)',
                    '0 0 0 18px rgba(167,139,250,0)',
                  ],
                }}
                transition={{ duration: 2.2, repeat: Infinity }}
                style={{ color: 'var(--violet)', borderColor: 'rgba(167,139,250,0.2)' }}
              >
                <Sparkles className="w-4 h-4" />
                Complete University Management System
              </motion.div>

              <h1
                className="text-5xl lg:text-7xl font-extrabold mb-6 leading-tight"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
              >
                Modern Campus
                <span className="block mt-1 gradient-text">Management</span>
              </h1>

              <p
                className="text-lg mb-10 leading-relaxed max-w-xl"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
              >
                Streamline academics, attendance, exams, and more with our comprehensive
                platform. Built for universities, designed for excellence.
              </p>

              <div className="flex flex-wrap gap-4 mb-14">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => (window.location.href = '/login')}
                  className="btn btn-primary flex items-center gap-2"
                  style={{ borderRadius: 'var(--radius-full)', padding: '14px 32px', fontSize: '15px' }}
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn btn-ghost"
                  style={{ borderRadius: 'var(--radius-full)', padding: '14px 32px', fontSize: '15px' }}
                >
                  View Documentation
                </motion.button>
              </div>

              {/* Mini-stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="glass-card text-center p-4"
                  >
                    <div
                      className="text-2xl font-extrabold mb-0.5 gradient-text"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {stat.number}
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {stat.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {stat.sublabel}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right — floating glass cards */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative h-[580px] hidden lg:block"
            >
              {/* Card 1 — Attendance */}
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-4 right-0 w-72 glass-card p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--violet-dark), var(--violet))' }}
                  >
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                      Attendance
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      85% Present
                    </div>
                  </div>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-border)' }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ duration: 1.5, delay: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--violet-dark), var(--cyan))' }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Target: 75%</span>
                  <span className="badge badge-emerald">On Track</span>
                </div>
              </motion.div>

              {/* Card 2 — CGPA */}
              <motion.div
                animate={{ y: [0, 22, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                className="absolute top-44 left-0 w-60 glass-card p-6 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #059669, var(--emerald))' }}
                  >
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold section-label">CGPA</div>
                    <div
                      className="text-2xl font-extrabold"
                      style={{ color: 'var(--emerald)', fontFamily: 'var(--font-heading)' }}
                    >
                      3.85
                    </div>
                  </div>
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Top 10% of class
                </div>
              </motion.div>

              {/* Card 3 — Notification */}
              <motion.div
                animate={{ y: [0, -14, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-16 right-8 w-64 glass-card p-5 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--indigo), var(--cyan))' }}
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
                    New Announcement
                  </div>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  Assignment deadline extended to Friday
                </p>
              </motion.div>

              {/* Card 4 — Exam Score */}
              <motion.div
                animate={{ y: [0, 16, 0], rotate: [0, -1, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                className="absolute bottom-4 left-12 w-56 glass-card p-5 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--amber), #f59e0b)' }}
                  >
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs section-label">Latest Exam</div>
                    <div className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>
                      Midterm — 88/100
                    </div>
                  </div>
                </div>
                <span className="badge badge-violet">A Grade</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Modules Section ── */}
      <section className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge badge-violet mb-4">Platform Overview</span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
            >
              15 Powerful Modules
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Everything you need to manage your university, from authentication to timetables
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((module, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -6, scale: 1.01 }}
                className="glass-card p-6 cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, var(--violet-dark), var(--indigo))',
                    }}
                  >
                    <module.icon className="w-5 h-5 text-white" />
                  </div>
                  <span
                    className={`badge ${module.status === 'Built' ? 'badge-emerald' : 'badge-indigo'}`}
                  >
                    {module.status}
                  </span>
                </div>
                <h3
                  className="text-base font-bold mb-1.5"
                  style={{ color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}
                >
                  {module.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {module.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack Section ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="glass-panel rounded-3xl p-10 md:p-14 shadow-2xl">
            <div className="grid lg:grid-cols-2 gap-14 items-center">

              {/* Left */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="badge badge-cyan mb-4">Tech Stack</span>
                <h2
                  className="text-4xl font-extrabold mb-5"
                  style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
                >
                  Built with Modern Technology
                </h2>
                <p className="text-base mb-8 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  CampusFlow leverages cutting-edge technologies to deliver a fast, secure, and
                  reliable experience for everyone.
                </p>
                <div className="flex flex-wrap gap-3">
                  {techStack.map((tech, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ scale: 1.08 }}
                      className="badge badge-violet"
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      {tech}
                    </motion.span>
                  ))}
                </div>
              </motion.div>

              {/* Right — feature list */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                {[
                  { icon: Shield, text: 'Secure & Private', desc: 'JWT authentication with role-based access', color: 'var(--violet)' },
                  { icon: Zap, text: 'Lightning Fast', desc: 'Optimized for performance and speed', color: 'var(--cyan)' },
                  { icon: CheckCircle, text: 'Reliable', desc: 'Built with production-grade technologies', color: 'var(--emerald)' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ x: 8 }}
                    className="glass-interactive flex items-start gap-4 p-4 rounded-xl"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(135deg, ${item.color}55, ${item.color}22)`, border: `1px solid ${item.color}33` }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <div className="font-semibold mb-0.5 text-sm" style={{ color: 'var(--color-text)' }}>
                        {item.text}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {item.desc}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="glass-panel rounded-3xl p-12 md:p-16 shadow-2xl relative overflow-hidden">
            {/* inner glow */}
            <div
              className="absolute inset-0 pointer-events-none rounded-3xl"
              style={{
                background:
                  'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(167,139,250,0.08) 0%, transparent 70%)',
              }}
            />
            <span className="badge badge-violet mb-6">Ready to start?</span>
            <h2
              className="text-4xl lg:text-5xl font-extrabold mb-5 relative z-10"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
            >
              Ready to Transform Your Campus?
            </h2>
            <p
              className="text-lg mb-10 relative z-10"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Join universities using CampusFlow to streamline their operations.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => (window.location.href = '/login')}
              className="btn btn-primary relative z-10"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '16px 48px',
                fontSize: '16px',
              }}
            >
              Get Started Today
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 glass-panel" style={{ borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--violet-dark), var(--violet))' }}
              >
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-lg font-bold gradient-text"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                CampusFlow
              </span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                © 2025 CampusFlow. University Management System.
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-faint)' }}>
                Powered by Next.js & FastAPI
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
