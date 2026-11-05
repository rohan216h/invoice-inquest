'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { StatusChip } from '@/components/StatusChip';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';
import type { PipelineConfig } from '@/lib/engine/types';
import { DEFAULT_CONFIG } from '@/lib/engine/types';
import {
  BookOpen,
  Sliders,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Shield,
  Save,
  RotateCcw,
} from 'lucide-react';
import vendorsData from '../../../data/vendors.json';
import posData from '../../../data/purchase_orders.json';

interface RuleDefinition {
  id: string;
  name: string;
  category: string;
  whyItExists: string;
  defaultThreshold: string;
  severity: 'FAIL' | 'WARN' | 'INFO';
  precedence: number;
}

const ENGINE_RULES: RuleDefinition[] = [
  {
    id: 'R1_COMPLETENESS',
    name: 'Mandatory Field Completeness',
    category: 'Intake Compliance',
    whyItExists:
      'Invoices without invoice numbers, dates, vendor names, or grand totals cannot be legally accounted for or integrated into ERP journals.',
    defaultThreshold: '100% of critical fields required',
    severity: 'INFO',
    precedence: 1,
  },
  {
    id: 'R2_VENDOR_APPROVAL',
    name: 'Vendor Master Onboarding Status',
    category: 'Procurement Governance',
    whyItExists:
      'Prevents unauthorized disbursements to non-vetted entities, shell corporations, or suppliers lacking tax compliance certification.',
    defaultThreshold: 'Supplier approved = true',
    severity: 'FAIL',
    precedence: 2,
  },
  {
    id: 'R3_DUPLICATE_CHECK',
    name: 'Duplicate Invoice Detection',
    category: 'Anti-Fraud & Leakage',
    whyItExists:
      'Stops duplicate payments caused by multi-channel invoice submissions, re-transmissions, or intentional double-billing fraud.',
    defaultThreshold: 'Normalized key match OR 70% fuzzy fingerprint',
    severity: 'FAIL',
    precedence: 2,
  },
  {
    id: 'R4_BANK_DETAILS_CHANGE',
    name: 'Remittance Bank Account Verification',
    category: 'Anti-Fraud Control',
    whyItExists:
      'Flags unauthorized bank changes to combat Business Email Compromise (BEC) and invoice redirect cyber-fraud.',
    defaultThreshold: 'Last 4 digits must match registered master',
    severity: 'WARN',
    precedence: 3,
  },
  {
    id: 'R5_CUMULATIVE_PO_CEILING',
    name: 'Cumulative PO Encumbrance Cap',
    category: 'Budgetary Control',
    whyItExists:
      'Ensures multi-part instalment billings do not exceed the total contracted expenditure limit authorized by management.',
    defaultThreshold: 'Cumulative spend ≤ PO Total + Tolerance',
    severity: 'WARN',
    precedence: 3,
  },
  {
    id: 'R6_PRICE_TOLERANCE',
    name: 'PO Amount Variance Tolerance',
    category: 'Price Governance',
    whyItExists:
      'Accommodates minor rounding or shipping variances while containing unapproved supplier price hikes.',
    defaultThreshold: 'min(±2%, $50 cap)',
    severity: 'WARN',
    precedence: 3,
  },
  {
    id: 'R7_THREE_WAY_MATCH',
    name: 'Three-Way Match Verification',
    category: 'Goods Receipt Audit',
    whyItExists:
      'Validates that billed unit prices align with purchase order commitments and billed quantities do not exceed warehouse receipt.',
    defaultThreshold: 'Qty invoiced ≤ Qty received',
    severity: 'WARN',
    precedence: 3,
  },
  {
    id: 'R8_ARITHMETIC_AUDIT',
    name: 'Line Extension & Tax Mathematics',
    category: 'Accounting Integrity',
    whyItExists:
      'Detects mathematical errors, incorrect sales tax computations, and faulty sum extensions before ledger posting.',
    defaultThreshold: 'Zero discrepancy (> $0.05)',
    severity: 'WARN',
    precedence: 3,
  },
];

export default function RulesPage() {
  const [config, setConfig] = useLocalStorage<PipelineConfig>('invoice_inquest_config', DEFAULT_CONFIG);
  const [savedToast, setSavedToast] = useState(false);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  const handleSave = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <span className="text-xs font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
            Policy & Ledger Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Deterministic Rulebook & Master Data
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Transparent inspection of all 8 AP verification rules, active corporate Purchase Orders,
            and registered vendor master entities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 border border-white/[0.08] rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-navy-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savedToast ? 'Saved!' : 'Save Rule Config'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 1: Human-Readable Rulebook ──────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Deterministic AP Audit Rulebook
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ENGINE_RULES.map((rule) => {
            const badgeStyle = {
              FAIL: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
              WARN: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
              INFO: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
            }[rule.severity];

            return (
              <GlassCard key={rule.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {rule.category} • Precedence #{rule.precedence}
                    </span>
                    <h3 className="text-xs font-bold text-white mt-0.5">{rule.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeStyle}`}
                  >
                    {rule.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{rule.whyItExists}</p>

                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Threshold Rule:</span>
                  <span className="text-emerald-400 font-semibold">{rule.defaultThreshold}</span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: Purchase Order Ledger ────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Procurement Purchase Order Ledger
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {posData.length} Active Purchase Orders
          </span>
        </div>

        <GlassCard className="p-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-mono text-[10px]">
                  <th className="pb-3 pl-2">PO Number</th>
                  <th className="pb-3">Vendor</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Total Value</th>
                  <th className="pb-3">Billed to Date</th>
                  <th className="pb-3">Remaining</th>
                  <th className="pb-3 pr-2 text-right">Lines</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {posData.map((po) => {
                  const remaining = Math.max(0, po.total - po.amountBilledToDate);
                  const isExpanded = expandedPO === po.poNumber;

                  return (
                    <React.Fragment key={po.poNumber}>
                      <tr
                        onClick={() => setExpandedPO(isExpanded ? null : po.poNumber)}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors"
                      >
                        <td className="py-3 pl-2 font-mono font-bold text-white">
                          {po.poNumber}
                        </td>
                        <td className="py-3 font-mono text-slate-300">{po.vendorId}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${po.status === 'open'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                                : po.status === 'partial'
                                  ? 'bg-amber-950/60 text-amber-400 border-amber-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="py-3 font-mono text-white font-semibold">
                          {po.currency} {po.total.toFixed(2)}
                        </td>
                        <td className="py-3 font-mono text-slate-400">
                          {po.currency} {po.amountBilledToDate.toFixed(2)}
                        </td>
                        <td className="py-3 font-mono text-emerald-400 font-bold">
                          {po.currency} {remaining.toFixed(2)}
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <button className="text-slate-400 hover:text-white">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 inline" />
                            ) : (
                              <ChevronDown className="w-4 h-4 inline" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable line items */}
                      {isExpanded && (
                        <tr className="bg-slate-900/60">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-2">
                              <span className="text-[10px] font-mono uppercase text-slate-400">
                                Order Line Specifications & 3-Way Goods Receipt
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {po.lines.map((ln, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2.5 rounded bg-slate-950/80 border border-white/[0.05] text-xs flex justify-between"
                                  >
                                    <div>
                                      <p className="font-semibold text-white">{(ln as { desc?: string; description?: string }).description || (ln as { desc?: string; description?: string }).desc}</p>
                                      <p className="text-slate-400 text-[11px] font-mono">
                                        Unit: {po.currency} {ln.unitPrice.toFixed(2)} • Ordered: {ln.qty}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                        Received: {ln.receivedQty}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {/* ── Section 3: Vendor Master ────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Vendor Master Registry
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {vendorsData.length} Onboarded Entities
          </span>
        </div>

        <GlassCard className="p-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-mono text-[10px]">
                  <th className="pb-3 pl-2">ID</th>
                  <th className="pb-3">Legal Entity Name</th>
                  <th className="pb-3">Country</th>
                  <th className="pb-3">Tax ID</th>
                  <th className="pb-3">Currency</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Remit Bank Last 4</th>
                  <th className="pb-3 pr-2">Payment Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {vendorsData.map((vendor) => {
                  const isUnapproved = !vendor.approved;
                  const hasBankNotice = !!vendor.bankAccountChangedDate;

                  return (
                    <tr
                      key={vendor.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isUnapproved ? 'bg-rose-950/20' : ''
                        }`}
                    >
                      <td className="py-3 pl-2 font-mono font-bold text-slate-300">{vendor.id}</td>
                      <td className="py-3 font-semibold text-white">
                        {vendor.legalName}
                        {vendor.aliases.length > 0 && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Aliases: {vendor.aliases.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-300">{vendor.country}</td>
                      <td className="py-3 font-mono text-slate-400">{vendor.taxId}</td>
                      <td className="py-3 font-mono text-slate-300">{vendor.currency}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${vendor.approved
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-950/60 text-rose-400 border-rose-500/30'
                            }`}
                        >
                          {vendor.approved ? 'Approved' : 'Unapproved'}
                        </span>
                      </td>
                      <td className="py-3 font-mono">
                        <span className="text-slate-200">****{vendor.bankAccountLast4}</span>
                        {hasBankNotice && (
                          <span className="block text-[9px] text-amber-400 font-mono">
                            Mod: {vendor.bankAccountChangedDate}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-2 font-mono text-slate-300">{vendor.paymentTerms}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
