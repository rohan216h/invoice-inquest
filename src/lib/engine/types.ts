// ============================================================
// INVOICE INQUEST — Core Types
// ============================================================
import { z } from 'zod';

// ── Extraction field with provenance ──────────────────────────
export const ExtractionFieldSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    source: z.string().optional(),
  });

export type ExtractionField<T> = {
  value: T | null;
  confidence: number;
  source?: string;
};

// ── Line item ────────────────────────────────────────────────
export const LineItemSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});
export type LineItem = z.infer<typeof LineItemSchema>;

// ── Extracted invoice ────────────────────────────────────────
export const ExtractionResultSchema = z.object({
  vendorName: ExtractionFieldSchema(z.string()),
  vendorTaxId: ExtractionFieldSchema(z.string()),
  invoiceNumber: ExtractionFieldSchema(z.string()),
  invoiceDate: ExtractionFieldSchema(z.string()),
  dueDate: ExtractionFieldSchema(z.string()),
  currency: ExtractionFieldSchema(z.string()),
  poReference: ExtractionFieldSchema(z.string()),
  lineItems: ExtractionFieldSchema(z.array(LineItemSchema)),
  subtotal: ExtractionFieldSchema(z.number()),
  taxAmount: ExtractionFieldSchema(z.number()),
  taxRate: ExtractionFieldSchema(z.number()),
  total: ExtractionFieldSchema(z.number()),
  taxIncluded: ExtractionFieldSchema(z.boolean()),
  bankAccountLast4: ExtractionFieldSchema(z.string()),
  documentQuality: ExtractionFieldSchema(z.enum(['clean', 'scanned', 'poor'])),
  notes: ExtractionFieldSchema(z.string()),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

// ── Extraction engine type ───────────────────────────────────
export type ExtractionEngine = 'gemini' | 'heuristic' | 'cached';

// ── Stage status ─────────────────────────────────────────────
export type StageStatus = 'pass' | 'warn' | 'fail' | 'info';

// ── Evidence item ────────────────────────────────────────────
export interface Evidence {
  label: string;
  value: string;
  type?: 'positive' | 'negative' | 'neutral';
}

// ── Stage result ─────────────────────────────────────────────
export interface StageResult {
  stage: StageName;
  status: StageStatus;
  headline: string;
  reasoning: string;
  evidence: Evidence[];
  durationMs: number;
  data?: Record<string, unknown>;
}

// ── Stage names ──────────────────────────────────────────────
export type StageName =
  | 'INGEST'
  | 'EXTRACT'
  | 'NORMALISE'
  | 'COMPLETENESS'
  | 'VENDOR_CHECK'
  | 'PO_MATCH'
  | 'MATH_AUDIT'
  | 'TOLERANCE'
  | 'DUPLICATE_CHECK'
  | 'RISK_DECISION';

export const STAGE_ORDER: StageName[] = [
  'INGEST',
  'EXTRACT',
  'NORMALISE',
  'COMPLETENESS',
  'VENDOR_CHECK',
  'PO_MATCH',
  'MATH_AUDIT',
  'TOLERANCE',
  'DUPLICATE_CHECK',
  'RISK_DECISION',
];

export const STAGE_META: Record<StageName, { label: string; emoji: string; persona: string }> = {
  INGEST: { label: 'Ingest', emoji: '📥', persona: 'Iris the Intake Officer' },
  EXTRACT: { label: 'Extract', emoji: '🔍', persona: 'Ethan the Extractor' },
  NORMALISE: { label: 'Normalise', emoji: '🔧', persona: 'Nora the Normaliser' },
  COMPLETENESS: { label: 'Completeness', emoji: '📋', persona: 'Clara the Completeness Checker' },
  VENDOR_CHECK: { label: 'Vendor Check', emoji: '🏢', persona: 'Vera the Vendor Verifier' },
  PO_MATCH: { label: 'PO Match', emoji: '🔗', persona: 'Paul the PO Matcher' },
  MATH_AUDIT: { label: 'Math Audit', emoji: '🧮', persona: 'Max the Math Auditor' },
  TOLERANCE: { label: 'Tolerance', emoji: '📏', persona: 'Tara the Tolerance Analyst' },
  DUPLICATE_CHECK: { label: 'Duplicate Check', emoji: '👯', persona: 'Diana the Duplicate Detective' },
  RISK_DECISION: { label: 'Risk & Decision', emoji: '⚖️', persona: 'Rex the Risk Assessor' },
};

// ── Decision ─────────────────────────────────────────────────
export type Decision = 'APPROVED' | 'NEEDS_REVIEW' | 'INFO_REQUESTED' | 'REJECTED';

// ── Rule fired ───────────────────────────────────────────────
export interface RuleFired {
  rule: string;
  result: StageStatus;
  evidence: string;
  weight: number;
}

// ── Final verdict ────────────────────────────────────────────
export interface Verdict {
  decision: Decision;
  riskScore: number;
  confidence: number;
  executiveSummary: string;
  ruleTrace: RuleFired[];
  recommendedAction: string;
  emailDraft?: string;
  duplicateComparison?: {
    current: Record<string, string>;
    prior: Record<string, string>;
    differences: string[];
  };
}

// ── Pipeline config (tolerance lab) ──────────────────────────
export interface PipelineConfig {
  amountTolerancePercent: number;     // default 2
  amountToleranceAbsolute: number;    // default 50
  duplicateSensitivity: number;       // 0-1, default 0.7
  poMatchConfidenceThreshold: number; // 0-1, default 0.6
  extractionConfidenceThreshold: number; // 0-1, default 0.5
}

export const DEFAULT_CONFIG: PipelineConfig = {
  amountTolerancePercent: 2,
  amountToleranceAbsolute: 50,
  duplicateSensitivity: 0.7,
  poMatchConfidenceThreshold: 0.6,
  extractionConfidenceThreshold: 0.5,
};

// ── Run record (persisted in localStorage) ───────────────────
export interface RunRecord {
  id: string;
  fileName: string;
  timestamp: string;
  decision: Decision;
  riskScore: number;
  confidence: number;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  processingTimeMs: number;
  stages: StageResult[];
  verdict: Verdict;
  extraction: ExtractionResult;
  extractionEngine: ExtractionEngine;
  config: PipelineConfig;
}

// ── SSE event types ──────────────────────────────────────────
export type SSEEvent =
  | { type: 'stage_start'; stage: StageName }
  | { type: 'stage_result'; result: StageResult }
  | { type: 'extraction'; extraction: ExtractionResult; engine: ExtractionEngine }
  | { type: 'verdict'; verdict: Verdict }
  | { type: 'error'; message: string }
  | { type: 'done'; runId: string };

// ── Vendor ───────────────────────────────────────────────────
export interface Vendor {
  id: string;
  legalName: string;
  aliases: string[];
  country: string;
  taxId: string;
  currency: string;
  approved: boolean;
  bankAccountLast4: string;
  paymentTerms: string;
  bankAccountChangedDate?: string;
}

// ── PO line ──────────────────────────────────────────────────
export interface POLine {
  description: string;
  qty: number;
  unitPrice: number;
  receivedQty: number;
}

// ── Purchase Order ───────────────────────────────────────────
export interface PurchaseOrder {
  poNumber: string;
  vendorId: string;
  currency: string;
  lines: POLine[];
  total: number;
  taxRate: number;
  amountBilledToDate: number;
  status: 'open' | 'partial' | 'closed';
  createdDate: string;
}

// ── Pipeline context ─────────────────────────────────────────
export interface PipelineContext {
  fileBuffer: Buffer;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  runHistory: RunRecord[];
  config: PipelineConfig;
  // Accumulated during pipeline
  extraction?: ExtractionResult;
  extractionEngine?: ExtractionEngine;
  normalised?: NormalisedData;
  matchedVendor?: Vendor;
  matchedPO?: PurchaseOrder;
  poMatchConfidence?: number;
  stageResults: StageResult[];
}

// ── Normalised data ──────────────────────────────────────────
export interface NormalisedData {
  invoiceNumber: string | null;
  invoiceNumberRaw: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  currency: string;
  vendorName: string | null;
  vendorTaxId: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  taxRate: number | null;
  total: number | null;
  lineItems: LineItem[];
  poReference: string | null;
  bankAccountLast4: string | null;
  taxIncluded: boolean;
}

