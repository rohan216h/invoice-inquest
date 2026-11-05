// ============================================================
// INVOICE INQUEST — Stage 4: COMPLETENESS
// ============================================================
import type { PipelineContext, StageResult, Evidence } from './types';

export interface CompletenessReport {
  missingFields: string[];
  presentFields: string[];
  emailDraft?: string;
}

export async function stageCompleteness(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const norm = ctx.normalised;

  if (!norm) {
    return {
      stage: 'COMPLETENESS',
      status: 'fail',
      headline: 'Missing normalised data',
      reasoning: 'Normalised invoice data is unavailable for completeness checking.',
      evidence: [{ label: 'Error', value: 'Pipeline state invalid', type: 'negative' }],
      durationMs: performance.now() - start,
    };
  }

  const criticalFields = [
    { key: 'vendorName', label: 'Vendor Name', val: norm.vendorName },
    { key: 'invoiceNumber', label: 'Invoice Number', val: norm.invoiceNumberRaw || norm.invoiceNumber },
    { key: 'invoiceDate', label: 'Invoice Date', val: norm.invoiceDate },
    { key: 'total', label: 'Grand Total Amount', val: norm.total != null ? norm.total : null },
  ];

  const missingFields: string[] = [];
  const presentFields: string[] = [];

  for (const field of criticalFields) {
    if (field.val === null || field.val === undefined || field.val === '') {
      missingFields.push(field.label);
      evidence.push({
        label: field.label,
        value: 'MISSING (Required)',
        type: 'negative',
      });
    } else {
      presentFields.push(field.label);
      evidence.push({
        label: field.label,
        value: String(field.val),
        type: 'positive',
      });
    }
  }

  const durationMs = performance.now() - start;

  if (missingFields.length > 0) {
    const vendorDisplayName = norm.vendorName || 'Valued Vendor';
    const invoiceRef = norm.invoiceNumberRaw || 'your recent invoice';
    const dateRef = norm.invoiceDate ? ` dated ${norm.invoiceDate}` : '';

    const emailDraft = `Subject: Information Required: Processing Hold on ${invoiceRef}

Dear Accounts Receivable Team at ${vendorDisplayName},

Thank you for submitting your invoice${dateRef}. 

During our automated intake audit at TechCorp Global Accounts Payable, we identified critical information required for regulatory compliance and payment processing that is missing from the document:

${missingFields.map((f) => `  • ${f}: Required for 3-way match & accounting entry`).join('\n')}

To ensure timely settlement within our standard payment terms, please reply to this email with a revised invoice document containing these details, or confirm the missing values directly.

Reference Details:
  - Document received: ${ctx.fileName}
  - Invoiced Party: TechCorp Global Inc. (AP Dept)

Kind regards,

Accounts Payable Automation & Audit Desk
TechCorp Global Inc.
ap-processing@techcorpglobal.com`;

    return {
      stage: 'COMPLETENESS',
      status: 'fail',
      headline: `Critical fields missing: ${missingFields.join(', ')}`,
      reasoning: `The invoice lacks ${missingFields.length} mandatory field(s): ${missingFields.join(', ')}. Automated straight-through processing cannot proceed without these. An automated vendor clarification draft has been generated.`,
      evidence,
      durationMs,
      data: {
        missingFields,
        presentFields,
        emailDraft,
      },
    };
  }

  return {
    stage: 'COMPLETENESS',
    status: 'pass',
    headline: 'All critical mandatory fields present',
    reasoning: `All 4 critical accounts-payable fields (Vendor Name, Invoice Number, Invoice Date, Grand Total) are populated with high confidence.`,
    evidence,
    durationMs,
    data: {
      missingFields: [],
      presentFields,
    },
  };
}

