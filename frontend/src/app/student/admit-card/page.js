'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyAdmitCard } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Loader2, AlertCircle, CheckCircle2,
  XCircle, Calendar, Clock, DoorOpen, UserCircle2,
  BookOpen, Tag, Lock, CreditCard, ChevronRight,
  GraduationCap, Building2, ShieldAlert, TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

// ── Attendance bar ────────────────────────────────────────────────────────────
function AttBar({ pct }) {
  const allowed = pct >= 75;
  const color = pct >= 75 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 99,
        background: 'rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 99 }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ── Course Admit Row ──────────────────────────────────────────────────────────
function CourseRow({ course, index }) {
  const allowed = course.allowed;
  const hasExam = Boolean(course.exam);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        borderRadius: 16,
        border: `1px solid ${allowed
          ? (hasExam ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)')
          : 'rgba(239,68,68,0.25)'}`,
        background: allowed
          ? (hasExam ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.02)')
          : 'rgba(239,68,68,0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Top info */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        {/* Number */}
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 8,
          background: allowed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${allowed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
          color: allowed ? '#4ade80' : '#f87171', marginTop: 2,
        }}>
          {index + 1}
        </div>

        {/* Course info — vertical */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
              {course.course_name}
            </span>
            <span style={{
              padding: '2px 7px', borderRadius: 5,
              background: course.category === 'LAB' ? 'rgba(20,184,166,0.15)' : 'rgba(99,102,241,0.15)',
              border: `1px solid ${course.category === 'LAB' ? 'rgba(20,184,166,0.3)' : 'rgba(99,102,241,0.3)'}`,
              color: course.category === 'LAB' ? '#5eead4' : '#a5b4fc',
              fontSize: 10, fontWeight: 800, textTransform: 'uppercase', flexShrink: 0,
            }}>
              {course.category}
            </span>
          </div>

          {/* Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={11} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', fontFamily: 'monospace' }}>
              {course.course_code}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>·</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{course.credit_hours} cr</span>
          </div>

          {/* Attendance bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <TrendingUp size={11} style={{ color: '#64748b', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, minWidth: 74 }}>
              Attendance:
            </span>
            <AttBar pct={course.attendance_pct} />
          </div>
        </div>

        {/* Status badge */}
        {allowed ? (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#4ade80', fontSize: 11, fontWeight: 700,
          }}>
            <CheckCircle2 size={11} /> Eligible
          </div>
        ) : (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171', fontSize: 11, fontWeight: 700,
          }}>
            <XCircle size={11} /> Not Eligible
          </div>
        )}
      </div>

      {/* Exam details or blocked message */}
      <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.1)' }}>
        {!allowed ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: 12,
          }}>
            <ShieldAlert size={14} style={{ flexShrink: 0 }} />
            <span>
              Attendance {course.attendance_pct.toFixed(1)}% is below the required <strong>75%</strong>.
              You are not allowed to sit this exam.
            </span>
          </div>
        ) : !hasExam ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#64748b', fontSize: 12,
          }}>
            <Clock size={13} style={{ flexShrink: 0 }} />
            <span>Exam schedule not yet configured by admin.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {[
              { icon: Calendar, label: 'Date', value: `${course.exam.exam_date} (${course.exam.exam_day ? course.exam.exam_day.charAt(0).toUpperCase() + course.exam.exam_day.slice(1) : ''})`, color: '#818cf8' },
              { icon: Clock,    label: 'Time', value: `${course.exam.exam_time_start} – ${course.exam.exam_time_end}`, color: '#34d399' },
              { icon: DoorOpen, label: 'Room', value: course.exam.room_no, color: '#fbbf24' },
              { icon: UserCircle2, label: 'Invigilator', value: course.exam.invigilator, color: '#67e8f9' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <Icon size={13} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StudentAdmitCardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (!authLoading && user && user.role !== 'STUDENT') router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;
    getMyAdmitCard()
      .then(res => setData(res))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#7c3aed' }} />
      </div>
    );
  }

  const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const itemV = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90 } } };

  const allowedCount  = data?.courses?.filter(c => c.allowed).length || 0;
  const blockedCount  = data?.courses?.filter(c => !c.allowed).length || 0;
  const scheduledCount = data?.courses?.filter(c => c.allowed && c.exam).length || 0;

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <motion.div variants={containerV} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <motion.div variants={itemV}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
              color: '#fbbf24', fontSize: 11, fontWeight: 700,
            }}>
              Admit Card
            </span>
            {data?.department && (
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                color: '#a5b4fc', fontSize: 11, fontWeight: 700,
              }}>
                {data.department} · Sem {data.semester}
              </span>
            )}
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9' }}>
            Exam <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Admit Card</span>
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Shows courses where your attendance meets the 75% requirement.
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <motion.div variants={itemV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: '#64748b' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 14 }}>Loading admit card…</span>
          </motion.div>
        )}

        {/* Error */}
        {!loading && error && (
          <motion.div variants={itemV} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#fca5a5', fontSize: 13,
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </motion.div>
        )}

        {/* Fee gate */}
        {!loading && !error && data && !data.fee_paid && (
          <motion.div
            variants={itemV}
            style={{
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04))',
              border: '1px solid rgba(239,68,68,0.25)',
              padding: '40px 32px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 16, textAlign: 'center',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={32} style={{ color: '#f87171' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
                Fees Not Paid
              </h2>
              <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 14, maxWidth: 420, lineHeight: 1.6 }}>
                Your admit card is locked. Please pay your semester fees first to access exam schedules and admit card.
              </p>
            </div>
            <Link href="/student/fees">
              <motion.div
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.8)', color: '#fff',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  border: '1px solid rgba(239,68,68,0.4)',
                }}
              >
                <CreditCard size={16} />
                Pay Fees Now
                <ChevronRight size={16} />
              </motion.div>
            </Link>
          </motion.div>
        )}

        {/* Stats (when fees paid) */}
        {!loading && !error && data && data.fee_paid && (
          <>
            {/* Fee paid banner */}
            <motion.div variants={itemV} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', borderRadius: 12,
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
              color: '#4ade80', fontSize: 13, fontWeight: 600,
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              Fees paid — your admit card is active.
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 12, fontWeight: 400 }}>
                {data.student} · {data.reg_no}
              </span>
            </motion.div>

            {/* Summary cards */}
            <motion.div variants={itemV} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Eligible Courses', value: allowedCount, color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', icon: CheckCircle2 },
                { label: 'Not Eligible', value: blockedCount, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', icon: XCircle },
                { label: 'Exams Scheduled', value: scheduledCount, color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: ClipboardList },
              ].map(({ label, value, color, bg, border, icon: Icon }) => (
                <div key={label} style={{
                  background: bg, border: `1px solid ${border}`,
                  borderRadius: 14, padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 11,
                    background: `${color}20`, border: `1px solid ${color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color }}>{value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Course rows */}
            <motion.div variants={itemV} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(data.courses || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569', fontSize: 14 }}>
                  No courses found. Please check your enrollment.
                </div>
              ) : (
                (data.courses || []).map((course, idx) => (
                  <CourseRow key={course.course_code} course={course} index={idx} />
                ))
              )}
            </motion.div>
          </>
        )}

      </motion.div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
