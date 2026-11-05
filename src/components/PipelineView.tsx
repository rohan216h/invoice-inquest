'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  STAGE_ORDER,
  STAGE_META,
  type StageName,
  type StageResult,
} from '@/lib/engine/types';
import { GlassCard } from './GlassCard';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface PipelineViewProps {
  currentStage: StageName | null;
  stageResults: StageResult[];
  isRunning: boolean;
}

export function PipelineView({
  currentStage,
  stageResults,
  isRunning,
}: PipelineViewProps) {
  const [expandedStage, setExpandedStage] = useState<StageName | null>(null);

  // Auto-expand active or latest stage
  useEffect(() => {
    if (currentStage) {
      setExpandedStage(currentStage);
    } else if (stageResults.length > 0) {
      setExpandedStage(stageResults[stageResults.length - 1].stage);
    }
  }, [currentStage, stageResults.length]);

  const activeIndex = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;

  return (
    <div className="space-y-6">
      {/* ── Horizontal Node Stepper ─────────────────────────────── */}
      <GlassCard className="p-4 sm:p-5 overflow-x-auto">
        <div className="min-w-[650px] relative pb-2">
          {/* Connecting track line */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-slate-800 rounded-full" />

          {/* Active progress fill line */}
          <motion.div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 rounded-full"
            style={{
              width: `${(Math.max(0, stageResults.length - 1) / (STAGE_ORDER.length - 1)) * 100}%`,
            }}
            transition={{ duration: 0.4 }}
          />

          {/* Nodes */}
          <div className="relative flex justify-between items-center">
            {STAGE_ORDER.map((stageName, idx) => {
              const meta = STAGE_META[stageName];
              const result = stageResults.find((r) => r.stage === stageName);
              const isCurrent = currentStage === stageName;
              const isCompleted = !!result;

              let nodeBg = 'bg-slate-900 border-slate-700 text-slate-500';
              let ringColor = '';

              if (isCurrent) {
                nodeBg = 'bg-sky-500 border-sky-300 text-navy-950 font-bold scale-110 shadow-[0_0_20px_rgba(56,189,248,0.6)]';
                ringColor = 'ring-4 ring-sky-400/30 animate-pulse';
              } else if (isCompleted) {
                if (result.status === 'pass') {
                  nodeBg = 'bg-emerald-500 border-emerald-300 text-navy-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]';
                } else if (result.status === 'warn') {
                  nodeBg = 'bg-amber-500 border-amber-300 text-navy-950 font-bold shadow-[0_0_15px_rgba(245,158,11,0.4)]';
                } else if (result.status === 'fail') {
                  nodeBg = 'bg-rose-500 border-rose-300 text-white font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)]';
                } else {
                  nodeBg = 'bg-sky-500 border-sky-300 text-navy-950 font-bold';
                }
              }

              return (
                <div
                  key={stageName}
                  onClick={() => setExpandedStage(stageName)}
                  className="flex flex-col items-center cursor-pointer group"
                  style={{ width: `${100 / STAGE_ORDER.length}%` }}
                >
                  <motion.div
                    whileHover={{ scale: 1.15 }}
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm transition-all relative z-10 ${nodeBg} ${ringColor}`}
                  >
                    <span>{meta.emoji}</span>

                    {/* Small status indicator pip */}
                    {isCompleted && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-white/20 flex items-center justify-center">
                        {result.status === 'pass' && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                        {result.status === 'warn' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                        {result.status === 'fail' && <AlertCircle className="w-2.5 h-2.5 text-rose-400" />}
                        {result.status === 'info' && <HelpCircle className="w-2.5 h-2.5 text-sky-400" />}
                      </div>
                    )}
                  </motion.div>

                  <span
                    className={`text-[10px] mt-2 font-medium tracking-tight text-center leading-tight transition-colors ${
                      isCurrent
                        ? 'text-sky-400 font-bold'
                        : isCompleted
                        ? 'text-white'
                        : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ── Stage Feed & Auditor Personas ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Audit Stage Reasoning & Evidence Feed
          </h4>
          <span className="text-[11px] font-mono text-slate-400">
            {stageResults.length} of 10 stages finalized
          </span>
        </div>

        <div className="space-y-2.5">
          {STAGE_ORDER.map((stageName) => {
            const meta = STAGE_META[stageName];
            const result = stageResults.find((r) => r.stage === stageName);
            const isCurrent = currentStage === stageName;
            const isExpanded = expandedStage === stageName;

            if (!result && !isCurrent) {
              return null; // Don't show future unstarted stages
            }

            return (
              <motion.div
                key={stageName}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border backdrop-blur-xl transition-all overflow-hidden ${
                  isCurrent
                    ? 'bg-sky-950/30 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
                    : result?.status === 'fail'
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : result?.status === 'warn'
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-[#0f1629]/70 border-white/[0.08]'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedStage(isExpanded ? null : stageName)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg shrink-0">{meta.emoji}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          • {meta.persona}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">
                        {isCurrent ? (
                          <span className="text-sky-400 animate-pulse font-medium">
                            Analyzing invoice parameters...
                          </span>
                        ) : (
                          result?.headline
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {result && (
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {result.durationMs.toFixed(0)}ms
                      </span>
                    )}

                    {result ? (
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          result.status === 'pass'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : result.status === 'warn'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : result.status === 'fail'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        }`}
                      >
                        {result.status}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-sky-400 animate-pulse">
                        Active...
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && result && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-3"
                    >
                      {/* Reasoning text */}
                      <div className="p-3 rounded-lg bg-slate-900/80 border border-white/[0.04]">
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {result.reasoning}
                        </p>
                      </div>

                      {/* Evidence Chips */}
                      {result.evidence.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono uppercase text-slate-400">
                            Auditor Evidence Trail
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {result.evidence.map((ev, i) => {
                              const badgeStyle =
                                ev.type === 'positive'
                                  ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-300'
                                  : ev.type === 'negative'
                                  ? 'bg-rose-950/50 border-rose-500/30 text-rose-300'
                                  : 'bg-slate-900/60 border-white/[0.08] text-slate-300';

                              return (
                                <div
                                  key={i}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono flex items-center gap-1.5 ${badgeStyle}`}
                                >
                                  <span className="text-slate-400 font-sans">{ev.label}:</span>
                                  <span className="font-semibold">{ev.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
