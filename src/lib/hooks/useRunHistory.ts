'use client';

import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { RunRecord, Decision, StageStatus, PipelineConfig, DEFAULT_CONFIG } from '@/lib/engine/types';

// ── Seed data generator ──────────────────────────────────────
function generateSeedRuns(): RunRecord[] {
  const vendors = [
    { name: 'Acme Industrial Supplies', taxId: 'US-82-1234567' },
    { name: 'TechVault Components Ltd', taxId: 'GB-987654321' },
    { name: 'Nordic Paper Co.', taxId: 'SE-556012-3456' },
    { name: 'Precision CNC GmbH', taxId: 'DE-143567890' },
    { name: 'Shanghai Logistics Corp', taxId: 'CN-91310000' },
    { name: 'BrightStar Electricals', taxId: 'US-47-9876543' },
    { name: 'Atlas Office Solutions', taxId: 'CA-BN123456789' },
    { name: 'MediQuip International', taxId: 'AU-53004085616' },
  ];

  const decisions: Decision[] = ['APPROVED', 'NEEDS_REVIEW', 'INFO_REQUESTED', 'REJECTED'];
  const currencies = ['USD', 'EUR', 'GBP', 'USD', 'USD', 'CAD', 'AUD', 'USD'];

  const seedData: Array<{
    fileName: string;
    decision: Decision;
    riskScore: number;
    confidence: number;
    vendorIdx: number;
    amount: number;
    daysAgo: number;
    processingTimeMs: number;
  }> = [
    { fileName: 'INV-2024-0891.pdf', decision: 'APPROVED', riskScore: 12, confidence: 0.95, vendorIdx: 0, amount: 4250.0, daysAgo: 2, processingTimeMs: 3200 },
    { fileName: 'INV-Q4-1122.pdf', decision: 'APPROVED', riskScore: 8, confidence: 0.98, vendorIdx: 1, amount: 18750.5, daysAgo: 5, processingTimeMs: 2800 },
    { fileName: 'scan_receipt_003.png', decision: 'NEEDS_REVIEW', riskScore: 55, confidence: 0.72, vendorIdx: 2, amount: 3200.0, daysAgo: 8, processingTimeMs: 5400 },
    { fileName: 'PO-5567-invoice.pdf', decision: 'APPROVED', riskScore: 15, confidence: 0.91, vendorIdx: 3, amount: 67800.0, daysAgo: 12, processingTimeMs: 4100 },
    { fileName: 'INV-SLC-2024-443.pdf', decision: 'REJECTED', riskScore: 88, confidence: 0.89, vendorIdx: 4, amount: 12340.0, daysAgo: 15, processingTimeMs: 3900 },
    { fileName: 'brightstar_nov.pdf', decision: 'INFO_REQUESTED', riskScore: 45, confidence: 0.65, vendorIdx: 5, amount: 890.25, daysAgo: 18, processingTimeMs: 4500 },
    { fileName: 'office_supplies_q4.pdf', decision: 'APPROVED', riskScore: 5, confidence: 0.99, vendorIdx: 6, amount: 1250.0, daysAgo: 22, processingTimeMs: 2200 },
    { fileName: 'MQ-INV-9981.pdf', decision: 'NEEDS_REVIEW', riskScore: 62, confidence: 0.68, vendorIdx: 7, amount: 45000.0, daysAgo: 28, processingTimeMs: 5100 },
    { fileName: 'INV-2024-0925.pdf', decision: 'APPROVED', riskScore: 18, confidence: 0.93, vendorIdx: 0, amount: 7800.0, daysAgo: 35, processingTimeMs: 3000 },
    { fileName: 'techvault_maint.pdf', decision: 'REJECTED', riskScore: 91, confidence: 0.94, vendorIdx: 1, amount: 18750.5, daysAgo: 42, processingTimeMs: 3400 },
    { fileName: 'paper_order_reprint.jpg', decision: 'INFO_REQUESTED', riskScore: 50, confidence: 0.58, vendorIdx: 2, amount: 6400.0, daysAgo: 50, processingTimeMs: 6200 },
    { fileName: 'precision_parts_dec.pdf', decision: 'APPROVED', riskScore: 10, confidence: 0.96, vendorIdx: 3, amount: 34500.0, daysAgo: 55, processingTimeMs: 3100 },
  ];

  const now = Date.now();

  return seedData.map((s, i) => {
    const vendor = vendors[s.vendorIdx];
    const ts = new Date(now - s.daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const invNum = `INV-${2024}-${String(1000 + i).slice(1)}`;

    const makeStageResult = (
      stage: string,
      status: StageStatus,
      headline: string,
      reasoning: string,
      durationMs: number
    ) => ({
      stage: stage as RunRecord['stages'][number]['stage'],
      status,
      headline,
      reasoning,
      evidence: [
        { label: 'Source', value: 'Automated check', type: 'neutral' as const },
      ],
      durationMs,
    });

    const isGood = s.decision === 'APPROVED';
    const stageStatuses: StageStatus[] = isGood
      ? ['pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass', 'pass']
      : s.decision === 'NEEDS_REVIEW'
        ? ['pass', 'pass', 'pass', 'warn', 'pass', 'warn', 'pass', 'warn', 'pass', 'warn']
        : s.decision === 'REJECTED'
          ? ['pass', 'pass', 'pass', 'pass', 'fail', 'fail', 'pass', 'fail', 'pass', 'fail']
          : ['pass', 'pass', 'pass', 'warn', 'pass', 'info', 'pass', 'pass', 'pass', 'info'];

    const stageNames = [
      'INGEST', 'EXTRACT', 'NORMALISE', 'COMPLETENESS', 'VENDOR_CHECK',
      'PO_MATCH', 'MATH_AUDIT', 'TOLERANCE', 'DUPLICATE_CHECK', 'RISK_DECISION',
    ] as const;

    const stages = stageNames.map((name, si) =>
      makeStageResult(
        name,
        stageStatuses[si],
        `${name} complete`,
        `Stage ${name} processed successfully.`,
        100 + Math.floor(Math.random() * 400)
      )
    );

    const config: PipelineConfig = {
      amountTolerancePercent: 2,
      amountToleranceAbsolute: 2000,
      duplicateSensitivity: 0.7,
      poMatchConfidenceThreshold: 0.6,
      extractionConfidenceThreshold: 0.5,
    };

    return {
      id: `seed-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${i}`}`,
      fileName: s.fileName,
      timestamp: ts,
      decision: s.decision,
      riskScore: s.riskScore,
      confidence: s.confidence,
      vendorName: vendor.name,
      invoiceNumber: invNum,
      amount: s.amount,
      currency: currencies[s.vendorIdx],
      processingTimeMs: s.processingTimeMs,
      stages,
      verdict: {
        decision: s.decision,
        riskScore: s.riskScore,
        confidence: s.confidence,
        executiveSummary: `Invoice ${invNum} from ${vendor.name} for ${currencies[s.vendorIdx]} ${s.amount.toLocaleString()} has been ${s.decision.toLowerCase().replace('_', ' ')}.`,
        ruleTrace: [
          { rule: 'Vendor verification', result: isGood ? 'pass' : 'warn', evidence: 'Vendor lookup completed', weight: 1 },
          { rule: 'PO matching', result: stageStatuses[5], evidence: 'PO reference checked', weight: 2 },
          { rule: 'Math audit', result: stageStatuses[6], evidence: 'Line items verified', weight: 1.5 },
        ],
        recommendedAction: isGood
          ? 'Proceed to payment'
          : s.decision === 'REJECTED'
            ? 'Return to vendor for correction'
            : 'Escalate for manual review',
        emailDraft: s.decision === 'INFO_REQUESTED'
          ? `Dear ${vendor.name},\n\nRegarding invoice ${invNum}, we require additional information to process your submission.\n\nPlease provide the missing purchase order reference.\n\nBest regards,\nAccounts Payable`
          : undefined,
      },
      extraction: {
        vendorName: { value: vendor.name, confidence: 0.95 },
        vendorTaxId: { value: vendor.taxId, confidence: 0.9 },
        invoiceNumber: { value: invNum, confidence: 0.98 },
        invoiceDate: { value: new Date(now - (s.daysAgo + 3) * 86400000).toISOString().slice(0, 10), confidence: 0.95 },
        dueDate: { value: new Date(now - (s.daysAgo - 27) * 86400000).toISOString().slice(0, 10), confidence: 0.88 },
        currency: { value: currencies[s.vendorIdx], confidence: 0.99 },
        poReference: { value: `PO-${5000 + i}`, confidence: 0.85 },
        lineItems: {
          value: [
            { description: 'Service / Product', qty: 1, unitPrice: s.amount, amount: s.amount },
          ],
          confidence: 0.9,
        },
        subtotal: { value: s.amount * 0.9, confidence: 0.92 },
        taxAmount: { value: s.amount * 0.1, confidence: 0.9 },
        taxRate: { value: 0.1, confidence: 0.88 },
        total: { value: s.amount, confidence: 0.95 },
        taxIncluded: { value: true, confidence: 0.8 },
        bankAccountLast4: { value: String(1000 + i * 111).slice(-4), confidence: 0.75 },
        documentQuality: { value: s.fileName.endsWith('.pdf') ? 'clean' : 'scanned', confidence: 0.85 },
        notes: { value: null, confidence: 0 },
      },
      extractionEngine: 'gemini' as const,
      config,
    } as RunRecord;
  });
}

// ── Hook ─────────────────────────────────────────────────────
const STORAGE_KEY = 'invoice-inquest-run-history';

export function useRunHistory() {
  const [runs, setRuns] = useLocalStorage<RunRecord[]>(STORAGE_KEY, []);

  // Seed on first load
  const isSeeded = runs.length > 0;

  const seedRuns = useCallback((force = false) => {
    if (!isSeeded || force) {
      setRuns(generateSeedRuns());
    }
  }, [isSeeded, setRuns]);

  // Auto-seed on mount
  useMemo(() => {
    if (typeof window !== 'undefined' && !isSeeded) {
      // Defer seeding to avoid hydration mismatch
      setTimeout(() => seedRuns(), 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addRun = useCallback(
    (run: RunRecord) => {
      setRuns((prev) => [run, ...prev]);
    },
    [setRuns]
  );

  const clearRuns = useCallback(() => {
    setRuns([]);
  }, [setRuns]);

  const getRun = useCallback(
    (id: string) => {
      return runs.find((r) => r.id === id) ?? null;
    },
    [runs]
  );

  return { runs, addRun, clearRuns, getRun, seedRuns };
}
