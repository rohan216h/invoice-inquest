// ============================================================
// INVOICE INQUEST — Stage 3: NORMALISE
// ============================================================
import type { PipelineContext, StageResult, Evidence, NormalisedData, LineItem } from './types';
import { normalizeInvoiceNumber, parseDate } from './utils';

export async function stageNormalise(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const ext = ctx.extraction;

  if (!ext) {
    return {
      stage: 'NORMALISE',
      status: 'fail',
      headline: 'No extraction data to normalise',
      reasoning: 'The extraction stage failed or produced no output, preventing normalisation.',
      evidence: [{ label: 'Error', value: 'Missing extraction context', type: 'negative' }],
      durationMs: performance.now() - start,
    };
  }

  // 1. Invoice Number Normalisation
  const rawInvoiceNo = ext.invoiceNumber.value;
  const normalisedInvoiceNo = rawInvoiceNo ? normalizeInvoiceNumber(rawInvoiceNo) : null;
  if (rawInvoiceNo && normalisedInvoiceNo) {
    evidence.push({
      label: 'Invoice Number',
      value: rawInvoiceNo !== normalisedInvoiceNo ? `"${rawInvoiceNo}" → "${normalisedInvoiceNo}"` : normalisedInvoiceNo,
      type: 'positive',
    });
  } else {
    evidence.push({
      label: 'Invoice Number',
      value: 'Not present',
      type: 'negative',
    });
  }

  // 2. Dates Normalisation
  const rawInvoiceDate = ext.invoiceDate.value;
  const isoInvoiceDate = rawInvoiceDate ? parseDate(rawInvoiceDate) : null;
  const rawDueDate = ext.dueDate.value;
  const isoDueDate = rawDueDate ? parseDate(rawDueDate) : null;

  if (isoInvoiceDate) {
    evidence.push({
      label: 'Invoice Date',
      value: rawInvoiceDate !== isoInvoiceDate ? `"${rawInvoiceDate}" → ${isoInvoiceDate}` : isoInvoiceDate,
      type: 'positive',
    });
  } else {
    evidence.push({
      label: 'Invoice Date',
      value: rawInvoiceDate ? `Unparseable ("${rawInvoiceDate}")` : 'Missing',
      type: 'negative',
    });
  }

  if (isoDueDate) {
    evidence.push({
      label: 'Due Date',
      value: isoDueDate,
      type: 'neutral',
    });
  }

  // 3. Currency Normalisation
  const rawCurrency = ext.currency.value;
  const currency = rawCurrency ? rawCurrency.trim().toUpperCase() : 'USD';
  evidence.push({
    label: 'Currency',
    value: currency,
    type: 'positive',
  });

  // 4. Financials & Tax-inclusive decomposition
  let subtotal = ext.subtotal.value;
  let taxAmount = ext.taxAmount.value;
  let taxRate = ext.taxRate.value;
  const total = ext.total.value;
  const taxIncluded = ext.taxIncluded.value ?? false;

  // If taxIncluded is true and total is present: decompose subtotal and tax
  if (taxIncluded && total != null && total > 0) {
    if (taxRate != null && taxRate > 0) {
      subtotal = Math.round((total / (1 + taxRate)) * 100) / 100;
      taxAmount = Math.round((total - subtotal) * 100) / 100;
      evidence.push({
        label: 'Tax Treatment',
        value: `Tax-inclusive decomposed: Subtotal ${subtotal}, Tax ${taxAmount} @ ${(taxRate * 100).toFixed(0)}%`,
        type: 'positive',
      });
    } else if (subtotal != null) {
      taxAmount = Math.round((total - subtotal) * 100) / 100;
      taxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 1000) / 1000 : 0;
      evidence.push({
        label: 'Tax Treatment',
        value: `Tax-inclusive inferred: Tax ${taxAmount}`,
        type: 'positive',
      });
    }
  } else {
    // If taxRate missing but subtotal and taxAmount exist
    if (taxRate == null && subtotal != null && taxAmount != null && subtotal > 0) {
      taxRate = Math.round((taxAmount / subtotal) * 1000) / 1000;
      evidence.push({
        label: 'Tax Rate',
        value: `Derived ${(taxRate * 100).toFixed(1)}%`,
        type: 'neutral',
      });
    }
    // If total missing but subtotal and taxAmount exist
    if (total == null && subtotal != null && taxAmount != null) {
      evidence.push({
        label: 'Total Reconstructed',
        value: `${subtotal + taxAmount}`,
        type: 'neutral',
      });
    }
  }

  // Normalised line items
  const lineItems: LineItem[] = (ext.lineItems.value ?? []).map((li) => ({
    description: li.description.trim(),
    qty: Number(li.qty) || 1,
    unitPrice: Number(li.unitPrice) || 0,
    amount: Number(li.amount) || Number(li.qty) * Number(li.unitPrice) || 0,
  }));

  const normalised: NormalisedData = {
    invoiceNumber: normalisedInvoiceNo,
    invoiceNumberRaw: rawInvoiceNo,
    invoiceDate: isoInvoiceDate,
    dueDate: isoDueDate,
    currency,
    vendorName: ext.vendorName.value ? ext.vendorName.value.trim() : null,
    vendorTaxId: ext.vendorTaxId.value ? ext.vendorTaxId.value.trim() : null,
    subtotal,
    taxAmount,
    taxRate,
    total,
    lineItems,
    poReference: ext.poReference.value ? ext.poReference.value.trim() : null,
    bankAccountLast4: ext.bankAccountLast4.value ? ext.bankAccountLast4.value.trim() : null,
    taxIncluded,
  };

  ctx.normalised = normalised;

  evidence.push({
    label: 'Line Items Count',
    value: `${lineItems.length}`,
    type: lineItems.length > 0 ? 'positive' : 'negative',
  });

  const durationMs = performance.now() - start;

  return {
    stage: 'NORMALISE',
    status: 'pass',
    headline: 'Data normalised to standard representations',
    reasoning: `Normalised invoice number to "${normalisedInvoiceNo || 'N/A'}", dates to ISO format (${isoInvoiceDate || 'N/A'}), currency to ${currency}, and validated ${lineItems.length} line item(s).`,
    evidence,
    durationMs,
    data: { normalised },
  };
}

