'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { 
  getFeeStructures, 
  saveFeeStructure, 
  deleteFeeStructure,
  getPendingPayments,
  verifyPayment,
  rejectPayment 
} from '@/lib/api';
import { DollarSign, Plus, Save, Trash2, Loader2, Edit3, X, Check, FileCheck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import FeeDashboard from '@/components/FeeDashboard';
import { isCourseManagementAdmin, isExamManagementAdmin } from '@/lib/adminAccess';

const DEPARTMENTS = [
  'Software Engineering', 'Computer Science', 'Civil Engineering',
  'Electrical Engineering', 'Mechanical Engineering', 'Electronics Engineering',
  'Telecommunication Engineering', 'Bio Medical Engineering', 'Industrial Engineering',
];

const EMPTY_FORM = {
  department: '',
  core_per_credit: '',
  elective_per_credit: '',
  compulsory_per_credit: '',
  lab_charges: '',
  security_deposit: '',
};

function AdminFeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [activeTab, setActiveTab] = useState('structures'); // structures, verification

  // Department structures states
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // Verification states
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Approve/Reject Action states
  const [notes, setNotes] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'verification' || tabParam === 'structures') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const isFeeAdmin = user?.admin_level === 'FEE_MANAGEMENT_ADMIN';

  if (!authLoading && user && !isFeeAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-2">
              <DollarSign className="w-7 h-7 text-violet-400" />Fee Dashboard
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Overview of fee collection statistics and ledger statements.</p>
          </div>
        </div>
        <FeeDashboard />
      </div>
    );
  }

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.push('/login');
    else if (!authLoading && user && (isCourseManagementAdmin(user) || isExamManagementAdmin(user))) router.push('/admin');
    else if (!authLoading && user) {
      if (activeTab === 'structures') load();
      else loadPendingPayments();
    }
  }, [user, authLoading, activeTab]);

  const load = async () => {
    setLoading(true);
    try { setStructures(await getFeeStructures()); }
    catch (e) { showError(e.message || 'Failed to load structures'); }
    finally { setLoading(false); }
  };

  const loadPendingPayments = async () => {
    setPendingLoading(true);
    try {
      const data = await getPendingPayments();
      setPendingPayments(data.pending_payments || data || []);
    } catch (e) {
      showError(e.message || 'Failed to load pending payments');
    } finally {
      setPendingLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      department: s.department,
      core_per_credit: s.core_per_credit,
      elective_per_credit: s.elective_per_credit,
      compulsory_per_credit: s.compulsory_per_credit,
      lab_charges: s.lab_charges,
      security_deposit: s.security_deposit,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.department) { showError('Select a department'); return; }
    setSaving(true);
    try {
      await saveFeeStructure({
        department: form.department,
        core_per_credit: parseInt(form.core_per_credit) || 0,
        elective_per_credit: parseInt(form.elective_per_credit) || 0,
        compulsory_per_credit: parseInt(form.compulsory_per_credit) || 0,
        lab_charges: parseInt(form.lab_charges) || 0,
        security_deposit: parseInt(form.security_deposit) || 0,
      });
      showSuccess(`Fee structure saved for ${form.department}`);
      setShowModal(false);
      await load();
    } catch (e) { showError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Delete fee structure for ${dept}?`)) return;
    try {
      await deleteFeeStructure(dept);
      showSuccess('Deleted.');
      await load();
    } catch (e) { showError(e.message); }
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setActionProcessing(true);
    try {
      await verifyPayment(verifyingId, notes);
      showSuccess('Payment successfully approved and verified! Student balance turned to 0.');
      setVerifyingId(null);
      setNotes('');
      await loadPendingPayments();
    } catch (e) {
      showError(e.message || 'Failed to approve payment');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showError('Please provide a rejection reason');
      return;
    }
    setActionProcessing(true);
    try {
      await rejectPayment(rejectingId, rejectionReason);
      showSuccess('Payment rejected and student notified.');
      setRejectingId(null);
      setRejectionReason('');
      await loadPendingPayments();
    } catch (e) {
      showError(e.message || 'Failed to reject payment');
    } finally {
      setActionProcessing(false);
    }
  };

  const fmt = (n) => n?.toLocaleString() ?? '—';

  if (authLoading || (activeTab === 'structures' && loading)) {
    return <div className="min-h-screen flex items-center justify-center bg-[#060813]"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-violet-400" />Fee Management
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Configure credit hour structures and verify student Stripe payments.</p>
        </div>
        {activeTab === 'structures' && (
          <Button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9 self-start sm:self-center">
            <Plus className="w-4 h-4 mr-1.5" />Add Department
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-4">
        <button 
          onClick={() => setActiveTab('structures')}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'structures' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Department Fee Structures
          {activeTab === 'structures' && <motion.div layoutId="adminFeeTabs" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />}
        </button>
        <button 
          onClick={() => setActiveTab('verification')}
          className={`pb-3 text-sm font-semibold transition-all relative ${activeTab === 'verification' ? 'text-violet-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Fee Verification & Checking
          {activeTab === 'verification' && <motion.div layoutId="adminFeeTabs" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />}
        </button>
      </div>

      {/* Tab 1: Structures */}
      {activeTab === 'structures' && (
        structures.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01]">
            <CardContent className="p-16 text-center text-slate-500 text-xs">
              No fee structures configured yet. Click "Add Department" to start.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Department</th>
                      <th className="p-4 text-right">Core / CH</th>
                      <th className="p-4 text-right">Elective / CH</th>
                      <th className="p-4 text-right">Compulsory / CH</th>
                      <th className="p-4 text-right">Lab Charges</th>
                      <th className="p-4 text-right">Security Deposit</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {structures.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-semibold text-white">{s.department}</td>
                        <td className="p-4 text-right text-slate-300">Rs. {fmt(s.core_per_credit)}</td>
                        <td className="p-4 text-right text-slate-300">Rs. {fmt(s.elective_per_credit)}</td>
                        <td className="p-4 text-right text-slate-300">Rs. {fmt(s.compulsory_per_credit)}</td>
                        <td className="p-4 text-right text-slate-300">Rs. {fmt(s.lab_charges)}</td>
                        <td className="p-4 text-right text-slate-300">Rs. {fmt(s.security_deposit)}</td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(s)}
                              className="h-7 px-2 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 text-[10px]">
                              <Edit3 className="w-3 h-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(s.department)}
                              className="h-7 px-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-[10px]">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Tab 2: Verification Panel */}
      {activeTab === 'verification' && (
        pendingLoading ? (
          <div className="p-16 flex justify-center"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>
        ) : pendingPayments.length === 0 ? (
          <Card className="border-white/5 bg-white/[0.01]">
            <CardContent className="p-16 text-center text-slate-500 text-xs">
              No pending Stripe payments currently require verification.
            </CardContent>
          </Card>
        ) : (
          <Card className="border-white/5 bg-white/[0.02]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="p-4">Student Info</th>
                      <th className="p-4">Semester</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4">Payment Method / ID</th>
                      <th className="p-4">Submitted Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingPayments.map(p => (
                      <tr key={p.payment_id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{p.student_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.registration_no}</div>
                        </td>
                        <td className="p-4 text-slate-300">{p.semester}</td>
                        <td className="p-4 text-right text-emerald-400 font-bold font-heading">Rs. {fmt(p.amount)}</td>
                        <td className="p-4">
                          <div className="text-white">{p.bank_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.transaction_id}</div>
                        </td>
                        <td className="p-4 text-slate-400">{new Date(p.submitted_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" onClick={() => setVerifyingId(p.payment_id)}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold">
                              Approve
                            </Button>
                            <Button size="sm" onClick={() => setRejectingId(p.payment_id)}
                              className="h-7 px-2.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold">
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Structure Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-violet-400" />
                {editing ? `Edit — ${editing.department}` : 'Add Fee Structure'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Department</label>
                <select
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  disabled={!!editing}
                  className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
                  required
                >
                  <option value="">Select department...</option>
                  {DEPARTMENTS.filter(d => editing || !structures.find(s => s.department === d)).map(d => (
                    <option key={d} value={d} className="bg-slate-900">{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Core — Per CH (Rs.)</label>
                  <Input type="number" min={0} value={form.core_per_credit}
                    onChange={e => setForm(p => ({ ...p, core_per_credit: e.target.value }))}
                    placeholder="e.g. 2350" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Elective — Per CH (Rs.)</label>
                  <Input type="number" min={0} value={form.elective_per_credit}
                    onChange={e => setForm(p => ({ ...p, elective_per_credit: e.target.value }))}
                    placeholder="e.g. 2500" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Compulsory — Per CH (Rs.)</label>
                  <Input type="number" min={0} value={form.compulsory_per_credit}
                    onChange={e => setForm(p => ({ ...p, compulsory_per_credit: e.target.value }))}
                    placeholder="e.g. 2000" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Lab Charges — Fixed (Rs.)</label>
                  <Input type="number" min={0} value={form.lab_charges}
                    onChange={e => setForm(p => ({ ...p, lab_charges: e.target.value }))}
                    placeholder="e.g. 5000" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Security Deposit (Rs.)</label>
                  <Input type="number" min={0} value={form.security_deposit}
                    onChange={e => setForm(p => ({ ...p, security_deposit: e.target.value }))}
                    placeholder="e.g. 10000" className="bg-white/5 border-white/10 text-white text-xs h-9" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}
                  className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={saving}
                  className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Structure</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Payment Approval Modal */}
      {verifyingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading flex items-center gap-2 text-white">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Approve Payment Submission
              </h3>
              <button onClick={() => setVerifyingId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleApprove} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to approve this payment? This will update the student's status to **PAID** and zero out their remaining semester fees.
              </p>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Verification Notes</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Verified transaction via Stripe" className="bg-white/5 border-white/10 text-white text-xs h-9" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setVerifyingId(null)}
                  className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={actionProcessing}
                  className="flex-1 text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  {actionProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Approval'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Payment Rejection Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0d0e1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h3 className="font-bold text-sm font-heading flex items-center gap-2 text-white">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                Reject Payment Submission
              </h3>
              <button onClick={() => setRejectingId(null)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReject} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Please provide the reason for rejecting this student's payment submission.
              </p>
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Rejection Reason</label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID could not be verified in Stripe logs"
                  className="w-full bg-white/5 border border-white/10 text-white text-xs rounded-md px-3 py-2 min-h-[80px] resize-none focus:outline-none focus:border-rose-500/50"
                  required />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="ghost" onClick={() => setRejectingId(null)}
                  className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={actionProcessing}
                  className="flex-1 text-xs h-9 bg-rose-600 hover:bg-rose-500 text-white font-semibold">
                  {actionProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function AdminFeesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#060813]"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>}>
      <AdminFeesContent />
    </Suspense>
  );
}
