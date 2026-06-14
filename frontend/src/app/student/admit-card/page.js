'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getMyAdmitCard } from '@/lib/api';
import { motion } from 'framer-motion';
import {
  ClipboardList, Loader2, AlertCircle, CheckCircle2,
  XCircle, Calendar, Clock, DoorOpen, UserCircle2,
  BookOpen, Tag, Lock, CreditCard, ChevronRight,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  const allowedCount  = data?.courses?.filter(c => c.allowed).length || 0;
  const blockedCount  = data?.courses?.filter(c => !c.allowed).length || 0;
  const scheduledCount = data?.courses?.filter(c => c.allowed && c.exam).length || 0;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200">
              Official Admit Card
            </Badge>
            {data?.department && (
              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                {data.department} · Semester {data.semester}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">Exam Admit Card</h1>
          <p className="text-slate-500 mt-1 font-sans">
            Lists enrolled courses and schedules. Attendance of at least <span className="font-semibold text-slate-800">75%</span> is required to sit exams.
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          <p className="text-slate-500 text-sm">Loading admit card details...</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-650 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Fee Lock Gate */}
      {!loading && !error && data && !data.fee_paid && (
        <Card className="border-red-200 bg-red-50/10 shadow-sm rounded-2xl overflow-hidden max-w-2xl mx-auto">
          <CardContent className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-650">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-slate-900">Semester Fees Unpaid</h2>
              <p className="text-slate-550 text-sm mt-2 max-w-md leading-relaxed font-sans">
                Your examination admit card is currently locked. You must clear your semester outstanding dues to access exam schedules.
              </p>
            </div>
            <Link href="/student/fees">
              <Button className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 px-6 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm">
                <CreditCard className="w-4 h-4" /> Clear Fee Voucher <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Content (when fees paid) */}
      {!loading && !error && data && data.fee_paid && (
        <div className="space-y-6">
          
          {/* Status Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-sky-50/50 border border-sky-100 rounded-2xl">
            <div className="flex items-center gap-2.5 text-sky-700 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-sky-500 shrink-0" />
              <span>Fees Verified & Paid — Admit Card Active</span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Student: <span className="font-semibold text-slate-700">{data.student}</span> ({data.reg_no})
            </div>
          </div>

          {/* Stats Bar (No Purple/Yellow, clean sky-blue and slate) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-150/40 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Eligible Courses</p>
                <p className="text-xl font-extrabold text-slate-800 font-mono">{allowedCount}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Not Eligible</p>
                <p className="text-xl font-extrabold text-red-600 font-mono">{blockedCount}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-250/15 p-4 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-150/40 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Scheduled Exams</p>
                <p className="text-xl font-extrabold text-slate-800 font-mono">{scheduledCount}</p>
              </div>
            </div>
          </div>

          {/* Courses & Exams Table Layout */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Code</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Course Name</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Category</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Attendance</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Exam Date & Time</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Location</th>
                      <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-400">Invigilator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.courses && data.courses.length > 0 ? (
                      data.courses.map((c) => {
                        const allowed = c.allowed;
                        const hasExam = Boolean(c.exam);

                        return (
                          <tr key={c.course_code} className={`hover:bg-slate-50/50 transition-colors ${!allowed ? 'bg-red-50/10' : ''}`}>
                            <td className="p-4 text-xs font-bold font-mono text-slate-700">{c.course_code}</td>
                            <td className="p-4 text-xs font-bold text-slate-800">{c.course_name}</td>
                            <td className="p-4 text-center">
                              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-650 text-[9px] uppercase font-mono px-1.5 py-0.5">
                                {c.category || 'TH'}
                              </Badge>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-xs font-bold font-mono ${allowed ? 'text-slate-700' : 'text-red-600'}`}>
                                {c.attendance_pct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {allowed ? (
                                <Badge className="bg-sky-50 border-sky-100 text-sky-650 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Eligible
                                </Badge>
                              ) : (
                                <Badge className="bg-red-50 border-red-100 text-red-600 text-[9px] font-bold uppercase tracking-wider" variant="outline">
                                  Ineligible
                                </Badge>
                              )}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-700">
                              {!allowed ? (
                                <span className="text-red-500 font-semibold flex items-center gap-1">
                                  <ShieldAlert className="w-3.5 h-3.5" /> Attendance shortage
                                </span>
                              ) : hasExam ? (
                                <div className="space-y-0.5">
                                  <div className="font-semibold">{c.exam.exam_date}</div>
                                  <div className="text-[10px] text-slate-400">{c.exam.exam_time_start} - {c.exam.exam_time_end}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400">Not scheduled</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-700">
                              {allowed && hasExam ? (
                                <div className="flex items-center gap-1">
                                  <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Room {c.exam.room_no}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-4 text-xs font-medium text-slate-750">
                              {allowed && hasExam ? (
                                <div className="flex items-center gap-1">
                                  <UserCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{c.exam.invigilator}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-xs text-slate-400 font-sans">
                          No active courses found. Please contact administration.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
