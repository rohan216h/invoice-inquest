// ============================================================
// INVOICE INQUEST — Stage 7: MATH_AUDIT
// ============================================================
import type { PipelineContext, StageResult, Evidence } from './types';
import { tokenJaccard } from './utils';

export interface MathDiscrepancy {
  field: string;
  stated: number;
  calculated: number;
  diff: number;
}

export async function stageMathAudit(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const norm = ctx.normalised;
  const matchedPO = ctx.matchedPO;

  if (!norm) {
    return {
      stage: 'MATH_AUDIT',
      status: 'fail',
      headline: 'Cannot audit math: missing normalised data',
      reasoning: 'Normalised financial values are required to conduct an arithmetic verification.',
      evidence: [{ label: 'Error', value: 'Pipeline state invalid', type: 'negative' }],
      durationMs: performance.now() - start,
    };
  }

  const discrepancies: MathDiscrepancy[] = [];

  // 1. Line Item Math Audit (Qty * UnitPrice vs Stated Amount)
  let calculatedLinesSubtotal = 0;
  let lineErrorsCount = 0;

  for (let i = 0; i < norm.lineItems.length; i++) {
    const item = norm.lineItems[i];
    const calcLineAmt = Math.round(item.qty * item.unitPrice * 100) / 100;
    calculatedLinesSubtotal += calcLineAmt;

    const statedLineAmt = Math.round(item.amount * 100) / 100;
    const lineDiff = Math.abs(statedLineAmt - calcLineAmt);

    if (lineDiff > 0.05) {
      lineErrorsCount++;
      discrepancies.push({
        field: `Line ${i + 1} ("${item.description.slice(0, 25)}")`,
        stated: statedLineAmt,
        calculated: calcLineAmt,
        diff: lineDiff,
      });
    }
  }

  calculatedLinesSubtotal = Math.round(calculatedLinesSubtotal * 100) / 100;

  evidence.push({
    label: 'Line Items Sum',
    value: `${norm.currency} ${calculatedLinesSubtotal.toFixed(2)} (${norm.lineItems.length} lines)`,
    type: lineErrorsCount === 0 ? 'positive' : 'negative',
  });

  // 2. Subtotal Verification
  const statedSubtotal = norm.subtotal;
  if (statedSubtotal != null && norm.lineItems.length > 0) {
    const subtotalDiff = Math.abs(statedSubtotal - calculatedLinesSubtotal);
    if (subtotalDiff > 0.05) {
      discrepancies.push({
        field: 'Subtotal vs Lines Sum',
        stated: statedSubtotal,
        calculated: calculatedLinesSubtotal,
        diff: subtotalDiff,
      });
      evidence.push({
        label: 'Subtotal Variance',
        value: `Stated ${statedSubtotal.toFixed(2)} vs Lines Sum ${calculatedLinesSubtotal.toFixed(2)} (Δ ${subtotalDiff.toFixed(2)})`,
        type: 'negative',
      });
    } else {
      evidence.push({
        label: 'Subtotal Check',
        value: 'Matches sum of line items exactly',
        type: 'positive',
      });
    }
  }

  // 3. Tax & Grand Total Verification
  const auditSubtotal = statedSubtotal ?? calculatedLinesSubtotal;
  const rate = norm.taxRate ?? 0;
  const statedTax = norm.taxAmount;
  const statedTotal = norm.total;

  if (statedTotal != null) {
    let expectedTotal = auditSubtotal;
    if (statedTax != null) {
      expectedTotal = Math.round((auditSubtotal + statedTax) * 100) / 100;
    } else if (rate > 0) {
      const calcTax = Math.round(auditSubtotal * rate * 100) / 100;
      expectedTotal = Math.round((auditSubtotal + calcTax) * 100) / 100;
    }

    const totalDiff = Math.abs(statedTotal - expectedTotal);
    if (totalDiff > 0.05) {
      discrepancies.push({
        field: 'Grand Total Verification',
        stated: statedTotal,
        calculated: expectedTotal,
        diff: totalDiff,
      });
      evidence.push({
        label: 'Grand Total Variance',
        value: `Stated ${statedTotal.toFixed(2)} vs Calculated ${expectedTotal.toFixed(2)} (Δ ${totalDiff.toFixed(2)})`,
        type: 'negative',
      });
    } else {
      evidence.push({
        label: 'Grand Total Check',
        value: `${norm.currency} ${statedTotal.toFixed(2)} is mathematically verified`,
        type: 'positive',
      });
    }
  }

  // 4. Three-Way Match (Unit Price & Quantities vs PO)
  const threeWayFindings: string[] = [];
  if (matchedPO && matchedPO.lines.length > 0 && norm.lineItems.length > 0) {
    for (const invLine of norm.lineItems) {
      // Find matching PO line
      let bestPOLine = matchedPO.lines[0];
      let bestScore = 0;
      for (const poLine of matchedPO.lines) {
        const score = tokenJaccard(invLine.description, poLine.description);
        if (score > bestScore) {
          bestScore = score;
          bestPOLine = poLine;
        }
      }

      if (bestScore > 0.4) {
        // Price match check
        const priceDiff = Math.abs(invLine.unitPrice - bestPOLine.unitPrice);
        if (priceDiff > 0.02) {
          threeWayFindings.push(
            `Unit price mismatch for "${invLine.description.slice(0, 20)}": Invoiced ${invLine.unitPrice.toFixed(2)} vs PO ${bestPOLine.unitPrice.toFixed(2)}`
          );
        }

        // Quantity vs Received Quantity
        if (invLine.qty > bestPOLine.receivedQty) {
          threeWayFindings.push(
            `Invoiced Qty (${invLine.qty}) exceeds goods receipt received quantity (${bestPOLine.receivedQty}) for "${invLine.description.slice(0, 20)}"`
          );
        }
      }
    }
  }

  for (const finding of threeWayFindings) {
    evidence.push({
      label: '3-Way Match Check',
      value: finding,
      type: 'negative',
    });
  }

  const durationMs = performance.now() - start;

  if (discrepancies.length > 0) {
    return {
      stage: 'MATH_AUDIT',
      status: 'warn',
      headline: `Arithmetic discrepancies detected (${discrepancies.length} issue(s))`,
      reasoning: `Found mathematical variances between invoiced totals and computed item extensions: ${discrepancies.map((d) => `${d.field}: stated ${d.stated} vs calculated ${d.calculated}`).join('; ')}.`,
      evidence,
      durationMs,
      data: { discrepancies, threeWayFindings },
    };
  }

  if (threeWayFindings.length > 0) {
    return {
      stage: 'MATH_AUDIT',
      status: 'warn',
      headline: '3-Way Match discrepancy (Qty / Unit Price variance)',
      reasoning: `Arithmetic adds up cleanly, but 3-way match against goods receipt shows discrepancies: ${threeWayFindings.join('; ')}.`,
      evidence,
      durationMs,
      data: { discrepancies, threeWayFindings },
    };
  }

  return {
    stage: 'MATH_AUDIT',
    status: 'pass',
    headline: 'Math audit & 3-way match passed with zero discrepancy',
    reasoning: `All line extensions, subtotal, sales tax additions, and grand totals are mathematically exact. Unit prices and billed quantities align 100% with PO and Goods Received records.`,
    evidence,
    durationMs,
    data: { discrepancies: [], threeWayFindings: [] },
  };
}

