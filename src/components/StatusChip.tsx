'use client';

import React from 'react';
import type { Decision, StageStatus } from '@/lib/engine/types';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface StatusChipProps {
  status: Decision | StageStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusChip({ status, size = 'md', showIcon = true }: StatusChipProps) {
  const norm = status.toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let dotColor = 'bg-slate-400';
  let Icon = HelpCircle;
  let label = status;

  if (norm === 'APPROVED' || norm === 'PASS') {
    colorClasses = 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30';
    dotColor = 'bg-emerald-400';
    Icon = CheckCircle2;
    label = norm === 'PASS' ? 'Pass' : 'Approved';
  } else if (norm === 'NEEDS_REVIEW' || norm === 'WARN') {
    colorClasses = 'bg-amber-950/60 text-amber-400 border-amber-500/30';
    dotColor = 'bg-amber-400';
    Icon = AlertTriangle;
    label = norm === 'WARN' ? 'Warning' : 'Needs Review';
  } else if (norm === 'REJECTED' || norm === 'FAIL') {
    colorClasses = 'bg-rose-950/60 text-rose-400 border-rose-500/30';
    dotColor = 'bg-rose-400';
    Icon = AlertCircle;
    label = norm === 'FAIL' ? 'Fail' : 'Rejected';
  } else if (norm === 'INFO_REQUESTED' || norm === 'INFO') {
    colorClasses = 'bg-sky-950/60 text-sky-400 border-sky-500/30';
    dotColor = 'bg-sky-400';
    Icon = HelpCircle;
    label = norm === 'INFO' ? 'Info' : 'Info Requested';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm backdrop-blur-md ${colorClasses} ${sizeClasses[size]}`}
    >
      {showIcon ? (
        <Icon className={size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      )}
      <span>{label}</span>
    </span>
  );
}

