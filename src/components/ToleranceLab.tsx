'use client';

import React, { useState, useEffect } from 'react';
import type { PipelineConfig, Verdict } from '@/lib/engine/types';
import { GlassCard } from './GlassCard';
import { StatusChip } from './StatusChip';
import { Sliders, RefreshCw, ArrowRight, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToleranceLabProps {
  currentConfig: PipelineConfig;
  currentVerdict: Verdict | null;
  onConfigChange: (newConfig: PipelineConfig) => void;
  disabled?: boolean;
}

export function ToleranceLab({
  currentConfig,
  currentVerdict,
  onConfigChange,
  disabled = false,
}: ToleranceLabProps) {
  const [localConfig, setLocalConfig] = useState<PipelineConfig>(currentConfig);
  const [previousDecision, setPreviousDecision] = useState<string | null>(null);
  const [lastCalculatedMs, setLastCalculatedMs] = useState<number>(2);

  // Keep local config in sync with parent updates
  useEffect(() => {
    setLocalConfig(currentConfig);
  }, [currentConfig]);

  const handleSliderChange = (key: keyof PipelineConfig, val: number) => {
    const t0 = performance.now();
    const updated = { ...localConfig, [key]: val };
    setLocalConfig(updated);
    if (currentVerdict) {
      setPreviousDecision(currentVerdict.decision);
    }
    onConfigChange(updated);
    const dt = Math.max(1, Math.round(performance.now() - t0));
    setLastCalculatedMs(dt);
  };

  const resetDefaults = () => {
    const def: PipelineConfig = {
      amountTolerancePercent: 2,
      amountToleranceAbsolute: 2000,
      duplicateSensitivity: 0.7,
      poMatchConfidenceThreshold: 0.6,
      extractionConfidenceThreshold: 0.5,
    };
    setLocalConfig(def);
    onConfigChange(def);
  };

  const isApproved = currentVerdict?.decision === 'APPROVED';

  return (
    <GlassCard className="p-5 border-white/[0.12] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.08] gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Tolerance & Sensitivity Lab (Live In-Memory Re-Evaluation)
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Pure TypeScript zero-latency simulation
          </span>
          <button
            onClick={resetDefaults}
            disabled={disabled}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-500/20 transition-all"
            title="Restore baseline corporate policy parameters"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Slider 1: Amount Tolerance % */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-white/[0.04]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Amount Tolerance</span>
            <span className="font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px]">
              ±{localConfig.amountTolerancePercent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={localConfig.amountTolerancePercent}
            onChange={(e) => handleSliderChange('amountTolerancePercent', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400 leading-tight">
            Allowable % price variance against authorized PO commitment
          </p>
        </div>

        {/* Slider 2: Absolute Tolerance Cap */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-white/[0.04]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Absolute Cap</span>
            <span className="font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px]">
              ${localConfig.amountToleranceAbsolute}
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="3000"
            step="50"
            value={localConfig.amountToleranceAbsolute}
            onChange={(e) => handleSliderChange('amountToleranceAbsolute', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400 leading-tight">
            Strict monetary ceiling cap applied regardless of % variance
          </p>
        </div>

        {/* Slider 3: Duplicate Sensitivity */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-white/[0.04]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Duplicate Sensitivity</span>
            <span className="font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px]">
              {(localConfig.duplicateSensitivity * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={localConfig.duplicateSensitivity}
            onChange={(e) => handleSliderChange('duplicateSensitivity', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400 leading-tight">
            Token & amount threshold to flag suspected duplicates
          </p>
        </div>

        {/* Slider 4: PO Match Confidence */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-900/40 border border-white/[0.04]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">PO Inference Bar</span>
            <span className="font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-[11px]">
              {(localConfig.poMatchConfidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.95"
            step="0.05"
            value={localConfig.poMatchConfidenceThreshold}
            onChange={(e) => handleSliderChange('poMatchConfidenceThreshold', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400 leading-tight">
            Minimum fuzzy confidence required to auto-bind inferred POs
          </p>
        </div>
      </div>

      {/* Live Decision Recalculation Banner */}
      {currentVerdict && (
        <div className={`p-4 rounded-xl border transition-all ${
          isApproved
            ? 'bg-emerald-950/30 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'bg-slate-900/90 border-white/[0.08]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400 font-medium">Recalculated Verdict:</span>
              <StatusChip status={currentVerdict.decision} size="sm" />
              <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08]">
                Risk Score: <strong className={currentVerdict.riskScore > 35 ? 'text-amber-400' : 'text-emerald-400'}>{currentVerdict.riskScore}</strong>/100
              </span>

              {previousDecision && previousDecision !== currentVerdict.decision && (
                <span className="flex items-center gap-1 text-[11px] font-mono text-sky-400 bg-sky-950/60 border border-sky-500/30 px-2 py-0.5 rounded animate-pulse">
                  <span>{previousDecision}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span className="font-bold">{currentVerdict.decision}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400 shrink-0">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Zap className="w-3.5 h-3.5" />
              <span>Simulated in ~{lastCalculatedMs}ms (0 server trips)</span>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

