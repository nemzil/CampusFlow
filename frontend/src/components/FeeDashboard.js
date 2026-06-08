'use client';

import { useEffect, useState } from 'react';
import { getFeeDashboardStats, downloadFeeStatement } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { motion } from 'framer-motion';
import { 
  DollarSign, Download, Calendar, BarChart3, TrendingUp, 
  TrendingDown, Users, FileSpreadsheet, Loader2, Sparkles, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

export default function FeeDashboard() {
  const { showSuccess, showError } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Statement export states
  const [selectedYearMonthly, setSelectedYearMonthly] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  
  const [selectedYearYearly, setSelectedYearYearly] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getFeeDashboardStats();
      setStats(data);
    } catch (e) {
      showError(e.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMonthly = async () => {
    setDownloading(true);
    try {
      await downloadFeeStatement('monthly', parseInt(selectedYearMonthly), parseInt(selectedMonth));
      showSuccess(`Monthly statement for ${MONTHS.find(m => m.value === parseInt(selectedMonth))?.label} ${selectedYearMonthly} downloaded!`);
    } catch (e) {
      showError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadYearly = async () => {
    setDownloading(true);
    try {
      await downloadFeeStatement('yearly', parseInt(selectedYearYearly));
      showSuccess(`Yearly statement for ${selectedYearYearly} downloaded!`);
    } catch (e) {
      showError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const fmt = (num) => num?.toLocaleString() ?? '0';

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
        <p className="text-slate-400 text-xs font-medium animate-pulse">Loading finance metrics...</p>
      </div>
    );
  }

  const { total_fees, total_collected, total_pending, monthly_revenue, yearly_revenue } = stats || {};
  
  const maxMonthly = Math.max(...(monthly_revenue?.map(d => d.revenue) || [0]), 100000);
  const maxYearly = Math.max(...(yearly_revenue?.map(d => d.revenue) || [0]), 100000);

  const collectionRate = total_fees > 0 ? ((total_collected / total_fees) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Collected */}
        <motion.div whileHover={{ y: -4 }} className="h-full">
          <Card className="glass-card h-full border-emerald-500/10 bg-emerald-500/[0.02] overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Collected Revenue</span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-emerald-400 font-heading">
                Rs. {fmt(total_collected)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Cleared stripe payments verified by accounts.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Total Pending */}
        <motion.div whileHover={{ y: -4 }} className="h-full">
          <Card className="glass-card h-full border-amber-500/10 bg-amber-500/[0.02] overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Pending / Outstanding</span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-amber-400 font-heading">
                Rs. {fmt(total_pending)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">Pending student balances & unverified slips.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Collection Rate */}
        <motion.div whileHover={{ y: -4 }} className="h-full">
          <Card className="glass-card h-full border-violet-500/10 bg-violet-500/[0.02] overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-violet-500 opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Collection Efficiency</span>
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-violet-400 font-heading">
                {collectionRate}%
              </h2>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  style={{ width: `${collectionRate}%` }} 
                  className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-1000"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-2 glass-card border-white/5 bg-transparent overflow-hidden">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between border-b border-white/5">
            <div>
              <CardTitle className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                Monthly Revenue ({new Date().getFullYear()})
              </CardTitle>
              <p className="text-[10px] text-slate-400">Total verified income grouped by payment date</p>
            </div>
            <Badge variant="outline" className="badge-violet text-[10px] font-mono">Current Year</Badge>
          </CardHeader>
          <CardContent className="p-5">
            {/* Visual Bar Chart */}
            <div className="flex h-56 items-end justify-between gap-1.5 pt-6 select-none relative">
              {/* Backing Guidelines */}
              <div className="absolute inset-x-0 top-6 h-[1px] bg-white/[0.03]" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/[0.03]" />
              <div className="absolute inset-x-0 bottom-6 h-[1px] bg-white/[0.03]" />

              {monthly_revenue?.map((d, i) => {
                const heightPercent = maxMonthly > 0 ? (d.revenue / maxMonthly) * 80 : 0; // scale to max 80% to fit tooltips
                return (
                  <div key={i} className="flex flex-col items-center flex-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 scale-0 group-hover:scale-100 transition-all bg-[#0a0b15] border border-violet-500/30 rounded px-1.5 py-0.5 text-[9px] text-white z-20 pointer-events-none whitespace-nowrap shadow-lg">
                      Rs. {fmt(d.revenue)}
                    </div>
                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      className="w-full bg-gradient-to-t from-violet-600/40 to-violet-500 rounded-t-sm group-hover:from-violet-500 group-hover:to-cyan-400 transition-all duration-300 relative"
                    >
                      <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Label */}
                    <span className="text-[9px] text-slate-400 mt-2 font-mono font-semibold">{d.month}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Yearly Revenue Chart */}
        <Card className="glass-card border-white/5 bg-transparent overflow-hidden">
          <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between border-b border-white/5">
            <div>
              <CardTitle className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Yearly Growth
              </CardTitle>
              <p className="text-[10px] text-slate-400">Total collections tracked by financial year</p>
            </div>
            <Badge variant="outline" className="badge-cyan text-[10px] font-mono">All Time</Badge>
          </CardHeader>
          <CardContent className="p-5">
            {/* Visual Bar Chart */}
            <div className="flex h-56 items-end justify-around gap-4 pt-6 select-none relative">
              {/* Backing Guidelines */}
              <div className="absolute inset-x-0 top-6 h-[1px] bg-white/[0.03]" />
              <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/[0.03]" />
              <div className="absolute inset-x-0 bottom-6 h-[1px] bg-white/[0.03]" />

              {yearly_revenue?.map((d, i) => {
                const heightPercent = maxYearly > 0 ? (d.revenue / maxYearly) * 80 : 0;
                return (
                  <div key={i} className="flex flex-col items-center w-16 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-8 scale-0 group-hover:scale-100 transition-all bg-[#0a0b15] border border-cyan-500/30 rounded px-1.5 py-0.5 text-[9px] text-white z-20 pointer-events-none whitespace-nowrap shadow-lg">
                      Rs. {fmt(d.revenue)}
                    </div>
                    {/* Bar */}
                    <div 
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      className="w-full bg-gradient-to-t from-cyan-600/40 to-cyan-500 rounded-t-sm group-hover:from-cyan-500 group-hover:to-violet-400 transition-all duration-300 relative"
                    >
                      <div className="absolute inset-0 bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {/* Label */}
                    <span className="text-[9px] text-slate-400 mt-2 font-mono font-semibold">{d.year}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statement Exporter Panel */}
      <Card className="glass-card border-white/5 bg-transparent overflow-hidden">
        <CardHeader className="p-5 border-b border-white/5">
          <CardTitle className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Financial Statements Exporter
          </CardTitle>
          <p className="text-[10px] text-slate-400">Download formatted ledger sheets in CSV containing registration numbers, student profiles, and transaction IDs.</p>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Export Form */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  Monthly Account Ledger
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Export transaction statements for a specific month.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[100px]">
                  <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10 text-white">
                      <SelectValue placeholder="Select Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map(m => (
                        <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Year</label>
                  <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={selectedYearMonthly}
                    onChange={e => setSelectedYearMonthly(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background/50 border border-white/10 px-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <Button 
                  onClick={handleDownloadMonthly} 
                  disabled={downloading}
                  className="h-8 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold px-3 shrink-0 self-end"
                >
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Yearly Export Form */}
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  Annual Ledger Statement
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">Export transaction statements for a complete calendar year.</p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-auto">
                <div className="flex-1">
                  <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Year</label>
                  <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={selectedYearYearly}
                    onChange={e => setSelectedYearYearly(e.target.value)}
                    className="w-full h-8 rounded-lg bg-background/50 border border-white/10 px-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <Button 
                  onClick={handleDownloadYearly} 
                  disabled={downloading}
                  className="h-8 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold px-3 shrink-0 self-end"
                >
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                  Export CSV
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
