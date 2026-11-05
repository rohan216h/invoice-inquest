// ============================================================
// INVOICE INQUEST — Stage 6: PO_MATCH
// ============================================================
import type { PipelineContext, StageResult, Evidence, PurchaseOrder } from './types';
import { tokenJaccard, daysBetween, normalizeInvoiceNumber } from './utils';

export interface POCandidateScore {
  po: PurchaseOrder;
  totalScore: number;
  lineScore: number;
  amountScore: number;
  dateScore: number;
  statusScore: number;
}

export async function stagePOMatch(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const norm = ctx.normalised;
  const pos = ctx.purchaseOrders;
  const threshold = ctx.config.poMatchConfidenceThreshold;

  if (!norm) {
    return {
      stage: 'PO_MATCH',
      status: 'fail',
      headline: 'Normalised invoice data missing',
      reasoning: 'Cannot perform Purchase Order matching without normalised data.',
      evidence: [{ label: 'Error', value: 'Pipeline state invalid', type: 'negative' }],
      durationMs: performance.now() - start,
    };
  }

  // 1. Explicit PO Reference Check
  if (norm.poReference) {
    const cleanRef = normalizeInvoiceNumber(norm.poReference);
    const exactMatch = pos.find((po) => normalizeInvoiceNumber(po.poNumber) === cleanRef);

    if (exactMatch) {
      ctx.matchedPO = exactMatch;
      ctx.poMatchConfidence = 1.0;

      evidence.push({
        label: 'PO Lookup Method',
        value: `Explicit Reference ("${norm.poReference}")`,
        type: 'positive',
      });
      evidence.push({
        label: 'Matched PO',
        value: `${exactMatch.poNumber} (${exactMatch.status.toUpperCase()})`,
        type: 'positive',
      });
      evidence.push({
        label: 'PO Total Value',
        value: `${exactMatch.currency} ${exactMatch.total.toFixed(2)}`,
        type: 'neutral',
      });
      evidence.push({
        label: 'Billed to Date',
        value: `${exactMatch.currency} ${exactMatch.amountBilledToDate.toFixed(2)}`,
        type: 'neutral',
      });

      return {
        stage: 'PO_MATCH',
        status: 'pass',
        headline: `Exact PO match: ${exactMatch.poNumber}`,
        reasoning: `Found direct match for PO reference "${norm.poReference}" in open purchase orders ledger. Current PO status: ${exactMatch.status}.`,
        evidence,
        durationMs: performance.now() - start,
        data: { matchedPO: exactMatch, confidence: 1.0, matchType: 'explicit' },
      };
    }
  }

  // 2. Inferred PO Matching
  evidence.push({
    label: 'Explicit PO Reference',
    value: norm.poReference || 'None on document — initiating fuzzy inference engine',
    type: norm.poReference ? 'negative' : 'neutral',
  });

  // Candidate pool: POs for matched vendor, or all POs if vendor not resolved
  const candidatePool = ctx.matchedVendor
    ? pos.filter((p) => p.vendorId === ctx.matchedVendor?.id)
    : pos;

  if (candidatePool.length === 0) {
    ctx.poMatchConfidence = 0;
    return {
      stage: 'PO_MATCH',
      status: 'warn',
      headline: 'No Purchase Orders found for supplier',
      reasoning: `No active or historical Purchase Orders found for vendor ${ctx.matchedVendor?.legalName || 'Unknown'}. This may be a non-PO direct expenditure.`,
      evidence,
      durationMs: performance.now() - start,
      data: { confidence: 0 },
    };
  }

  // Score candidate POs
  const scoredCandidates: POCandidateScore[] = candidatePool.map((po) => {
    // A. Line items similarity
    let lineScore = 0;
    if (norm.lineItems.length > 0 && po.lines.length > 0) {
      let totalLineSim = 0;
      for (const invLine of norm.lineItems) {
        let bestMatchForLine = 0;
        for (const poLine of po.lines) {
          const sim = tokenJaccard(invLine.description, poLine.description);
          if (sim > bestMatchForLine) bestMatchForLine = sim;
        }
        totalLineSim += bestMatchForLine;
      }
      lineScore = totalLineSim / norm.lineItems.length;
    }

    // B. Amount proximity
    let amountScore = 0;
    const invAmt = norm.subtotal ?? norm.total ?? 0;
    const poRemaining = Math.max(0, po.total - po.amountBilledToDate);
    const targetAmt = poRemaining > 0 ? poRemaining : po.total;

    if (invAmt > 0 && targetAmt > 0) {
      const diff = Math.abs(invAmt - targetAmt);
      const maxVal = Math.max(invAmt, targetAmt);
      amountScore = Math.max(0, 1 - diff / maxVal);
    }

    // C. Date proximity
    let dateScore = 0.5;
    if (norm.invoiceDate && po.createdDate) {
      const days = daysBetween(norm.invoiceDate, po.createdDate);
      dateScore = Math.max(0, 1 - days / 180);
    }

    // D. Status score
    const statusScore = po.status === 'open' ? 1.0 : po.status === 'partial' ? 0.9 : 0.2;

    // Weighted sum
    const totalScore = lineScore * 0.45 + amountScore * 0.3 + dateScore * 0.15 + statusScore * 0.1;

    return { po, totalScore, lineScore, amountScore, dateScore, statusScore };
  });

  scoredCandidates.sort((a, b) => b.totalScore - a.totalScore);
  const best = scoredCandidates[0];
  const runnerUp = scoredCandidates[1];

  if (best && best.totalScore >= threshold) {
    ctx.matchedPO = best.po;
    ctx.poMatchConfidence = Math.round(best.totalScore * 100) / 100;

    evidence.push({
      label: 'Inferred PO',
      value: `${best.po.poNumber} (Confidence: ${(best.totalScore * 100).toFixed(0)}%)`,
      type: 'positive',
    });
    evidence.push({
      label: 'Line Item Similarity',
      value: `${(best.lineScore * 100).toFixed(0)}% token alignment`,
      type: 'positive',
    });
    evidence.push({
      label: 'Amount Alignment',
      value: `${(best.amountScore * 100).toFixed(0)}% proximity`,
      type: 'positive',
    });

    if (runnerUp) {
      evidence.push({
        label: 'Runner-up Candidate',
        value: `${runnerUp.po.poNumber} (${(runnerUp.totalScore * 100).toFixed(0)}% score)`,
        type: 'neutral',
      });
    }

    return {
      stage: 'PO_MATCH',
      status: 'pass',
      headline: `Inferred PO Match: ${best.po.poNumber} (${(best.totalScore * 100).toFixed(0)}% confidence)`,
      reasoning: `No explicit PO was written on the invoice, but fuzzy inference successfully linked line item descriptions and order amounts to PO ${best.po.poNumber} with ${(best.totalScore * 100).toFixed(0)}% confidence (exceeds ${(threshold * 100).toFixed(0)}% threshold).`,
      evidence,
      durationMs: performance.now() - start,
      data: {
        matchedPO: best.po,
        confidence: best.totalScore,
        matchType: 'inferred',
        runnerUp: runnerUp ? { poNumber: runnerUp.po.poNumber, score: runnerUp.totalScore } : null,
      },
    };
  }

  // Low confidence match
  const topScore = best ? best.totalScore : 0;
  ctx.poMatchConfidence = Math.round(topScore * 100) / 100;
  if (best) {
    ctx.matchedPO = best.po; // Keep for downstream tolerance/line analysis with warning
  }

  evidence.push({
    label: 'Best Candidate',
    value: best ? `${best.po.poNumber} (${(best.totalScore * 100).toFixed(0)}% confidence)` : 'None',
    type: 'negative',
  });
  evidence.push({
    label: 'Required Threshold',
    value: `${(threshold * 100).toFixed(0)}%`,
    type: 'neutral',
  });

  return {
    stage: 'PO_MATCH',
    status: 'warn',
    headline: `Low PO match confidence (${(topScore * 100).toFixed(0)}% vs ${(threshold * 100).toFixed(0)}% req)`,
    reasoning: `Could not confidently match invoice to an open Purchase Order. Highest candidate ${best ? best.po.poNumber : 'none'} scored only ${(topScore * 100).toFixed(0)}%, which is below the strict ${(threshold * 100).toFixed(0)}% confidence bar for auto-matching.`,
    evidence,
    durationMs: performance.now() - start,
    data: {
      matchedPO: best?.po,
      confidence: topScore,
      matchType: 'low_confidence',
    },
  };
}
