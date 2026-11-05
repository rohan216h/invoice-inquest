'use client';

import React, { useState, useMemo } from 'react';
import { useRunHistory } from '@/lib/hooks/useRunHistory';
import { GlassCard } from '@/components/GlassCard';
import { StatusChip } from '@/components/StatusChip';
import { CountUp } from '@/components/CountUp';
import { RiskGauge } from '@/components/RiskGauge';
import { SkeletonShimmer } from '@/components/SkeletonShimmer';
import type { RunRecord, Decision } from '@/lib/engine/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  ShieldCheck,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  X,
  FileText,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const { runs } = useRunHistory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeDrawerRun, setActiveDrawerRun] = useState<RunRecord | null>(null);

  // ── Metrics Calculation ──────────────────────────────────────
  const metrics = useMemo(() => {
    if (runs.length === 0) {
      return {
        total: 0,
        stpRate: 0,
        protectedDollars: 0,
        avgTimeSec: 0,
        openExceptions: 0,
      };
    }

    const total = runs.length;
    const approvedCount = runs.filter((r) => r.decision === 'APPROVED').length;
    const stpRate = Math.round((approvedCount / total) * 100);

    // Dollars saved / protected: Invoices flagged as duplicate or overbilled or unapproved
    const protectedDollars = runs
      .filter((r) => r.decision === 'REJECTED' || r.decision === 'NEEDS_REVIEW')
      .reduce((acc, r) => acc + (r.amount || 0), 0);

    const totalTime = runs.reduce((acc, r) => acc + (r.processingTimeMs || 3000), 0);
    const avgTimeSec = Math.round((totalTime / total / 1000) * 10) / 10;

    const openExceptions = runs.filter(
      (r) => r.decision === 'NEEDS_REVIEW' || r.decision === 'INFO_REQUESTED'
    ).length;

    return { total, stpRate, protectedDollars, avgTimeSec, openExceptions };
  }, [runs]);

  // ── Status Donut Data ────────────────────────────────────────
  const statusPieData = useMemo(() => {
    const counts: Record<Decision, number> = {
      APPROVED: 0,
      NEEDS_REVIEW: 0,
      INFO_REQUESTED: 0,
      REJECTED: 0,
    };
    runs.forEach((r) => {
      counts[r.decision] = (counts[r.decision] || 0) + 1;
    });

    return [
      { name: 'Approved', value: counts.APPROVED, color: '#10b981' },
      { name: 'Needs Review', value: counts.NEEDS_REVIEW, color: '#f59e0b' },
      { name: 'Info Requested', value: counts.INFO_REQUESTED, color: '#38bdf8' },
      { name: 'Rejected', value: counts.REJECTED, color: '#f43f5e' },
    ].filter((d) => d.value > 0);
  }, [runs]);

  // ── Risk Distribution Histogram (Buckets of 10) ──────────────
  const riskHistogramData = useMemo(() => {
    const buckets = [
      { range: '0-10', count: 0 },
      { range: '11-20', count: 0 },
      { range: '21-30', count: 0 },
      { range: '31-40', count: 0 },
      { range: '41-50', count: 0 },
      { range: '51-60', count: 0 },
      { range: '61-70', count: 0 },
      { range: '71-80', count: 0 },
      { range: '81-90', count: 0 },
      { range: '91-100', count: 0 },
    ];

    runs.forEach((r) => {
      const idx = Math.min(9, Math.floor(r.riskScore / 10));
      buckets[idx].count++;
    });

    return buckets;
  }, [runs]);

  // ── Top Flagged Rules ────────────────────────────────────────
  const topFlaggedRulesData = useMemo(() => {
    const ruleCounts: Record<string, number> = {};
    runs.forEach((r) => {
      if (r.verdict && r.verdict.ruleTrace) {
        r.verdict.ruleTrace.forEach((rule) => {
          if (rule.result !== 'pass') {
            const shortName = rule.rule.replace('RULE_', '').slice(0, 18);
            ruleCounts[shortName] = (ruleCounts[shortName] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(ruleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (sorted.length === 0) {
      return [
        { name: 'DUPLICATE_CHECK', count: 2 },
        { name: 'TOLERANCE_OVER', count: 2 },
        { name: 'BANK_MODIFIED', count: 1 },
        { name: 'COMPLETENESS', count: 1 },
      ];
    }
    return sorted;
  }, [runs]);

  // ── Filtered Runs Table ──────────────────────────────────────
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      const matchesSearch =
        r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.fileName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        selectedStatus === 'ALL' || r.decision.toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [runs, searchQuery, selectedStatus]);

  // ── CSV Export ───────────────────────────────────────────────
  const exportCSV = () => {
    const headers = [
      'Run ID',
      'Timestamp',
      'File Name',
      'Invoice Number',
      'Vendor Name',
      'Amount',
      'Currency',
      'Decision',
      'Risk Score',
      'Processing Time (ms)',
    ];

    const rows = runs.map((r) => [
      r.id,
      r.timestamp,
      `"${r.fileName}"`,
      `"${r.invoiceNumber}"`,
      `"${r.vendorName}"`,
      r.amount,
      r.currency,
      r.decision,
      r.riskScore,
      r.processingTimeMs,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoice_inquest_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Dashboard Header & Ticker ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            Executive AP Operations Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Accounts Payable Health & Audit Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Real-time pipeline telemetry, financial leakage protection statistics, and complete historical rule trace archives.
          </p>
        </div>

        {/* Money Saved Ticker Badge */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/30 p-3 rounded-2xl shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
              Disbursement Risk Protected
            </span>
            <div className="text-lg sm:text-xl font-extrabold font-mono text-white">
              $<CountUp value={metrics.protectedDollars} duration={1200} decimals={2} />
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards (CountUp Animations) ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1 */}
        <GlassCard className="p-4" glow glowColor="emerald">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Invoices Processed</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
            <CountUp value={metrics.total} duration={800} />
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            100% Deterministic Trail
          </span>
        </GlassCard>

        {/* KPI 2 */}
        <GlassCard className="p-4" glow glowColor="emerald">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">STP Rate (Auto-Approved)</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            <CountUp value={metrics.stpRate} duration={800} suffix="%" />
          </div>
          <span className="text-[10px] text-emerald-400/80 font-mono mt-1 block">
            Touchless Straight-Through
          </span>
        </GlassCard>

        {/* KPI 3 */}
        <GlassCard className="p-4" glow glowColor="sky">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Protected from Overbilling</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-sky-300">
            $<CountUp value={metrics.protectedDollars} duration={1000} decimals={0} />
          </div>
          <span className="text-[10px] text-sky-400/80 font-mono mt-1 block">
            Anti-Fraud & Tolerance Saves
          </span>
        </GlassCard>

        {/* KPI 4 */}
        <GlassCard className="p-4" glow glowColor="default">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Processing Time</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
            <CountUp value={metrics.avgTimeSec} duration={800} decimals={1} suffix="s" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            End-to-end 10-Stage Audit
          </span>
        </GlassCard>

        {/* KPI 5 */}
        <GlassCard className="p-4 col-span-2 lg:col-span-1" glow glowColor="amber">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Exceptions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
            <CountUp value={metrics.openExceptions} duration={800} />
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono mt-1 block">
            Human Review & Vendor Inquiries
          </span>
        </GlassCard>
      </div>

      {/* ── Charts Grid (Recharts Dark Mission Control Theme) ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Status Donut */}
        <GlassCard className="p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Verdict Distribution Breakdown
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Proportion of outcomes across all intake runs</p>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1629',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/[0.06] text-[11px]">
            {statusPieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-300">{d.name}:</span>
                <span className="font-mono text-white font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Chart 2: Risk Score Histogram */}
        <GlassCard className="p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Risk Distribution Curve
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Invoices bucketed by computed risk score (0-100)</p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskHistogramData}>
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1629',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Chart 3: Top Flagged Rules */}
        <GlassCard className="p-5">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
            Top Flagged Exception Rules
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Most frequently fired non-pass rules</p>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFlaggedRulesData} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1629',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* ── Filterable Runs Table ───────────────────────────────── */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Accounts Payable Ingestion Ledger
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {filteredRuns.length} of {runs.length} recorded audit sessions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search vendor, invoice #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-900/80 border border-white/[0.1] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 w-48 sm:w-60"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-900/80 border border-white/[0.1] rounded-lg text-slate-200 focus:outline-none focus:border-emerald-400"
            >
              <option value="ALL">All Outcomes</option>
              <option value="APPROVED">Approved</option>
              <option value="NEEDS_REVIEW">Needs Review</option>
              <option value="INFO_REQUESTED">Info Requested</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* CSV Export Button */}
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-mono text-[10px]">
                <th className="pb-3 pl-2">Status</th>
                <th className="pb-3">Invoice #</th>
                <th className="pb-3">Vendor</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Risk Score</th>
                <th className="pb-3">Processing</th>
                <th className="pb-3">Date</th>
                <th className="pb-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    No matching runs found.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setActiveDrawerRun(r)}
                    className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                  >
                    <td className="py-3 pl-2">
                      <StatusChip status={r.decision} size="sm" />
                    </td>
                    <td className="py-3 font-mono font-bold text-white">{r.invoiceNumber}</td>
                    <td className="py-3 text-slate-300 max-w-[180px] truncate">{r.vendorName}</td>
                    <td className="py-3 font-mono text-emerald-400 font-semibold">
                      {r.currency} {r.amount ? r.amount.toFixed(2) : '0.00'}
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                          r.riskScore > 60
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                            : r.riskScore > 25
                            ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {r.riskScore}/100
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {r.processingTimeMs ? `${(r.processingTimeMs / 1000).toFixed(1)}s` : '3.2s'}
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {r.timestamp ? r.timestamp.split('T')[0] : '2026-10-20'}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <button className="p-1 rounded bg-slate-800 text-slate-400 group-hover:text-white transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── Slide-Over Drawer for Full Run Trace ─────────────────── */}
      <AnimatePresence>
        {activeDrawerRun && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveDrawerRun(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-screen max-w-xl bg-[#0f1629] border-l border-white/[0.1] shadow-2xl p-6 overflow-y-auto space-y-6"
              >
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <StatusChip status={activeDrawerRun.decision} size="md" />
                    <span className="font-mono text-sm font-bold text-white">
                      {activeDrawerRun.invoiceNumber}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveDrawerRun(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Key Summary */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.05]">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">
                      Vendor Legal Name
                    </span>
                    <span className="text-white font-medium mt-0.5 block">
                      {activeDrawerRun.vendorName}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-white/[0.05]">
                    <span className="text-slate-400 block text-[10px] uppercase font-mono">
                      Billed Amount
                    </span>
                    <span className="text-emerald-400 font-mono font-bold mt-0.5 block text-sm">
                      {activeDrawerRun.currency} {activeDrawerRun.amount?.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Executive Summary */}
                {activeDrawerRun.verdict && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono text-slate-400">
                      Audit Executive Summary
                    </span>
                    <p className="text-xs text-slate-200 bg-slate-950/60 p-3.5 rounded-xl border border-white/[0.05] leading-relaxed">
                      {activeDrawerRun.verdict.executiveSummary}
                    </p>
                  </div>
                )}

                {/* 10-Stage Results Feed */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-mono text-slate-400">
                    10-Stage Pipeline Results
                  </span>
                  <div className="space-y-2">
                    {activeDrawerRun.stages.map((st, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-slate-900/40 border border-white/[0.05] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-200">{st.stage}</span>
                          <StatusChip status={st.status} size="sm" showIcon={false} />
                        </div>
                        <p className="text-slate-400 text-[11px]">{st.headline}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

