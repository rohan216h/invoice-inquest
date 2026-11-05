'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';
import { StatusChip } from './StatusChip';

export interface SampleDef {
  fileName: string;
  title: string;
  tag: string;
  expectedDecision: 'APPROVED' | 'NEEDS_REVIEW' | 'INFO_REQUESTED' | 'REJECTED';
  vendor: string;
  description: string;
}

export const SAMPLES: SampleDef[] = [
  {
    fileName: '01_happy_path_clean.pdf',
    title: 'Happy Path',
    tag: 'Baseline Match',
    expectedDecision: 'APPROVED',
    vendor: 'Acme Industrial Supplies Ltd',
    description: 'Exact PO reference, all fields valid, pricing exact → Auto-approved STP',
  },
  {
    fileName: '02_split_po_instalment_2.pdf',
    title: 'Split PO #2',
    tag: 'Partial Billing',
    expectedDecision: 'APPROVED',
    vendor: 'Pinnacle Office Furnishings Inc.',
    description: '2nd instalment against large multi-stage PO ($9,619 within $21,160 remaining)',
  },
  {
    fileName: '02b_split_po_instalment_3_overbill.pdf',
    title: 'Split PO #3 Overbill',
    tag: 'Budget Breach',
    expectedDecision: 'NEEDS_REVIEW',
    vendor: 'Pinnacle Office Furnishings Inc.',
    description: 'Cumulative billed exceeds remaining balance by $1,330 (> $50 tolerance cap)',
  },
  {
    fileName: '03_near_duplicate.pdf',
    title: 'Near-Duplicate',
    tag: 'Anti-Fraud Match',
    expectedDecision: 'REJECTED',
    vendor: 'Acme Industrial Supplies Ltd',
    description: '"INV 2041 " vs cleared "INV-2041", same $1,349.46 amount 3 days later → Flagged hold',
  },
  {
    fileName: '04_missing_fields.pdf',
    title: 'Missing Headers',
    tag: 'Regulatory Incomplete',
    expectedDecision: 'INFO_REQUESTED',
    vendor: 'EuroLogistik GmbH',
    description: 'No invoice number and grand total missing → Auto-drafts vendor email',
  },
  {
    fileName: '05_scanned_implied_po.png',
    title: 'Scanned + Bank Mismatch',
    tag: 'Fuzzy PO + Fraud Flag',
    expectedDecision: 'NEEDS_REVIEW',
    vendor: 'CloudNine Hosting Services',
    description: 'Scanned image with fuzzy PO inference, but bank account ending ****9934 differs from master',
  },
  {
    fileName: '06_unapproved_vendor.pdf',
    title: 'Unapproved Supplier',
    tag: 'Compliance Block',
    expectedDecision: 'REJECTED',
    vendor: 'QuickPrint Promotional Materials',
    description: 'Supplier is marked UNAPPROVED in procurement records → Automatic rejection',
  },
];

interface SampleLabProps {
  onSelectSample: (fileName: string) => void;
  activeFileName?: string;
  disabled?: boolean;
}

export function SampleLab({ onSelectSample, activeFileName, disabled = false }: SampleLabProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Sample Invoices Lab (Click any to evaluate)
          </h4>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          7 Edge Case Scenarios
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {SAMPLES.map((sample, idx) => {
          const isSelected = activeFileName === sample.fileName;

          const borderColors = {
            APPROVED: 'hover:border-emerald-500/40 border-emerald-500/20',
            NEEDS_REVIEW: 'hover:border-amber-500/40 border-amber-500/20',
            INFO_REQUESTED: 'hover:border-sky-500/40 border-sky-500/20',
            REJECTED: 'hover:border-rose-500/40 border-rose-500/20',
          };

          return (
            <motion.button
              key={sample.fileName}
              onClick={() => !disabled && onSelectSample(sample.fileName)}
              disabled={disabled}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              className={`p-3 rounded-xl text-left backdrop-blur-md transition-all flex flex-col justify-between h-full border ${
                isSelected
                  ? 'bg-slate-800/90 ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] border-emerald-400'
                  : `bg-[#0f1629]/80 ${borderColors[sample.expectedDecision]} hover:bg-slate-800/60`
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 truncate">
                    {sample.tag}
                  </span>
                  <StatusChip status={sample.expectedDecision} size="sm" showIcon={false} />
                </div>

                <div>
                  <h5 className="text-xs font-bold text-white leading-tight">
                    {sample.title}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                    {sample.fileName}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 mt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate">{sample.vendor.split(' ')[0]}</span>
                <span className="font-mono text-emerald-400 font-semibold shrink-0">Run →</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
