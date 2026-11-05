// ============================================================
// INVOICE INQUEST — Comprehensive Engine Unit Tests
// ============================================================
import { describe, it, expect } from 'vitest';
import { normalizeInvoiceNumber, tokenJaccard } from '../lib/engine/utils';
import { stageTolerance } from '../lib/engine/tolerance';
import { stageDuplicateCheck } from '../lib/engine/duplicate-check';
import { stagePOMatch } from '../lib/engine/po-match';
import { stageRiskDecision } from '../lib/engine/risk-decision';
import type { PipelineContext, PurchaseOrder, Vendor, RunRecord, ExtractionResult } from '../lib/engine/types';
import { DEFAULT_CONFIG } from '../lib/engine/types';

// Mock helper to build minimal context
function createTestContext(overrides: Partial<PipelineContext> = {}): PipelineContext {
  return {
    fileBuffer: Buffer.from(''),
    fileName: 'test_invoice.pdf',
    fileMimeType: 'application/pdf',
    fileSize: 1024,
    vendors: [],
    purchaseOrders: [],
    runHistory: [],
    config: { ...DEFAULT_CONFIG },
    stageResults: [],
    ...overrides,
  };
}

describe('Invoice Number Normalisation', () => {
  it('handles spaces, hyphens, lowercase and special symbols', () => {
    expect(normalizeInvoiceNumber('INV-2041')).toBe('INV2041');
    expect(normalizeInvoiceNumber('INV 2041 ')).toBe('INV2041');
    expect(normalizeInvoiceNumber('inv-2041')).toBe('INV2041');
    expect(normalizeInvoiceNumber('INV.2041')).toBe('INV2041');
  });

  it('strips leading zeros following letters', () => {
    expect(normalizeInvoiceNumber('INV-0088')).toBe('INV88');
    expect(normalizeInvoiceNumber('PO-0004')).toBe('PO4');
  });
});

describe('Tolerance & Cumulative PO Check', () => {
  const samplePO: PurchaseOrder = {
    poNumber: 'PO-2026-004',
    vendorId: 'V004',
    currency: 'USD',
    lines: [
      { description: 'Executive Standing Desk', qty: 20, unitPrice: 899, receivedQty: 20 },
      { description: 'Office Chair', qty: 20, unitPrice: 549, receivedQty: 20 },
    ],
    total: 32740.00,
    taxRate: 0.07,
    amountBilledToDate: 11580.00,
    status: 'partial',
    createdDate: '2026-05-20',
  };

  it('approves instalment 2 when cumulative remains within PO budget', async () => {
    const ctx = createTestContext({
      matchedPO: samplePO,
      normalised: {
        invoiceNumber: 'INVPOF88',
        invoiceNumberRaw: 'INV-POF-0088',
        invoiceDate: '2026-09-15',
        dueDate: '2026-10-15',
        currency: 'USD',
        vendorName: 'Pinnacle Office Furnishings Inc.',
        vendorTaxId: 'US-EIN-92-7654321',
        subtotal: 8990.00,
        taxAmount: 629.30,
        taxRate: 0.07,
        total: 9619.30,
        lineItems: [{ description: 'Executive Standing Desk', qty: 10, unitPrice: 899, amount: 8990 }],
        poReference: 'PO-2026-004',
        bankAccountLast4: '8812',
        taxIncluded: false,
      },
    });

    const res = await stageTolerance(ctx);
    expect(res.status).toBe('pass');
    expect(res.data?.isOverbilled).toBe(false);
    expect(res.data?.remainingBalance).toBe(12170.00); // 32740 - (11580 + 8990)
  });

  it('flags warning on instalment 3 when cumulative overbills beyond tolerance', async () => {
    // Current billed = 11580. PO = 32740. Tolerance = min(32740 * 0.02 = 654.8, 50) = 50.
    // If invoice bills $22,000, cumulative = 11580 + 22000 = 33580 (overage = 840 > 50)
    const ctx = createTestContext({
      matchedPO: samplePO,
      normalised: {
        invoiceNumber: 'INVPOF89',
        invoiceNumberRaw: 'INV-POF-0089',
        invoiceDate: '2026-11-01',
        dueDate: '2026-12-01',
        currency: 'USD',
        vendorName: 'Pinnacle Office Furnishings Inc.',
        vendorTaxId: 'US-EIN-92-7654321',
        subtotal: 22000.00,
        taxAmount: 1540.00,
        taxRate: 0.07,
        total: 23540.00,
        lineItems: [],
        poReference: 'PO-2026-004',
        bankAccountLast4: '8812',
        taxIncluded: false,
      },
    });

    const res = await stageTolerance(ctx);
    expect(res.status).toBe('warn');
    expect(res.data?.isOverbilled).toBe(true);
    expect(res.headline).toContain('PO Ceiling Exceeded');
  });
});

describe('Duplicate Fuzzy Match Check', () => {
  const priorRun: RunRecord = {
    id: 'run-prior-1',
    fileName: 'prior_invoice.pdf',
    timestamp: '2026-10-15T10:00:00Z',
    decision: 'APPROVED',
    riskScore: 5,
    confidence: 0.98,
    vendorName: 'Acme Industrial Supplies Ltd',
    invoiceNumber: 'INV-2041',
    amount: 1349.46,
    currency: 'USD',
    processingTimeMs: 400,
    stages: [],
    verdict: {
      decision: 'APPROVED',
      riskScore: 5,
      confidence: 0.98,
      executiveSummary: 'Approved',
      ruleTrace: [],
      recommendedAction: 'Pay',
    },
    extraction: {
      vendorName: { value: 'Acme Industrial Supplies Ltd', confidence: 1 },
      vendorTaxId: { value: 'US-EIN-84-1234567', confidence: 1 },
      invoiceNumber: { value: 'INV-2041', confidence: 1 },
      invoiceDate: { value: '2026-10-15', confidence: 1 },
      dueDate: { value: '2026-11-15', confidence: 1 },
      currency: { value: 'USD', confidence: 1 },
      poReference: { value: 'PO-2026-001', confidence: 1 },
      lineItems: {
        value: [{ description: 'Industrial Safety Gloves (Box of 100)', qty: 50, unitPrice: 24.99, amount: 1249.50 }],
        confidence: 1,
      },
      subtotal: { value: 1249.50, confidence: 1 },
      taxAmount: { value: 99.96, confidence: 1 },
      taxRate: { value: 0.08, confidence: 1 },
      total: { value: 1349.46, confidence: 1 },
      taxIncluded: { value: false, confidence: 1 },
      bankAccountLast4: { value: '4521', confidence: 1 },
      documentQuality: { value: 'clean', confidence: 1 },
      notes: { value: '', confidence: 1 },
    },
    extractionEngine: 'cached',
    config: DEFAULT_CONFIG,
  };

  it('detects near-duplicate invoice submitted with formatted invoice number differences', async () => {
    const ctx = createTestContext({
      runHistory: [priorRun],
      matchedVendor: {
        id: 'V001',
        legalName: 'Acme Industrial Supplies Ltd',
        aliases: ['Acme Industries'],
        country: 'US',
        taxId: 'US-EIN-84-1234567',
        currency: 'USD',
        approved: true,
        bankAccountLast4: '4521',
        paymentTerms: 'Net 30',
      },
      normalised: {
        invoiceNumber: 'INV2041',
        invoiceNumberRaw: 'INV 2041 ',
        invoiceDate: '2026-10-18', // 3 days later
        dueDate: '2026-11-18',
        currency: 'USD',
        vendorName: 'Acme Industrial Supplies Ltd',
        vendorTaxId: 'US-EIN-84-1234567',
        subtotal: 1249.50,
        taxAmount: 99.96,
        taxRate: 0.08,
        total: 1349.46, // identical amount
        lineItems: [{ description: 'Industrial Safety Gloves (Box of 100)', qty: 50, unitPrice: 24.99, amount: 1249.50 }],
        poReference: 'PO-2026-001',
        bankAccountLast4: '4521',
        taxIncluded: false,
      },
    });

    const res = await stageDuplicateCheck(ctx);
    expect(res.status).toBe('fail');
    expect(res.headline).toContain('Duplicate Detected');
    expect(res.data?.duplicateMatch).toBeDefined();
  });
});

describe('PO Inference Engine', () => {
  const vendor: Vendor = {
    id: 'V005',
    legalName: 'CloudNine Hosting Services',
    aliases: ['CloudNine', 'C9 Hosting'],
    country: 'US',
    taxId: 'US-EIN-55-9876543',
    currency: 'USD',
    approved: true,
    bankAccountLast4: '2256',
    paymentTerms: 'Net 15',
  };

  const samplePOs: PurchaseOrder[] = [
    {
      poNumber: 'PO-2026-005',
      vendorId: 'V005',
      currency: 'USD',
      lines: [
        { description: 'Cloud Hosting - Annual Enterprise Plan', qty: 1, unitPrice: 18000, receivedQty: 1 },
        { description: 'DDoS Protection Add-on', qty: 1, unitPrice: 3600, receivedQty: 1 },
      ],
      total: 21600.00,
      taxRate: 0.0,
      amountBilledToDate: 0,
      status: 'open',
      createdDate: '2026-03-15',
    },
    {
      poNumber: 'PO-2026-099',
      vendorId: 'V005',
      currency: 'USD',
      lines: [{ description: 'Consulting services', qty: 1, unitPrice: 500, receivedQty: 1 }],
      total: 500.00,
      taxRate: 0.0,
      amountBilledToDate: 0,
      status: 'open',
      createdDate: '2026-01-01',
    },
  ];

  it('infers matching PO from line items and amount proximity without explicit PO reference', async () => {
    const ctx = createTestContext({
      matchedVendor: vendor,
      purchaseOrders: samplePOs,
      normalised: {
        invoiceNumber: 'INVC92026112',
        invoiceNumberRaw: 'INV-C9-2026-112',
        invoiceDate: '2026-10-30',
        dueDate: '2026-11-14',
        currency: 'USD',
        vendorName: 'CloudNine Hosting Services',
        vendorTaxId: 'US-EIN-55-9876543',
        subtotal: 21600.00,
        taxAmount: 0,
        taxRate: 0,
        total: 21600.00,
        lineItems: [
          { description: 'Cloud Hosting - Annual Enterprise Plan', qty: 1, unitPrice: 18000, amount: 18000 },
          { description: 'DDoS Protection Add-on', qty: 1, unitPrice: 3600, amount: 3600 },
        ],
        poReference: null, // NO explicit PO
        bankAccountLast4: '9934',
        taxIncluded: false,
      },
    });

    const res = await stagePOMatch(ctx);
    expect(res.status).toBe('pass');
    expect(ctx.matchedPO?.poNumber).toBe('PO-2026-005');
    expect(ctx.poMatchConfidence).toBeGreaterThanOrEqual(0.6);
  });
});

describe('Decision Precedence Hierarchy', () => {
  it('gives INFO_REQUESTED precedence over REJECTED and NEEDS_REVIEW when critical fields are missing', async () => {
    const ctx = createTestContext({
      stageResults: [
        {
          stage: 'COMPLETENESS',
          status: 'fail',
          headline: 'Missing critical fields',
          reasoning: 'Missing fields',
          evidence: [],
          durationMs: 10,
          data: { missingFields: ['Invoice Number', 'Grand Total'] },
        },
        {
          stage: 'VENDOR_CHECK',
          status: 'fail', // Vendor unapproved!
          headline: 'Unapproved Vendor',
          reasoning: 'Unapproved',
          evidence: [],
          durationMs: 10,
        },
      ],
      matchedVendor: {
        id: 'V007',
        legalName: 'Unapproved Vendor',
        aliases: [],
        country: 'US',
        taxId: 'US-EIN-00-0000000',
        currency: 'USD',
        approved: false,
        bankAccountLast4: '0000',
        paymentTerms: 'Net 30',
      },
    });

    const res = await stageRiskDecision(ctx);
    expect(res.verdict.decision).toBe('INFO_REQUESTED');
    expect(res.verdict.recommendedAction).toContain('clarification email');
  });

  it('gives REJECTED precedence when vendor is unapproved', async () => {
    const ctx = createTestContext({
      stageResults: [
        {
          stage: 'COMPLETENESS',
          status: 'pass',
          headline: 'Complete',
          reasoning: 'All fields present',
          evidence: [],
          durationMs: 10,
          data: { missingFields: [] },
        },
        {
          stage: 'VENDOR_CHECK',
          status: 'fail',
          headline: 'Unapproved Vendor',
          reasoning: 'Supplier is unapproved',
          evidence: [],
          durationMs: 10,
        },
      ],
      matchedVendor: {
        id: 'V007',
        legalName: 'QuickPrint Promotional Materials',
        aliases: [],
        country: 'US',
        taxId: 'US-EIN-33-1112233',
        currency: 'USD',
        approved: false,
        bankAccountLast4: '5599',
        paymentTerms: 'Net 30',
      },
    });

    const res = await stageRiskDecision(ctx);
    expect(res.verdict.decision).toBe('REJECTED');
  });

  it('flags NEEDS_REVIEW for bank detail modification even if financial numbers match', async () => {
    const ctx = createTestContext({
      stageResults: [
        {
          stage: 'COMPLETENESS',
          status: 'pass',
          headline: 'Complete',
          reasoning: 'All fields present',
          evidence: [],
          durationMs: 10,
          data: { missingFields: [] },
        },
        {
          stage: 'VENDOR_CHECK',
          status: 'warn',
          headline: 'BANK DETAILS CHANGED',
          reasoning: 'Bank details mismatch',
          evidence: [],
          durationMs: 10,
          data: { bankMismatch: true },
        },
        {
          stage: 'PO_MATCH',
          status: 'pass',
          headline: 'Matched',
          reasoning: 'Matched',
          evidence: [],
          durationMs: 10,
        },
        {
          stage: 'MATH_AUDIT',
          status: 'pass',
          headline: 'Pass',
          reasoning: 'Pass',
          evidence: [],
          durationMs: 10,
        },
        {
          stage: 'TOLERANCE',
          status: 'pass',
          headline: 'Pass',
          reasoning: 'Pass',
          evidence: [],
          durationMs: 10,
        },
        {
          stage: 'DUPLICATE_CHECK',
          status: 'pass',
          headline: 'Pass',
          reasoning: 'Pass',
          evidence: [],
          durationMs: 10,
        },
      ],
      matchedVendor: {
        id: 'V005',
        legalName: 'CloudNine Hosting Services',
        aliases: [],
        country: 'US',
        taxId: 'US-EIN-55-9876543',
        currency: 'USD',
        approved: true,
        bankAccountLast4: '2256',
        paymentTerms: 'Net 15',
      },
      normalised: {
        invoiceNumber: 'INVC9112',
        invoiceNumberRaw: 'INV-C9-112',
        invoiceDate: '2026-10-30',
        dueDate: '2026-11-14',
        currency: 'USD',
        vendorName: 'CloudNine Hosting Services',
        vendorTaxId: 'US-EIN-55-9876543',
        subtotal: 21600,
        taxAmount: 0,
        taxRate: 0,
        total: 21600,
        lineItems: [],
        poReference: 'PO-2026-005',
        bankAccountLast4: '9934', // different bank account!
        taxIncluded: false,
      },
    });

    const res = await stageRiskDecision(ctx);
    expect(res.verdict.decision).toBe('NEEDS_REVIEW');
    expect(res.verdict.recommendedAction).toContain('callback verification');
  });

  it('approves clean invoices with 0 exceptions', async () => {
    const ctx = createTestContext({
      stageResults: [
        { stage: 'COMPLETENESS', status: 'pass', headline: 'Pass', reasoning: 'All ok', evidence: [], durationMs: 10, data: { missingFields: [] } },
        { stage: 'VENDOR_CHECK', status: 'pass', headline: 'Pass', reasoning: 'Approved supplier', evidence: [], durationMs: 10, data: { bankMismatch: false } },
        { stage: 'PO_MATCH', status: 'pass', headline: 'Pass', reasoning: 'Matched', evidence: [], durationMs: 10 },
        { stage: 'MATH_AUDIT', status: 'pass', headline: 'Pass', reasoning: 'Exact math', evidence: [], durationMs: 10 },
        { stage: 'TOLERANCE', status: 'pass', headline: 'Pass', reasoning: 'Within budget', evidence: [], durationMs: 10, data: { isOverbilled: false } },
        { stage: 'DUPLICATE_CHECK', status: 'pass', headline: 'Pass', reasoning: 'Unique', evidence: [], durationMs: 10 },
      ],
      matchedVendor: {
        id: 'V001',
        legalName: 'Acme Industrial Supplies Ltd',
        aliases: [],
        country: 'US',
        taxId: 'US-EIN-84-1234567',
        currency: 'USD',
        approved: true,
        bankAccountLast4: '4521',
        paymentTerms: 'Net 30',
      },
    });

    const res = await stageRiskDecision(ctx);
    expect(res.verdict.decision).toBe('APPROVED');
    expect(res.verdict.riskScore).toBeLessThan(25);
  });
});
