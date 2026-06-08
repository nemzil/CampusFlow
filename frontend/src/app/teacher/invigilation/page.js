'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyInvigilationDuties } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Loader2, AlertCircle, Calendar,
  Clock, DoorOpen, Building2, GraduationCap,
  BookOpen, Tag, ChevronRight,
} from 'lucide-react';

const DAY_COLORS = {
  monday:    { bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.35)', text: '#c4b5fd' },
  tuesday:   { bg: 'rgba(8,145,178,0.15)',  border: 'rgba(8,145,178,0.35)',  text: '#67e8f9' },
  wednesday: { bg: 'rgba(5,150,105,0.15)',  border: 'rgba(5,150,105,0.35)',  text: '#6ee7b7' },
  thursday:  { bg: 'rgba(217,119,6,0.15)',  border: 'rgba(217,119,6,0.35)',  text: '#fcd34d' },
  friday:    { bg: 'rgba(219,39,119,0.15)', border: 'rgba(219,39,119,0.35)', text: '#f9a8d4' },
  saturday:  { bg: 'rgba(234,88,12,0.15)',  border: 'rgba(234,88,12,0.35)',  text: '#fdba74' },
  sunday:    { bg: 'rgba(225,29,72,0.15)',  border: 'rgba(225,29,72,0.35)',  text: '#fda4af' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-PK', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function DutyCard({ duty, index }) {
  const dc = DAY_COLORS[duty.exam_day] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
      }}
    >
      {/* Header: course info stacked vertically */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        {/* Index */}
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 8,
          background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#c084fc', marginTop: 2,
        }}>
          {index + 1}
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Course Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
              {duty.course_name}
            </span>
          </div>

          {/* Course Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={11} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', fontFamily: 'monospace' }}>
              {duty.course_code}
            </span>
          </div>

          {/* Department + Semester */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Building2 size={11} style={{ color: '#64748b', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{duty.department}</span>
            </div>
            <span style={{ fontSize: 11, color: '#334155' }}>·</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <GraduationCap size={11} style={{ color: '#64748b', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#94a3b8' }}>Semester {duty.semester}</span>
            </div>
          </div>
        </div>

        {/* Day badge */}
        {duty.exam_day && (
          <div style={{
            flexShrink: 0, padding: '5px 12px', borderRadius: 20,
            background: dc.bg, border: `1px solid ${dc.border}`,
            color: dc.text, fontSize: 11, fontWeight: 700,
            textTransform: 'capitalize',
          }}>
            {duty.exam_day}
          </div>
        )}
      </div>

      {/* Bottom: schedule details */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.08)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 10,
      }}>
        {[
          { icon: Calendar, label: 'Date',       value: formatDate(duty.exam_date), color: '#818cf8' },
          { icon: Clock,    label: 'Time',       value: `${duty.exam_time_start} – ${duty.exam_time_end}`, color: '#34d399' },
          { icon: DoorOpen, label: 'Room',       value: duty.room_no, color: '#fbbf24' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Icon size={13} style={{ color, flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function TeacherInvigilationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [duties, setDuties] = useState([]);
  const [meta, setMeta]     = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
    else if (!authLoading && user && user.role !== 'TEACHER') router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'TEACHER') return;
    getMyInvigilationDuties()
      .then(res => {
        setDuties(res.duties || []);
        setMeta({ teacher: res.teacher, username: res.username });
      })
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

  // Group by upcoming (today+) and past
  const today = new Date().toISOString().split('T')[0];
  const upcoming = duties.filter(d => d.exam_date >= today);
  const past     = duties.filter(d => d.exam_date < today);

  const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemV = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90 } } };

  return (
    <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
      <motion.div variants={containerV} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Header */}
        <motion.div variants={itemV}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
              color: '#c084fc', fontSize: 11, fontWeight: 700,
            }}>
              Invigilation
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#f1f5f9' }}>
            My <span style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Invigilation</span> Duties
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>
            Exam rooms and times assigned to you as invigilator.
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <motion.div variants={itemV} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: '#64748b' }}>
            <Loader2 size={22} className="animate-spin" style={{ color: '#a855f7' }} />
            <span style={{ fontSize: 14 }}>Loading duties…</span>
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

        {/* Empty */}
        {!loading && !error && duties.length === 0 && (
          <motion.div variants={itemV} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '80px 0', gap: 14,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={28} style={{ color: '#a855f7' }} />
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: 14, fontWeight: 600 }}>No invigilation duties assigned</p>
            <p style={{ margin: 0, color: '#334155', fontSize: 12 }}>The admin hasn&apos;t assigned you to any exams yet.</p>
          </motion.div>
        )}

        {/* Stats */}
        {!loading && !error && duties.length > 0 && (
          <motion.div variants={itemV} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Duties', value: duties.length, color: '#a78bfa', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
              { label: 'Upcoming',     value: upcoming.length, color: '#34d399', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
              { label: 'Completed',    value: past.length, color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
            ].map(({ label, value, color, bg, border }) => (
              <div key={label} style={{
                background: bg, border: `1px solid ${border}`,
                borderRadius: 14, padding: '16px 20px', textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color }}>{value}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Upcoming duties */}
        {!loading && !error && upcoming.length > 0 && (
          <motion.div variants={itemV} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={14} /> Upcoming Exams ({upcoming.length})
            </h3>
            {upcoming.map((duty, idx) => (
              <DutyCard key={duty.schedule_id} duty={duty} index={idx} />
            ))}
          </motion.div>
        )}

        {/* Past duties */}
        {!loading && !error && past.length > 0 && (
          <motion.div variants={itemV} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={14} /> Past Exams ({past.length})
            </h3>
            {past.map((duty, idx) => (
              <DutyCard key={duty.schedule_id} duty={duty} index={upcoming.length + idx} />
            ))}
          </motion.div>
        )}

      </motion.div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
