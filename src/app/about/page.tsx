'use client';

import React from 'react';
import { GlassCard } from '@/components/GlassCard';
import {
  Cpu,
  ShieldAlert,
  Sparkles,
  GitMerge,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Lock,
  ArrowRight,
  Database,
  Layers,
  Activity,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutPage() {
  const assumptions = [
    {
      title: 'AI Responsibility Boundary',
      desc: 'Generative AI is strictly restricted to optical data extraction (OCR) and optional natural language summarization polishing. AI is explicitly forbidden from making financial clearance, rejection, or tolerance decisions.',
    },
    {
      title: 'Deterministic Reproducibility',
      desc: 'All financial clearance and risk decisions are evaluated by pure TypeScript rules. Given the exact same extraction input and ledger state, the system is 100% deterministic and reproducible.',
    },
    {
      title: 'Tax-Inclusive Decomposition',
      desc: 'When an invoice indicates tax is included in line amounts or total, the engine decomposes the base subtotal using the recognized statutory tax rate before comparing against pre-tax PO commitments.',
    },
    {
      title: 'Fuzzy Match & Normalization',
      desc: 'Invoice numbers are normalized by stripping spaces, hyphens, and leading zeros. PO line matching uses token-based Jaccard similarity to tolerate vendor wording discrepancies.',
    },
    {
      title: 'Anti-Fraud Bank Account Vigilance',
      desc: 'Remittance bank account changes are treated with zero tolerance: even if the invoice arithmetic and PO match are 100% exact, bank discrepancies trigger an immediate manual review hold (anti-BEC defense).',
    },
    {
      title: 'Client-Side State Storage',
      desc: 'For rapid assessment in this take-home case study, ledger history and user rules are persisted to browser localStorage, with the server remaining entirely stateless.',
    },
  ];

  const designDecisions = [
    {
      title: 'Why AI Only Extracts and Code Decides',
      icon: Cpu,
      reason:
        'Large Language Models are probabilistic and prone to hallucination or stochastic drift. Financial audits and regulatory compliance require explainable, rule-by-rule execution traces where every dollar variance is provable in an audit court.',
    },
    {
      title: 'Tri-Tier Resilient Fallback Strategy',
      icon: Layers,
      reason:
        '1st tier: Google Gemini 2.5 Flash Vision for messy, unstructured documents. 2nd tier: Local pdf-parse regex heuristics when no API key exists. 3rd tier: Pre-computed ground truth fixtures so the demonstration never breaks.',
    },
    {
      title: 'Human-in-the-Loop AP Governance',
      icon: ShieldAlert,
      reason:
        'High-confidence straight-through invoices pass touchless, while suspicious edge cases (fraud risk, missing tax headers, overbilled budgets) are automatically routed into human triage with pre-drafted emails and diff evidence.',
    },
    {
      title: 'Live Client-Side Tolerance Lab',
      icon: Activity,
      reason:
        'Accounts Payable managers can interactively adjust tolerance percentages and duplicate sensitivity sliders to immediately observe policy impacts in real time without waiting for server round-trips.',
    },
  ];

  const pipelineStages = [
    { name: '1. Ingest', desc: 'File type, size & optical quality assessment' },
    { name: '2. Extract', desc: 'Multimodal Gemini / Heuristic extraction' },
    { name: '3. Normalise', desc: 'Date ISO formatting & tax decomposition' },
    { name: '4. Completeness', desc: 'Mandatory header check & vendor email drafting' },
    { name: '5. Vendor Check', desc: 'Master registry matching & bank fraud alert' },
    { name: '6. PO Match', desc: 'Exact PO lookup or fuzzy inference engine' },
    { name: '7. Math Audit', desc: 'Line extensions & 3-way goods receipt match' },
    { name: '8. Tolerance', desc: 'Cumulative commitment & PO balance verification' },
    { name: '9. Duplicate Check', desc: 'Historical ledger exact & fuzzy deduplication' },
    { name: '10. Risk & Decision', desc: 'Weighted scoring & non-technical AP summary' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="pb-4 border-b border-white/[0.08]">
        <span className="text-xs font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
          System Architecture & Product Rationale
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
          Inside INVOICE INQUEST
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Designed for the role of AI Solutions Analyst. A technical deep-dive into how deterministic
          rule engineering and generative extraction create an auditable, enterprise-grade AP automation system.
        </p>
      </div>

      {/* ── Architecture Diagram ───────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-emerald-400" />
          End-to-End Processing Architecture
        </h2>

        <GlassCard className="p-6 overflow-x-auto">
          <div className="min-w-[800px] flex flex-col items-center space-y-4">
            {/* Input Layer */}
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs font-mono text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                Invoice File (PDF / PNG / JPG)
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <div className="px-4 py-2 rounded-xl bg-slate-900 border border-sky-500/40 text-xs font-mono text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                POST /api/process (SSE Stream)
              </div>
            </div>

            {/* Stages Grid */}
            <div className="w-full grid grid-cols-5 gap-3 pt-4 border-t border-white/[0.08]">
              {pipelineStages.map((st, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#0f1629]/90 border border-white/[0.08] text-center flex flex-col items-center justify-between space-y-1 hover:border-emerald-500/30 transition-colors"
                >
                  <span className="text-xs font-bold text-white font-mono">{st.name}</span>
                  <p className="text-[10px] text-slate-400 leading-tight">{st.desc}</p>
                </div>
              ))}
            </div>

            {/* Output Decision Layer */}
            <div className="w-full pt-4 border-t border-white/[0.08] flex items-center justify-around text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
                ✓ APPROVED (Touchless STP)
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-400 font-bold">
                ⚠ NEEDS REVIEW (Human Triage)
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-500/40 text-sky-400 font-bold">
                ℹ INFO REQUESTED (Auto-Draft)
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-400 font-bold">
                ✕ REJECTED (Disbursement Hold)
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Key Design Decisions ───────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          Core Design Decisions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {designDecisions.map((dd, idx) => {
            const Icon = dd.icon;
            return (
              <GlassCard key={idx} className="p-5 space-y-2">
                <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-white">{dd.title}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{dd.reason}</p>
              </GlassCard>
            );
          })}
        </div>
      </div>

      {/* ── Assumptions List ───────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          Documented Assumptions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assumptions.map((a, idx) => (
            <GlassCard key={idx} className="p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{a.title}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{a.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* ── Known Limitations & Production Next Steps ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Limitations */}
        <GlassCard className="p-5 space-y-3 border-amber-500/20">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Current Prototype Boundaries
          </h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Single-tenant in-memory state (localStorage instead of persistent Postgres/Prisma).</li>
            <li>English language invoice documents and standard Western currency symbols.</li>
            <li>Email drafts are auto-generated and copyable, but not wired to an external SMTP relay.</li>
            <li>Tolerance slider recalculation is synchronous in the browser environment.</li>
          </ul>
        </GlassCard>

        {/* Next Steps */}
        <GlassCard className="p-5 space-y-3 border-emerald-500/20">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Production Scaling Roadmap
          </h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
            <li>Two-way webhook integration with SAP S/4HANA, NetSuite, and Workday Financials.</li>
            <li>Role-Based Access Control (RBAC) with dual-authorization for bank changes.</li>
            <li>Multilingual OCR model fine-tuning for APAC and EMEA complex invoices.</li>
            <li>Automated supplier email dispatch via SendGrid / Microsoft Graph API.</li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

