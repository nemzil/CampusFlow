'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getMyFeeVoucher, submitPayment } from '@/lib/api';
import { DollarSign, Loader2, AlertCircle, FileText, Building, Download, CreditCard, CheckCircle, Clock, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

export default function StudentFeesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stripe Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'STUDENT')) router.push('/login');
    else if (!authLoading && user) load();
  }, [user, authLoading]);

  const load = async () => {
    setLoading(true);
    try { setVoucher(await getMyFeeVoucher()); }
    catch (e) { showError(e.message || 'Failed to load fee voucher'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => (n || 0).toLocaleString();

  const downloadVoucherPDF = () => {
    if (!voucher) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Voucher - ${voucher.registration_no}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #5b21b6; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #5b21b6; }
            .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .info-item { font-size: 14px; }
            .info-label { font-weight: 600; color: #4b5563; text-transform: uppercase; font-size: 11px; }
            .info-val { font-size: 14px; font-weight: 700; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px; }
            th { background: #f3f4f6; color: #374151; font-weight: 600; text-transform: uppercase; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .summary-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; width: 300px; margin-left: auto; }
            .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 10px; }
            .total-row { border-top: 1px solid #e5e7eb; pt: 10px; font-weight: bold; font-size: 16px; color: #5b21b6; margin-top: 10px; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CampusFlow SSUET Portal</div>
            <h2>Semester Fee Voucher</h2>
          </div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Student Name</div><div class="info-val">${voucher.student_name}</div></div>
            <div class="info-item"><div class="info-label">Registration No</div><div class="info-val">${voucher.registration_no}</div></div>
            <div class="info-item"><div class="info-label">Department</div><div class="info-val">${voucher.department}</div></div>
            <div class="info-item"><div class="info-label">Semester</div><div class="info-val">Semester ${voucher.semester}</div></div>
          </div>
          
          <h3>Course Breakdown</h3>
          <table>
            <thead>
              <tr>
                <th>Course</th>
                <th>Type</th>
                <th>CH</th>
                <th>Rate / CH</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(voucher.line_items || []).map(item => `
                <tr>
                  <td><strong>${item.course_code}</strong> - ${item.course_name}</td>
                  <td>${item.course_type}</td>
                  <td>${item.credit_hours}</td>
                  <td>Rs. ${item.rate_per_credit.toLocaleString()}</td>
                  <td>Rs. ${item.subtotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-card">
            <div class="summary-row"><span>Core Courses Total:</span><span>Rs. ${voucher.summary.core_total.toLocaleString()}</span></div>
            <div class="summary-row"><span>Elective Courses Total:</span><span>Rs. ${voucher.summary.elective_total.toLocaleString()}</span></div>
            <div class="summary-row"><span>Compulsory Courses Total:</span><span>Rs. ${voucher.summary.compulsory_total.toLocaleString()}</span></div>
            <div class="summary-row"><span>Lab Charges:</span><span>Rs. ${voucher.summary.lab_charges.toLocaleString()}</span></div>
            <div class="summary-row"><span>Security Deposit:</span><span>Rs. ${voucher.summary.security_deposit.toLocaleString()}</span></div>
            <div class="total-row"><span>Grand Total:</span><span>Rs. ${voucher.summary.grand_total.toLocaleString()}</span></div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleStripePay = async (e) => {
    e.preventDefault();
    if (cardNumber.length < 16) {
      showError('Invalid Card Number. Must be 16 digits.');
      return;
    }
    setPaying(true);
    try {
      // Simulate contact with Stripe payment server
      await new Promise(resolve => setTimeout(resolve, 2000));

      const payload = {
        student_id: voucher.student_id || user.id || user._id,
        semester: String(voucher.semester),
        receipt_url: `https://stripe.com/receipt/mock-ch_stripe_${Math.random().toString(36).substring(7)}`,
        payment_date: new Date().toISOString(),
        bank_name: 'Stripe Secure Checkout',
        transaction_id: `ch_stripe_${Math.random().toString(36).substring(7).toUpperCase()}`,
      };

      await submitPayment(payload);
      showSuccess('Payment processed via Stripe! Awaiting Admin verification.');
      setShowPaymentModal(false);
      await load();
    } catch (err) {
      showError(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#060813]"><Loader2 className="w-10 h-10 text-violet-500 animate-spin" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge variant="outline" className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-2">Fee Voucher</Badge>
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-violet-400" />Semester Fee Voucher
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Your fee breakdown based on enrolled courses and department structure.</p>
        </div>
        {voucher && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button onClick={downloadVoucherPDF} className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold h-9 border border-white/10">
              <Download className="w-4 h-4 mr-1.5" />Download
            </Button>
            {voucher.status !== 'paid' && voucher.status !== 'pending_verification' && voucher.summary.grand_total > 0 && (
              <Button onClick={() => setShowPaymentModal(true)} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold h-9 shadow-lg shadow-violet-500/20">
                <CreditCard className="w-4 h-4 mr-1.5" />Pay Online
              </Button>
            )}
          </div>
        )}
      </div>

      {!voucher ? (
        <Card className="border-white/5 bg-white/[0.01]">
          <CardContent className="p-16 text-center text-slate-500 text-xs">No fee data available.</CardContent>
        </Card>
      ) : (
        <>
          {/* Status Alert Banners */}
          {voucher.status === 'paid' && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-bold text-sm">Payment Verified</p>
                <p className="text-emerald-400/80 mt-0.5">Your fee has been verified and processed by the admin. Remaining balance is Rs. 0.</p>
              </div>
            </div>
          )}

          {voucher.status === 'pending_verification' && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
              <Clock className="w-4 h-4 shrink-0 animate-pulse" />
              <div>
                <p className="font-bold text-sm">Awaiting Verification</p>
                <p className="text-amber-400/80 mt-0.5">Your payment is currently under review by the finance department.</p>
              </div>
            </div>
          )}

          {voucher.status === 'rejected' && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-bold text-sm">Payment Rejected</p>
                <p className="text-rose-400/80 mt-0.5">Your payment submission was rejected. Reason: {voucher.rejection_reason || 'Incomplete details'}</p>
              </div>
            </div>
          )}

          {/* Student Info */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardContent className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Name', value: voucher.student_name },
                { label: 'Reg No', value: voucher.registration_no },
                { label: 'Department', value: voucher.department },
                { label: 'Semester', value: `Semester ${voucher.semester}` },
              ].map((f, i) => (
                <div key={i}>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{f.value || '—'}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* No fee structure warning */}
          {!voucher.fee_structure_found && (
            <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/15 rounded-xl text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              No fee structure configured for your department yet. Contact admin.
            </div>
          )}

          {/* Course Breakdown */}
          {voucher.line_items?.length > 0 && (
            <Card className="border-white/5 bg-white/[0.02]">
              <CardContent className="p-0">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <h2 className="font-bold text-sm">Course Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="p-3 text-left">Course</th>
                        <th className="p-3 text-left">Type</th>
                        <th className="p-3 text-center">CH</th>
                        <th className="p-3 text-right">Rate / CH</th>
                        <th className="p-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {voucher.line_items.map((item, i) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="p-3">
                            <span className="font-mono text-[10px] text-violet-400 block">{item.course_code}</span>
                            <span className="text-white">{item.course_name}</span>
                          </td>
                          <td className="p-3 capitalize text-slate-400">{item.course_type}</td>
                          <td className="p-3 text-center text-slate-300">{item.credit_hours}</td>
                          <td className="p-3 text-right text-slate-300">Rs. {fmt(item.rate_per_credit)}</td>
                          <td className="p-3 text-right font-semibold text-white">Rs. {fmt(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fee Summary */}
          <Card className="border-white/5 bg-white/[0.03]">
            <CardContent className="p-0">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Building className="w-4 h-4 text-violet-400" />
                <h2 className="font-bold text-sm">Fee Summary</h2>
              </div>
              <div className="p-4 space-y-3">
                {[
                  { label: 'Core Courses Total', value: voucher.summary.core_total },
                  { label: 'Elective Courses Total', value: voucher.summary.elective_total },
                  { label: 'Compulsory Courses Total', value: voucher.summary.compulsory_total },
                  { label: 'Lab Charges', value: voucher.summary.lab_charges },
                  { label: 'Security Deposit', value: voucher.summary.security_deposit },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{row.label}</span>
                    <span className="text-white font-semibold">Rs. {fmt(row.value)}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-white">Grand Total</span>
                  <span className="text-lg font-extrabold text-violet-400">Rs. {fmt(voucher.summary.grand_total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Stripe Payment Modal */}
      {showPaymentModal && voucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0a0b14] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h3 className="font-bold text-sm font-heading flex items-center gap-2 text-white">
                  <CreditCard className="w-4 h-4 text-violet-400" />
                  Stripe Secure Checkout
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Amount due: Rs. {fmt(voucher.summary.grand_total)}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleStripePay} className="p-5 space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Cardholder Name</label>
                <Input value={cardName} onChange={e => setCardName(e.target.value)}
                  placeholder="e.g. John Doe" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
              </div>
              
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Card Number</label>
                <div className="relative">
                  <Input value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                    placeholder="1234 5678 1234 5678" className="bg-white/5 border-white/10 text-white text-xs h-9 pl-9" required />
                  <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">Expiration Date</label>
                  <Input value={cardExpiry} onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
                    setCardExpiry(v);
                  }}
                    placeholder="MM/YY" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1">CVC</label>
                  <Input value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    placeholder="123" className="bg-white/5 border-white/10 text-white text-xs h-9" required />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowPaymentModal(false)}
                  className="flex-1 text-xs h-9 text-slate-400 border border-white/10">Cancel</Button>
                <Button type="submit" disabled={paying}
                  className="flex-1 text-xs h-9 bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center justify-center gap-1.5">
                  {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CreditCard className="w-3.5 h-3.5" />Pay Rs. {fmt(voucher.summary.grand_total)}</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
