'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCoursesBySemester,
  adminGetTimetables,
  adminCreateTimetable,
  adminUpdateTimetable,
  adminDeleteTimetable,
} from '../lib/api';
import {
  CalendarDays, Save, Loader2, Clock, BookOpen,
  Users, Building2, CheckCircle2, AlertCircle, X,
  ChevronRight, GraduationCap, Tag, UserCircle2, Search,
  Hash, Trash2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Software Engineering',
  'Information Technology',
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const DAYS_OPTIONS = [
  { value: 'monday',    label: 'Mon' },
  { value: 'tuesday',   label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday',  label: 'Thu' },
  { value: 'friday',    label: 'Fri' },
  { value: 'saturday',  label: 'Sat' },
  { value: 'sunday',    label: 'Sun' },
];
const DAY_COLORS = {
  monday:    { active: '#7c3aed', bg: 'rgba(124,58,237,0.18)', border: 'rgba(124,58,237,0.45)', text: '#c4b5fd' },
  tuesday:   { active: '#0891b2', bg: 'rgba(8,145,178,0.18)',  border: 'rgba(8,145,178,0.45)',  text: '#67e8f9' },
  wednesday: { active: '#059669', bg: 'rgba(5,150,105,0.18)',  border: 'rgba(5,150,105,0.45)',  text: '#6ee7b7' },
  thursday:  { active: '#d97706', bg: 'rgba(217,119,6,0.18)',  border: 'rgba(217,119,6,0.45)',  text: '#fcd34d' },
  friday:    { active: '#db2777', bg: 'rgba(219,39,119,0.18)', border: 'rgba(219,39,119,0.45)', text: '#f9a8d4' },
  saturday:  { active: '#ea580c', bg: 'rgba(234,88,12,0.18)',  border: 'rgba(234,88,12,0.45)',  text: '#fdba74' },
  sunday:    { active: '#e11d48', bg: 'rgba(225,29,72,0.18)',  border: 'rgba(225,29,72,0.45)',  text: '#fda4af' },
};
const CATEGORY_STYLE = {
  TH:  { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)',  text: '#a5b4fc' },
  LAB: { bg: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.35)',  text: '#5eead4' },
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 18px', borderRadius: 14,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${type === 'success' ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        background: type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        color: type === 'success' ? '#6ee7b7' : '#fca5a5',
        fontSize: 13, fontWeight: 600,
      }}
    >
      {type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {msg}
    </motion.div>
  );
}

// ─── Day Picker ───────────────────────────────────────────────────────────────
function DayPicker({ selected, onChange, disabled = false }) {
  const toggle = (d) => {
    if (disabled) return;
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, opacity: disabled ? 0.7 : 1 }}>
      {DAYS_OPTIONS.map(({ value, label }) => {
        const active = selected.includes(value);
        const c = DAY_COLORS[value];
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            disabled={disabled}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.1)'}`,
              background: active ? c.bg : 'rgba(255,255,255,0.04)',
              color: active ? c.text : '#64748b',
              fontSize: 11, fontWeight: 700,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              transform: active ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Vertical Course Row ──────────────────────────────────────────────────────
function CourseRow({ course, slot, onChange, onSave, onDelete, saving, deleting, index, readOnly = false }) {
  const saved = Boolean(slot?.tt_id);
  const catStyle = CATEGORY_STYLE[course.category] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        borderRadius: 16,
        border: `1px solid ${saved ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
        background: saved ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* ── Top section: Course info stacked vertically ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}>
        {/* Index number */}
        <div style={{
          flexShrink: 0,
          width: 28, height: 28,
          borderRadius: 8,
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#a78bfa',
          marginTop: 2,
        }}>
          {index + 1}
        </div>

        {/* Vertical info stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* Course Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
              {course.course_name}
            </span>
            {/* Category badge */}
            <span style={{
              padding: '2px 8px', borderRadius: 6,
              background: catStyle.bg, border: `1px solid ${catStyle.border}`,
              color: catStyle.text, fontSize: 10, fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              {course.category}
            </span>
          </div>

          {/* Course Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={12} style={{ color: '#7c3aed', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', fontFamily: 'monospace' }}>
              {course.course_code}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>·</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{course.credit_hours} cr</span>
          </div>

          {/* Instructor Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCircle2 size={12} style={{ color: '#0891b2', flexShrink: 0 }} />
            {course.teacher_name ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#67e8f9' }}>
                {course.teacher_name}
              </span>
            ) : (
              <span style={{ fontSize: 12, fontStyle: 'italic', color: '#475569' }}>
                No instructor assigned
              </span>
            )}
          </div>
        </div>

        {/* Saved badge */}
        {saved && (
          <div style={{
            flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.25)',
            color: '#34d399', fontSize: 11, fontWeight: 700,
          }}>
            <CheckCircle2 size={11} />
            Scheduled
          </div>
        )}
      </div>

      {/* ── Bottom section: Schedule inputs ── */}
      <div style={{
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: 16,
        alignItems: 'end',
        background: 'rgba(0,0,0,0.08)',
      }}>
        {/* Days picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <CalendarDays size={11} />
            Days
          </label>
          <DayPicker
            selected={slot?.days || []}
            onChange={(days) => onChange({ days })}
            disabled={readOnly}
          />
        </div>

        {/* Time range */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Clock size={11} />
            Time
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="time"
              value={slot?.time_start || ''}
              onChange={e => onChange({ time_start: e.target.value })}
              className="tt-sm-input"
              disabled={readOnly}
              readOnly={readOnly}
            />
            <span style={{ color: '#475569', fontSize: 12 }}>–</span>
            <input
              type="time"
              value={slot?.time_end || ''}
              onChange={e => onChange({ time_end: e.target.value })}
              className="tt-sm-input"
              disabled={readOnly}
              readOnly={readOnly}
            />
          </div>
        </div>

        {/* Class No + Save */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Hash size={11} />
            Class
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. A"
              value={slot?.class_no || ''}
              onChange={e => onChange({ class_no: e.target.value })}
              className="tt-sm-input"
              style={{ width: 72 }}
              disabled={readOnly}
              readOnly={readOnly}
            />
            {!readOnly && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 9,
                    background: saved ? 'rgba(16,185,129,0.75)' : 'rgba(124,58,237,0.85)',
                    border: 'none', color: '#fff',
                    fontSize: 12, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saved ? 'Update' : 'Save'}
                </motion.button>
                {saved && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onDelete}
                    disabled={deleting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 9,
                      background: 'rgba(239,68,68,0.85)',
                      border: 'none', color: '#fff',
                      fontSize: 12, fontWeight: 700,
                      cursor: deleting ? 'not-allowed' : 'pointer',
                      opacity: deleting ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Delete
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function TimetableAdminPanel({ onClose, readOnly = false }) {
  const [dept, setDept]         = useState('');
  const [sem, setSem]           = useState('');
  const [courses, setCourses]   = useState([]);
  const [slots, setSlots]       = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [search, setSearch]     = useState('');

  const notify = (msg, type = 'success') => setToast({ msg, type });

  // Load courses + existing timetable entries when dept+sem chosen
  const loadData = useCallback(async () => {
    if (!sem) return;
    setLoading(true);
    setCourses([]);
    setSlots({});
    try {
      const [coursesData, ttData] = await Promise.all([
        getCoursesBySemester(parseInt(sem), dept),
        adminGetTimetables(dept || undefined, parseInt(sem)),
      ]);

      const courseList = Array.isArray(coursesData) ? coursesData : [];
      setCourses(courseList);

      const slotMap = {};
      (ttData?.timetables || []).forEach(tt => {
        if (tt.subject) {
          slotMap[tt.subject] = {
            tt_id:      tt.tt_id,
            class_no:   tt.class_no,
            days:       tt.days || [],
            time_start: tt.time_start,
            time_end:   tt.time_end,
          };
        }
      });
      setSlots(slotMap);
    } catch (e) {
      notify(e.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [dept, sem]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateSlot = (courseCode, patch) => {
    setSlots(prev => ({
      ...prev,
      [courseCode]: { ...(prev[courseCode] || {}), ...patch },
    }));
  };

  const saveSlot = async (course) => {
    const slot = slots[course.course_code] || {};
    if (!slot.days?.length)     { notify('Select at least one day', 'error'); return; }
    if (!slot.time_start)       { notify('Set start time', 'error'); return; }
    if (!slot.time_end)         { notify('Set end time', 'error'); return; }
    if (!slot.class_no?.trim()) { notify('Enter class number / section', 'error'); return; }
    if (!course.teacher_id)     { notify(`${course.course_code} has no instructor in course catalog`, 'error'); return; }

    setSavingId(course.course_code);
    try {
      const payload = {
        department:       dept,
        semester:         parseInt(sem),
        class_no:         slot.class_no.trim(),
        teacher_username: course.teacher_id,
        days:             slot.days,
        time_start:       slot.time_start,
        time_end:         slot.time_end,
        subject:          course.course_code,
      };

      if (slot.tt_id) {
        await adminUpdateTimetable(slot.tt_id, payload);
        notify(`${course.course_code} updated ✓`);
      } else {
        const res = await adminCreateTimetable(payload);
        setSlots(prev => ({
          ...prev,
          [course.course_code]: {
            ...prev[course.course_code],
            tt_id: res.timetable.tt_id,
          },
        }));
        notify(`${course.course_code} scheduled ✓`);
      }
    } catch (err) {
      notify(err.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const deleteSlot = async (course) => {
    const slot = slots[course.course_code];
    if (!slot?.tt_id) return;

    if (!confirm(`Delete timetable entry for ${course.course_code}?`)) return;

    setDeletingId(course.course_code);
    try {
      await adminDeleteTimetable(slot.tt_id);
      setSlots(prev => {
        const updated = { ...prev };
        delete updated[course.course_code];
        return updated;
      });
      notify(`${course.course_code} removed from timetable ✓`);
    } catch (err) {
      notify(err.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.course_name, c.course_code, c.teacher_name].some(v => (v || '').toLowerCase().includes(q));
  });

  const scheduledCount = Object.values(slots).filter(s => s?.tt_id).length;

  return (
    <>
      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div style={{ minHeight: '100vh', padding: '16px', boxSizing: 'border-box' }}>
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 860,
          margin: '0 auto',
          display: 'flex', flexDirection: 'column',
          background: '#0d0d1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          minHeight: '80vh',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(99,102,241,0.06))',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CalendarDays size={18} style={{ color: '#a78bfa' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
                  Timetable Admin{readOnly ? ' (View Only)' : ''}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {sem && dept
                    ? `Semester ${sem} · ${dept}`
                    : sem
                    ? `Semester ${sem} · All Departments`
                    : 'Select department & semester to begin'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 9,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#64748b', cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* ── Filter bar ── */}
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
            flexShrink: 0,
            background: 'rgba(0,0,0,0.12)',
          }}>
            {/* Department */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={14} style={{ color: '#475569' }} />
              <select
                value={dept}
                onChange={e => setDept(e.target.value)}
                className="tt-sm-input"
                style={{ minWidth: 200 }}
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Semester */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <GraduationCap size={14} style={{ color: '#475569' }} />
              <select
                value={sem}
                onChange={e => setSem(e.target.value)}
                className="tt-sm-input"
              >
                <option value="">Select Semester</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {/* Search */}
            {sem && courses.length > 0 && (
              <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0, minWidth: 180 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search courses…"
                  className="tt-sm-input"
                  style={{ paddingLeft: 30, width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* ── Stats bar ── */}
          {sem && !loading && courses.length > 0 && (
            <div style={{
              padding: '10px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 24,
              background: 'rgba(0,0,0,0.06)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{courses.length}</span> courses
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#34d399', fontWeight: 700 }}>{scheduledCount}</span> scheduled
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{courses.length - scheduledCount}</span> pending
              </span>
            </div>
          )}

          {/* ── Column headers (shown when courses loaded) ── */}
          {sem && !loading && filtered.length > 0 && (
            <div style={{
              padding: '8px 24px',
              display: 'grid',
              gridTemplateColumns: '36px 1fr',
              gap: 14,
              background: 'rgba(124,58,237,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              flexShrink: 0,
            }}>
              <div />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <BookOpen size={10} /> Course
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={10} /> Code · Instructor
                </span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CalendarDays size={10} /> Schedule
                </span>
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Prompt */}
            {!sem && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CalendarDays size={28} style={{ color: '#7c3aed' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 600, fontSize: 15 }}>Select a Semester</p>
                  <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 13 }}>
                    Courses from the catalog will appear here vertically
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12 }}>
                  <span>Department (optional)</span>
                  <ChevronRight size={13} />
                  <span>Semester</span>
                  <ChevronRight size={13} />
                  <span>Set schedule per course</span>
                </div>
              </div>
            )}

            {/* Loading */}
            {sem && loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: '#64748b' }}>
                <Loader2 size={22} className="animate-spin" style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: 14 }}>Loading courses…</span>
              </div>
            )}

            {/* No courses */}
            {sem && !loading && courses.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                <BookOpen size={36} style={{ color: '#1e293b' }} />
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>No courses found for Semester {sem}</p>
                <p style={{ margin: 0, color: '#334155', fontSize: 12 }}>Add courses in the Course Catalog first.</p>
              </div>
            )}

            {/* Course rows */}
            <AnimatePresence>
              {sem && !loading && filtered.map((course, idx) => (
                <CourseRow
                  key={course.course_code}
                  index={idx}
                  course={course}
                  slot={slots[course.course_code] || null}
                  onChange={(patch) => updateSlot(course.course_code, patch)}
                  onSave={() => saveSlot(course)}
                  onDelete={() => deleteSlot(course)}
                  saving={savingId === course.course_code}
                  deleting={deletingId === course.course_code}
                  readOnly={readOnly}
                />
              ))}
            </AnimatePresence>

            {/* No search results */}
            {sem && !loading && courses.length > 0 && filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569', fontSize: 13 }}>
                No courses match &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoped styles */}
      <style jsx global>{`
        .tt-sm-input {
          padding: 6px 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 12.5px;
          outline: none;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }
        .tt-sm-input:focus {
          border-color: rgba(124,58,237,0.55);
        }
        .tt-sm-input option {
          background: #1a1a2e;
          color: #e2e8f0;
        }
        .tt-sm-input[type="time"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
          cursor: pointer;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
