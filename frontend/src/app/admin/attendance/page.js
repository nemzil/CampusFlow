'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { getCourses, getCourseSessions, lockAttendance, unlockAttendance } from '@/lib/api';
import { Lock, Unlock, Loader2, Search, Calendar, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function AdminAttendancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [allCourses, setAllCourses] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [department, setDepartment] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Unlock modal
  const [unlockTarget, setUnlockTarget] = useState(null); // single course
  const [unlockReason, setUnlockReason] = useState('');
  const [bulkUnlockMode, setBulkUnlockMode] = useState(false);

  // Checkbox selection for unlock
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.push('/login');
    else if (!authLoading && user) load();
  }, [user, authLoading]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCourses({});
      const list = data.courses || data || [];
      setAllCourses(list);
      const map = {};
      await Promise.all(list.map(async (c) => {
        const id = c.id || c._id;
        try {
          const d = await getCourseSessions(id);
          const sessions = d.sessions || [];
          const locked = sessions.filter(s => s.is_locked).length;
          map[id] = { count: sessions.length, locked, unlocked: sessions.length - locked, fullyLocked: sessions.length > 0 && locked === sessions.length };
        } catch { map[id] = { count: 0, locked: 0, unlocked: 0, fullyLocked: false }; }
      }));
      setSessionInfo(map);
    } catch (e) { showError(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  // Derive department from course code prefix (e.g. SE-101T → SE)
  const getDept = (course) => course.department || course.course_code?.split('-')[0] || 'OTHER';

  const departments = useMemo(() =>
    ['ALL', ...new Set(allCourses.map(getDept).filter(Boolean))].sort(),
    [allCourses]
  );

  const filtered = useMemo(() => allCourses.filter(c => {
    const matchDept = department === 'ALL' || getDept(c) === department;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.course_code?.toLowerCase().includes(q) || c.course_name?.toLowerCase().includes(q) || c.teacher_name?.toLowerCase().includes(q);
    return matchDept && matchSearch;
  }), [allCourses, department, searchQuery]);

  // ── Lock single ──
  const handleLock = async (course) => {
    if (!confirm(`Lock attendance for ${course.course_code}?`)) return;
    setSubmitting(true);
    try {
      await lockAttendance(course.id || course._id, course.term || 'ALL');
      showSuccess(`Locked: ${course.course_code}`);
      await load();
    } catch (e) { showError(e.message); }
    finally { setSubmitting(false); }
  };

  // ── Unlock single ──
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!unlockReason.trim()) { showError('Reason required'); return; }
    setSubmitting(true);
    try {
      const id = unlockTarget.id || unlockTarget._id;
      await unlockAttendance(id, unlockReason);
      showSuccess(`Unlocked: ${unlockTarget.course_code}`);
      setUnlockTarget(null);
      setUnlockReason('');
      await load();
    } catch (e) { showError(e.message); }
    finally { setSubmitting(false); }
  };

  // ── Bulk lock all filtered ──
  const handleBulkLock = async () => {
    const tolock = filtered.filter(c => { const i = sessionInfo[c.id || c._id]; return !i?.fullyLocked; });
    if (!tolock.length) { showError('All courses are already locked'); return; }
    if (!confirm(`Lock attendance for all ${tolock.length} course(s) in this view?`)) return;
    setSubmitting(true);
    try {
      const results = await Promise.allSettled(tolock.map(c => lockAttendance(c.id || c._id, c.term || 'ALL')));
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (succeeded > 0) showSuccess(`Locked ${succeeded} course(s)${failed > 0 ? ` (${failed} had no sessions)` : ''}`);
      else showError('No courses could be locked — courses may have no attendance sessions yet');
      await load();
    } catch (e) { showError(e.message); }
    finally { setSubmitting(false); }
  };

  // ── Bulk unlock all filtered ──
  const handleBulkUnlock = async (e) => {
    e.preventDefault();
    if (!unlockReason.trim()) { showError('Reason required'); return; }
    const tounlock = bulkUnlockMode === 'selected'
      ? filtered.filter(c => selectedIds.has(c.id || c._id))
      : filtered;
    if (!tounlock.length) { showError('No courses selected'); return; }
    setSubmitting(true);
    try {
      await Promise.all(tounlock.map(c => unlockAttendance(c.id || c._id, unlockReason).catch(() => {})));
      showSuccess(`Unlocked ${tounlock.length} courses`);
      setBulkUnlockMode(false);
      setUnlockReason('');
      setSelectedIds(new Set());
      await load();
    } catch (e) { showError(e.message); }
    finally { setSubmitting(false); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060813]">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header */}
      <div>
        <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Registrar Admin</Badge>
        <h1 className="text-3xl font-bold font-heading tracking-tight">Attendance Audit Lock</h1>
        <p className="text-slate-400 mt-1 text-sm">Freeze or unfreeze attendance sheets by department or individual course.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Department dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold shrink-0">Department:</span>
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="h-9 rounded-lg bg-white/[0.04] border border-white/10 px-3 text-xs text-white min-w-[180px] focus:outline-none focus:border-violet-500/50">
            {departments.map(d => <option key={d} value={d} className="bg-slate-900">{d === 'ALL' ? 'All Departments' : d}</option>)}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search course, instructor..." className="h-9 pl-9 bg-background/50 border-white/10 text-white text-xs" />
        </div>

        <div className="flex gap-2 ml-auto">
          <Button onClick={handleBulkLock} disabled={submitting}
            className="h-9 text-xs bg-rose-600 hover:bg-rose-500 text-white font-semibold">
            <Lock className="w-3.5 h-3.5 mr-1.5" />Lock All
          </Button>
          {selectedIds.size > 0 && (
            <Button onClick={() => { setBulkUnlockMode('selected'); setUnlockReason(''); }} disabled={submitting}
              className="h-9 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold">
              <Unlock className="w-3.5 h-3.5 mr-1.5" />Unlock Selected ({selectedIds.size})
            </Button>
          )}
          <Button onClick={() => { setBulkUnlockMode(true); setUnlockReason(''); }} disabled={submitting}
            className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
            <Unlock className="w-3.5 h-3.5 mr-1.5" />Unlock All
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-white/5 bg-white/[0.02]">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-xs">No courses found for selected department.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="p-4 w-10"></th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Instructor</th>
                    <th className="p-4 text-center">Sessions</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(course => {
                    const id = course.id || course._id;
                    const info = sessionInfo[id] || { count: 0, locked: 0, unlocked: 0, fullyLocked: false };
                    return (
                      <tr key={id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 w-10">
                          {info.fullyLocked && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(id)}
                              onChange={() => toggleSelect(id)}
                              className="w-4 h-4 accent-violet-500 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[10px] text-violet-400 font-bold tracking-widest block">{course.course_code}</span>
                          <span className="font-semibold text-white">{course.course_name}</span>
                        </td>
                        <td className="p-4 text-slate-400">{course.department || '—'}</td>
                        <td className="p-4 text-slate-300">{course.teacher_name || 'TBA'}</td>
                        <td className="p-4 text-center">
                          <span className="font-semibold text-slate-200">{info.count}</span>
                          <span className="text-[10px] text-slate-500 block">{info.locked}L / {info.unlocked}U</span>
                        </td>
                        <td className="p-4">
                          {info.count === 0
                            ? <Badge variant="outline" className="bg-slate-500/10 border-slate-500/20 text-slate-400">NO LOGS</Badge>
                            : info.fullyLocked
                              ? <Badge className="bg-rose-500/15 border border-rose-500/30 text-rose-400"><Lock className="w-3 h-3 mr-1 inline" />LOCKED</Badge>
                              : <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"><Unlock className="w-3 h-3 mr-1 inline" />EDITABLE</Badge>
                          }
                        </td>
                        <td className="p-4 text-right">
                          {info.count > 0 && (
                            <div className="flex gap-1.5 justify-end">
                              {!info.fullyLocked && (
                                <Button size="sm" onClick={() => handleLock(course)} disabled={submitting}
                                  className="h-7 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                                  <Lock className="w-3 h-3 mr-1" />Lock
                                </Button>
                              )}
                              <Button size="sm" onClick={() => { setUnlockTarget(course); setUnlockReason(''); setBulkUnlockMode(false); }} disabled={submitting}
                                className="h-7 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                <Unlock className="w-3 h-3 mr-1" />Unlock
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single unlock modal */}
      {unlockTarget && !bulkUnlockMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <div className="p-5 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-400">
                <Unlock className="w-5 h-5" />Unlock: {unlockTarget.course_code}
              </h3>
              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Reason</label>
                  <textarea required value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
                    placeholder="Reason for unlocking..." className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setUnlockTarget(null)} className="h-8 text-xs border border-white/5">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Unlock'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bulk unlock modal */}
      {bulkUnlockMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <div className="p-5 space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2 text-emerald-400">
                <Unlock className="w-5 h-5" />{bulkUnlockMode === 'selected' ? `Unlock Selected (${selectedIds.size})` : `Bulk Unlock — ${department === 'ALL' ? 'All Departments' : department}`}
              </h3>
              <p className="text-xs text-slate-400">
                {bulkUnlockMode === 'selected' ? 'Unlock the selected locked courses.' : 'This will unlock all courses in the current view.'}
              </p>
              <form onSubmit={handleBulkUnlock} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Reason</label>
                  <textarea required value={unlockReason} onChange={e => setUnlockReason(e.target.value)}
                    placeholder="Reason for bulk unlock..." className="w-full h-20 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setBulkUnlockMode(false)} className="h-8 text-xs border border-white/5">Cancel</Button>
                  <Button type="submit" disabled={submitting} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Unlock All'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
