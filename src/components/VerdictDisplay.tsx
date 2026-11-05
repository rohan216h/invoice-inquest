'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Verdict } from '@/lib/engine/types';
import { GlassCard } from './GlassCard';
import { RiskGauge } from './RiskGauge';
import { StatusChip } from './StatusChip';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Mail,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  GitCompare,
  FileCheck,
} from 'lucide-react';

interface VerdictDisplayProps {
  verdict: Verdict;
  onRerun?: () => void;
}

export function VerdictDisplay({ verdict, onRerun }: VerdictDisplayProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Trigger celebratory confetti if APPROVED
  useEffect(() => {
    if (verdict.decision === 'APPROVED') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8'],
      });
    }
  }, [verdict.decision]);

  const copyEmail = () => {
    if (verdict.emailDraft) {
      navigator.clipboard.writeText(verdict.emailDraft);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  const stampStyles = {
    APPROVED: 'text-emerald-400 border-emerald-400 bg-emerald-950/40 shadow-[0_0_50px_rgba(16,185,129,0.3)]',
    NEEDS_REVIEW: 'text-amber-400 border-amber-400 bg-amber-950/40 shadow-[0_0_50px_rgba(245,158,11,0.3)]',
    INFO_REQUESTED: 'text-sky-400 border-sky-400 bg-sky-950/40 shadow-[0_0_50px_rgba(56,189,248,0.3)]',
    REJECTED: 'text-rose-400 border-rose-400 bg-rose-950/40 shadow-[0_0_50px_rgba(244,63,94,0.4)] animate-pulse',
  }[verdict.decision];

  const stampLabel = {
    APPROVED: 'APPROVED',
    NEEDS_REVIEW: 'NEEDS REVIEW',
    INFO_REQUESTED: 'INFO REQUESTED',
    REJECTED: 'REJECTED',
  }[verdict.decision];

  return (
    <div className="space-y-6">
      {/* ── Big Rubber Stamp & Summary Card ────────────────────── */}
      <GlassCard className="p-6 overflow-hidden relative border-white/[0.12]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Rubber Stamp Moment */}
          <div className="flex flex-col items-center justify-center py-4 lg:w-1/3">
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: -4 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 18,
                delay: 0.1,
              }}
              className={`border-4 border-dashed rounded-2xl px-6 py-4 uppercase font-black tracking-widest text-2xl sm:text-3xl text-center select-none ${stampStyles}`}
            >
              {stampLabel}
            </motion.div>

            <span className="text-[11px] font-mono text-slate-400 mt-3 tracking-wider">
              Deterministic AP Verdict
            </span>
          </div>

          {/* Middle: Risk Gauge */}
          <div className="lg:w-1/3 flex justify-center border-y lg:border-y-0 lg:border-x border-white/[0.08] py-4 lg:py-0">
            <RiskGauge score={verdict.riskScore} size={190} />
          </div>

          {/* Right: Confidence & Recommended Action */}
          <div className="lg:w-1/3 space-y-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                System Confidence
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 rounded-full"
                    style={{ width: `${Math.round(verdict.confidence * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-bold text-white">
                  {(verdict.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Recommended Action
              </span>
              <p className="text-xs text-slate-200 mt-1 font-medium bg-slate-900/60 p-2.5 rounded-lg border border-white/[0.05]">
                {verdict.recommendedAction}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary paragraph */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
            Executive AP Audit Summary
          </span>
          <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/40 p-4 rounded-xl border border-white/[0.04]">
            {verdict.executiveSummary}
          </p>
        </div>
      </GlassCard>

      {/* ── Special Panel for INFO_REQUESTED: Vendor Email Draft ─── */}
      {verdict.decision === 'INFO_REQUESTED' && verdict.emailDraft && (
        <GlassCard className="p-5 border-sky-500/30 bg-sky-950/20">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-500/20">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <Mail className="w-4 h-4" />
              <span>Auto-Drafted Vendor Clarification Request</span>
            </div>
            <button
              onClick={copyEmail}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold border border-sky-500/30 transition-colors"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmail ? 'Copied to Clipboard!' : 'Copy Email Draft'}</span>
            </button>
          </div>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-950/80 p-4 rounded-xl border border-white/[0.06] overflow-x-auto leading-relaxed">
            {verdict.emailDraft}
          </pre>
        </GlassCard>
      )}

      {/* ── Special Panel for DUPLICATES: Side-by-Side Comparison ── */}
      {verdict.duplicateComparison && (
        <GlassCard className="p-5 border-rose-500/30 bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-4">
            <GitCompare className="w-4 h-4" />
            <span>Anti-Fraud Duplicate Investigation: Side-by-Side Evidence</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Submission */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
                Current Submission (Being Audited)
              </h5>
              {Object.entries(verdict.duplicateComparison.current).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-white/[0.03]">
                  <span className="text-slate-400">{k}:</span>
                  <span className="font-mono text-white font-medium">{v}</span>
                </div>
              ))}
            </div>

            {/* Previously Cleared Invoice */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-white/[0.08] space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
                Previously Cleared Historical Invoice
              </h5>
              {Object.entries(verdict.duplicateComparison.prior).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs py-1 border-b border-white/[0.03]">
                  <span className="text-slate-400">{k}:</span>
                  <span className="font-mono text-rose-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-white/[0.05]">
            <p className="text-xs text-rose-300 font-mono">
              Differences Identified:{' '}
              {verdict.duplicateComparison.differences.join(' • ')}
            </p>
          </div>
        </GlassCard>
      )}

      {/* ── Rule Trace Table ────────────────────────────────────── */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Deterministic Rule Execution Trace
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {verdict.ruleTrace.length} rules fired
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-mono text-[10px]">
                <th className="pb-2 pl-2">Rule Identifier</th>
                <th className="pb-2">Result</th>
                <th className="pb-2">Risk Weight</th>
                <th className="pb-2 pr-2">Evidence / Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {verdict.ruleTrace.map((rule, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 pl-2 font-mono text-slate-300 font-semibold text-[11px]">
                    {rule.rule}
                  </td>
                  <td className="py-2.5">
                    <StatusChip status={rule.result} size="sm" showIcon={false} />
                  </td>
                  <td className="py-2.5 font-mono text-slate-400">
                    {rule.weight > 0 ? `+${rule.weight}` : '0'}
                  </td>
                  <td className="py-2.5 pr-2 text-slate-300 font-sans leading-relaxed">
                    {rule.evidence}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
