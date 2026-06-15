'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getCoursesBySemester,
  adminGetExamSchedules,
  adminCreateExamSchedule,
  adminUpdateExamSchedule,
  adminDeleteExamSchedule,
  adminGetExamTeachersList,
} from '../lib/api';
import {
  ClipboardList, Save, Loader2, X, Building2,
  GraduationCap, Tag, UserCircle2, BookOpen,
  CheckCircle2, AlertCircle, Search, Calendar,
  Clock, DoorOpen, Hash, ChevronRight, Trash2,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Software Engineering',
  'Information Technology',
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const CATEGORY_STYLE = {
  TH:  { bg: 'rgba(99,102,241,0.15)',  border: 'rgba(99,102,241,0.35)',  text: '#a5b4fc' },
  LAB: { bg: 'rgba(20,184,166,0.15)',  border: 'rgba(20,184,166,0.35)',  text: '#5eead4' },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
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

// ── Day auto-detect ────────────────────────────────────────────────────────────
function dayFromDate(dateStr) {
  if (!dateStr) return '';
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date(dateStr).getDay()];
}

// ── Vertical Course Row ────────────────────────────────────────────────────────
function CourseRow({ course, slot, teachers, onChange, onSave, onDelete, saving, deleting, index, readOnly = false }) {
  const saved = Boolean(slot?.schedule_id);
  const catStyle = CATEGORY_STYLE[course.category] || { bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)', text: '#94a3b8' };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      style={{
        borderRadius: 16,
        border: `1px solid ${saved ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
        background: saved ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* ── Top: Course info stacked vertically ── */}
      <div style={{
        padding: '16px 20px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        {/* Index */}
        <div style={{
          flexShrink: 0, width: 28, height: 28, borderRadius: 8,
          background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: '#fbbf24', marginTop: 2,
        }}>
          {index + 1}
        </div>

        {/* Info stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Course Name + category */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={13} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.3 }}>
              {course.course_name}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 6,
              background: catStyle.bg, border: `1px solid ${catStyle.border}`,
              color: catStyle.text, fontSize: 10, fontWeight: 800,
              letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
            }}>
              {course.category}
            </span>
          </div>

          {/* Course Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={12} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fcd34d', fontFamily: 'monospace' }}>
              {course.course_code}
            </span>
            <span style={{ fontSize: 11, color: '#475569' }}>·</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{course.credit_hours} cr</span>
          </div>

          {/* Teacher from catalog */}
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

        {/* Scheduled badge */}
        {saved && (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            color: '#fbbf24', fontSize: 11, fontWeight: 700,
          }}>
            <CheckCircle2 size={11} />
            Scheduled
          </div>
        )}
      </div>

      {/* ── Bottom: Exam schedule inputs ── */}
      <div style={{
        padding: '14px 20px',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr auto 1fr auto',
        gap: 12,
        alignItems: 'end',
        background: 'rgba(0,0,0,0.08)',
      }}>

        {/* Invigilator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            <UserCircle2 size={10} /> Invigilator
          </label>
          <select
            value={slot?.invigilator_username || ''}
            onChange={e => onChange({ invigilator_username: e.target.value })}
            className="ac-row-input"
            disabled={readOnly}
          >
            <option value="">Select Teacher</option>
            {teachers.map(t => (
              <option key={t.username} value={t.username}>
                {t.name} ({t.designation})
              </option>
            ))}
          </select>
        </div>

        {/* Exam Date → auto day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            <Calendar size={10} /> Exam Date
          </label>
          <input
            type="date"
            value={slot?.exam_date || ''}
            onChange={e => onChange({
              exam_date: e.target.value,
              exam_day: dayFromDate(e.target.value),
            })}
            className="ac-row-input"
            disabled={readOnly}
            readOnly={readOnly}
          />
        </div>

        {/* Auto day display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            <Calendar size={10} /> Day
          </label>
          <div className="ac-row-input" style={{ color: slot?.exam_day ? '#fcd34d' : '#475569', fontStyle: slot?.exam_day ? 'normal' : 'italic', fontWeight: slot?.exam_day ? 600 : 400, textTransform: 'capitalize', cursor: 'default', userSelect: 'none' }}>
            {slot?.exam_day || 'Auto'}
          </div>
        </div>

        {/* Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            <Clock size={10} /> Time
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <input type="time" value={slot?.exam_time_start || ''} onChange={e => onChange({ exam_time_start: e.target.value })} className="ac-row-input" style={{ flex: 1 }} disabled={readOnly} readOnly={readOnly} />
            <span style={{ color: '#475569', fontSize: 12 }}>–</span>
            <input type="time" value={slot?.exam_time_end || ''} onChange={e => onChange({ exam_time_end: e.target.value })} className="ac-row-input" style={{ flex: 1 }} disabled={readOnly} readOnly={readOnly} />
          </div>
        </div>

        {/* Room + Save */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={labelStyle}>
            <DoorOpen size={10} /> Room
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. CS-101"
              value={slot?.room_no || ''}
              onChange={e => onChange({ room_no: e.target.value })}
              className="ac-row-input"
              style={{ width: 90 }}
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
                    background: saved ? 'rgba(245,158,11,0.75)' : 'rgba(217,119,6,0.85)',
                    border: 'none', color: '#fff',
                    fontSize: 12, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.5 : 1,
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap',
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
                      transition: 'all 0.2s ease', whiteSpace: 'nowrap',
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

const labelStyle = {
  display: 'flex', alignItems: 'center', gap: 4,
  fontSize: 10, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AdmitCardAdminPanel({ onClose, readOnly = false }) {
  const [dept, setDept]         = useState('');
  const [sem, setSem]           = useState('');
  const [courses, setCourses]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [slots, setSlots]       = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [search, setSearch]     = useState('');

  const notify = (msg, type = 'success') => setToast({ msg, type });

  const loadData = useCallback(async () => {
    if (!sem) return;
    setLoading(true);
    setCourses([]);
    setSlots({});
    try {
      const [courseList, teachList, schedRes] = await Promise.all([
        getCoursesBySemester(parseInt(sem), dept),
        adminGetExamTeachersList(),
        adminGetExamSchedules(dept || undefined, parseInt(sem)),
      ]);

      setCourses(Array.isArray(courseList) ? courseList : []);
      setTeachers(Array.isArray(teachList) ? teachList : []);

      const slotMap = {};
      (schedRes?.schedules || []).forEach(s => {
        slotMap[s.course_code] = {
          schedule_id:          s.schedule_id,
          invigilator_username: s.invigilator_username,
          exam_date:            s.exam_date,
          exam_day:             s.exam_day,
          exam_time_start:      s.exam_time_start,
          exam_time_end:        s.exam_time_end,
          room_no:              s.room_no,
        };
      });
      setSlots(slotMap);
    } catch (e) {
      notify(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [dept, sem]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateSlot = (code, patch) =>
    setSlots(prev => ({ ...prev, [code]: { ...(prev[code] || {}), ...patch } }));

  const saveSlot = async (course) => {
    const slot = slots[course.course_code] || {};
    if (!slot.invigilator_username) { notify('Select an invigilator', 'error'); return; }
    if (!slot.exam_date)            { notify('Set exam date', 'error'); return; }
    if (!slot.exam_time_start)      { notify('Set start time', 'error'); return; }
    if (!slot.exam_time_end)        { notify('Set end time', 'error'); return; }
    if (!slot.room_no?.trim())      { notify('Enter room number', 'error'); return; }
    if (!dept)                      { notify('Select a department', 'error'); return; }

    setSavingId(course.course_code);
    try {
      const payload = {
        department:           dept,
        semester:             parseInt(sem),
        course_code:          course.course_code,
        course_name:          course.course_name,
        invigilator_username: slot.invigilator_username,
        exam_date:            slot.exam_date,
        exam_day:             slot.exam_day || dayFromDate(slot.exam_date),
        exam_time_start:      slot.exam_time_start,
        exam_time_end:        slot.exam_time_end,
        room_no:              slot.room_no.trim(),
      };

      if (slot.schedule_id) {
        await adminUpdateExamSchedule(slot.schedule_id, payload);
        notify(`${course.course_code} updated ✓`);
      } else {
        const res = await adminCreateExamSchedule(payload);
        setSlots(prev => ({
          ...prev,
          [course.course_code]: {
            ...prev[course.course_code],
            schedule_id: res.schedule.schedule_id,
          },
        }));
        notify(`${course.course_code} exam scheduled ✓`);
      }
    } catch (err) {
      notify(err.message || 'Save failed', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const deleteSlot = async (course) => {
    const slot = slots[course.course_code];
    if (!slot?.schedule_id) return;

    if (!confirm(`Delete exam schedule for ${course.course_code}?`)) return;

    setDeletingId(course.course_code);
    try {
      await adminDeleteExamSchedule(slot.schedule_id);
      setSlots(prev => {
        const updated = { ...prev };
        delete updated[course.course_code];
        return updated;
      });
      notify(`${course.course_code} removed from exam schedule ✓`);
    } catch (err) {
      notify(err.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = courses.filter(c => {
    const q = search.toLowerCase();
    return !q || [c.course_name, c.course_code, c.teacher_name]
      .some(v => (v || '').toLowerCase().includes(q));
  });

  const scheduledCount = Object.values(slots).filter(s => s?.schedule_id).length;

  return (
    <>
      <AnimatePresence>
        {toast && <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div style={{ minHeight: '100vh', padding: 16, boxSizing: 'border-box' }}>
        <div style={{
          width: '100%', maxWidth: 960, margin: '0 auto',
          display: 'flex', flexDirection: 'column',
          background: '#0d0d1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden', minHeight: '80vh',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(217,119,6,0.08), rgba(245,158,11,0.05))',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'rgba(217,119,6,0.18)', border: '1px solid rgba(217,119,6,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ClipboardList size={18} style={{ color: '#fbbf24' }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>
                  Admit Card Admin{readOnly ? ' (View Only)' : ''}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {sem && dept ? `Semester ${sem} · ${dept}` : 'Select department & semester to configure exam schedule'}
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
                color: '#64748b', cursor: 'pointer', transition: 'all 0.15s ease',
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
            flexShrink: 0, background: 'rgba(0,0,0,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Building2 size={14} style={{ color: '#475569' }} />
              <select value={dept} onChange={e => setDept(e.target.value)} className="ac-row-input" style={{ minWidth: 200 }}>
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <GraduationCap size={14} style={{ color: '#475569' }} />
              <select value={sem} onChange={e => setSem(e.target.value)} className="ac-row-input">
                <option value="">Select Semester</option>
                {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            {sem && courses.length > 0 && (
              <div style={{ position: 'relative', marginLeft: 'auto', flexShrink: 0, minWidth: 180 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search courses…"
                  className="ac-row-input"
                  style={{ paddingLeft: 30, width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* ── Stats ── */}
          {sem && !loading && courses.length > 0 && (
            <div style={{
              padding: '10px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: 24,
              background: 'rgba(0,0,0,0.06)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{courses.length}</span> courses
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{scheduledCount}</span> scheduled
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{courses.length - scheduledCount}</span> pending
              </span>
            </div>
          )}

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Prompt */}
            {!sem && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ClipboardList size={28} style={{ color: '#d97706' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, color: '#cbd5e1', fontWeight: 600, fontSize: 15 }}>Select a Semester</p>
                  <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 13 }}>
                    All courses will appear vertically for exam scheduling
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 12 }}>
                  <span>Department</span>
                  <ChevronRight size={13} />
                  <span>Semester</span>
                  <ChevronRight size={13} />
                  <span>Set exam schedule per course</span>
                </div>
              </div>
            )}

            {/* Loading */}
            {sem && loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: '#64748b' }}>
                <Loader2 size={22} className="animate-spin" style={{ color: '#d97706' }} />
                <span style={{ fontSize: 14 }}>Loading courses…</span>
              </div>
            )}

            {/* No courses */}
            {sem && !loading && courses.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12 }}>
                <BookOpen size={36} style={{ color: '#1e293b' }} />
                <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>No courses found for Semester {sem}</p>
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
                  teachers={teachers}
                  onChange={patch => updateSlot(course.course_code, patch)}
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

      <style jsx global>{`
        .ac-row-input {
          width: 100%;
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
        .ac-row-input:focus { border-color: rgba(217,119,6,0.55); }
        .ac-row-input option { background: #1a1a2e; color: #e2e8f0; }
        .ac-row-input[type="date"]::-webkit-calendar-picker-indicator,
        .ac-row-input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </>
  );
}
