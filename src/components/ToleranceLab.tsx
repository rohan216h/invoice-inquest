'use client';

import React, { useState } from 'react';
import type { PipelineConfig, Verdict } from '@/lib/engine/types';
import { GlassCard } from './GlassCard';
import { StatusChip } from './StatusChip';
import { Sliders, RefreshCw, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

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

  const handleSliderChange = (key: keyof PipelineConfig, val: number) => {
    const updated = { ...localConfig, [key]: val };
    setLocalConfig(updated);
    if (currentVerdict) {
      setPreviousDecision(currentVerdict.decision);
    }
    onConfigChange(updated);
  };

  const resetDefaults = () => {
    const def: PipelineConfig = {
      amountTolerancePercent: 2,
      amountToleranceAbsolute: 50,
      duplicateSensitivity: 0.7,
      poMatchConfidenceThreshold: 0.6,
      extractionConfidenceThreshold: 0.5,
    };
    setLocalConfig(def);
    onConfigChange(def);
  };

  return (
    <GlassCard className="p-5 border-white/[0.12] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.08] gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Tolerance & Sensitivity Lab (Live Re-Evaluation)
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Client-side deterministic re-evaluation
          </span>
          <button
            onClick={resetDefaults}
            disabled={disabled}
            className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Slider 1: Amount Tolerance % */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Amount Tolerance</span>
            <span className="font-mono text-emerald-400 font-bold">
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
          <p className="text-[10px] text-slate-400">
            Allowable % price variance against authorized PO total
          </p>
        </div>

        {/* Slider 2: Absolute Tolerance Cap */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Absolute Cap</span>
            <span className="font-mono text-emerald-400 font-bold">
              ${localConfig.amountToleranceAbsolute}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={localConfig.amountToleranceAbsolute}
            onChange={(e) => handleSliderChange('amountToleranceAbsolute', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400">
            Strict ceiling cap applied regardless of % variance
          </p>
        </div>

        {/* Slider 3: Duplicate Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Duplicate Sensitivity</span>
            <span className="font-mono text-emerald-400 font-bold">
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
          <p className="text-[10px] text-slate-400">
            Token & amount threshold to flag suspected near-duplicates
          </p>
        </div>

        {/* Slider 4: PO Match Confidence */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">PO Inference Bar</span>
            <span className="font-mono text-emerald-400 font-bold">
              {(localConfig.poMatchConfidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.05"
            value={localConfig.poMatchConfidenceThreshold}
            onChange={(e) => handleSliderChange('poMatchConfidenceThreshold', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
          <p className="text-[10px] text-slate-400">
            Minimum fuzzy confidence required to auto-bind inferred POs
          </p>
        </div>
      </div>

      {/* Live "What Changed" Diff banner */}
      {currentVerdict && (
        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.06] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Live Decision Status:</span>
            <StatusChip status={currentVerdict.decision} size="sm" />
            <span className="text-[11px] font-mono text-slate-400">
              Risk: {currentVerdict.riskScore}/100
            </span>
          </div>

          <span className="text-[10px] text-emerald-400 font-mono">
            Sliders recalculate state in ~2ms
          </span>
        </div>
      )}
    </GlassCard>
  );
}

