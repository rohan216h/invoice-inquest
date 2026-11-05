// ============================================================
// INVOICE INQUEST — Stage 10: RISK & DECISION
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  PipelineContext,
  StageResult,
  Evidence,
  Verdict,
  Decision,
  RuleFired,
} from './types';

export async function stageRiskDecision(ctx: PipelineContext): Promise<StageResult & { verdict: Verdict }> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  const rulesFired: RuleFired[] = [];
  const stages = ctx.stageResults;

  // Retrieve stage outcomes
  const ingest = stages.find((s) => s.stage === 'INGEST');
  const extract = stages.find((s) => s.stage === 'EXTRACT');
  const normalise = stages.find((s) => s.stage === 'NORMALISE');
  const completeness = stages.find((s) => s.stage === 'COMPLETENESS');
  const vendorCheck = stages.find((s) => s.stage === 'VENDOR_CHECK');
  const poMatch = stages.find((s) => s.stage === 'PO_MATCH');
  const mathAudit = stages.find((s) => s.stage === 'MATH_AUDIT');
  const tolerance = stages.find((s) => s.stage === 'TOLERANCE');
  const duplicate = stages.find((s) => s.stage === 'DUPLICATE_CHECK');

  // 1. Calculate Weighted Risk Score (0 - 100)
  let riskScore = 5; // Baseline low risk

  // Ingest check
  if (ingest?.status === 'fail') {
    riskScore += 90;
    rulesFired.push({
      rule: 'RULE_INGEST_INVALID_PAYLOAD',
      result: 'fail',
      evidence: ingest.reasoning,
      weight: 90,
    });
  }

  // Completeness check
  const completenessData = completeness?.data as { missingFields?: string[]; emailDraft?: string } | undefined;
  const missingFields = completenessData?.missingFields ?? [];
  if (completeness?.status === 'fail' && missingFields.length > 0) {
    riskScore += 40;
    rulesFired.push({
      rule: 'RULE_COMPLETENESS_MISSING_CRITICAL_FIELDS',
      result: 'fail',
      evidence: `Missing mandatory invoice fields: ${missingFields.join(', ')}`,
      weight: 40,
    });
  } else {
    rulesFired.push({
      rule: 'RULE_COMPLETENESS_MANDATORY_FIELDS_PRESENT',
      result: 'pass',
      evidence: 'All required invoice headers and totals present',
      weight: 0,
    });
  }

  // Vendor check
  const isUnapprovedVendor = ctx.matchedVendor && !ctx.matchedVendor.approved;
  const isUnknownVendor = !ctx.matchedVendor;
  const isBankMismatch = (vendorCheck?.data as { bankMismatch?: boolean })?.bankMismatch;

  if (isUnapprovedVendor) {
    riskScore += 65;
    rulesFired.push({
      rule: 'RULE_VENDOR_UNAPPROVED_SUPPLIER',
      result: 'fail',
      evidence: `Supplier "${ctx.matchedVendor?.legalName}" has not completed vendor onboarding approval`,
      weight: 65,
    });
  } else if (isUnknownVendor) {
    riskScore += 60;
    rulesFired.push({
      rule: 'RULE_VENDOR_UNKNOWN_ENTITY',
      result: 'fail',
      evidence: 'Supplier name cannot be matched to Vendor Master database',
      weight: 60,
    });
  } else {
    rulesFired.push({
      rule: 'RULE_VENDOR_APPROVED_STATUS',
      result: 'pass',
      evidence: `Verified approved supplier ${ctx.matchedVendor?.legalName}`,
      weight: 0,
    });
  }

  if (isBankMismatch) {
    riskScore += 45;
    rulesFired.push({
      rule: 'RULE_FRAUD_BANK_DETAILS_MODIFIED',
      result: 'warn',
      evidence: `Remittance account ends in ****${ctx.normalised?.bankAccountLast4}, differing from registered master (${ctx.matchedVendor?.bankAccountLast4})`,
      weight: 45,
    });
  }

  // Duplicate check
  const isDuplicateDetected = duplicate?.status === 'fail';
  if (isDuplicateDetected) {
    riskScore += 80;
    rulesFired.push({
      rule: 'RULE_DUPLICATE_PRIOR_SUBMISSION_FLAGGED',
      result: 'fail',
      evidence: duplicate.reasoning,
      weight: 80,
    });
  } else {
    rulesFired.push({
      rule: 'RULE_DUPLICATE_LEDGER_CHECK',
      result: 'pass',
      evidence: 'No matching prior invoice record found in system history',
      weight: 0,
    });
  }

  // PO Match
  const poConfidence = ctx.poMatchConfidence ?? 0;
  if (poMatch?.status === 'warn') {
    riskScore += 25;
    rulesFired.push({
      rule: 'RULE_PO_INFERENCE_LOW_CONFIDENCE',
      result: 'warn',
      evidence: `Fuzzy PO alignment confidence (${Math.round(poConfidence * 100)}%) is below acceptable threshold`,
      weight: 25,
    });
  } else if (poMatch?.status === 'pass') {
    rulesFired.push({
      rule: 'RULE_PO_MATCH_VALIDATED',
      result: 'pass',
      evidence: `Linked to PO ${ctx.matchedPO?.poNumber} with ${Math.round(poConfidence * 100)}% match confidence`,
      weight: 0,
    });
  }

  // Tolerance & Cumulative
  const toleranceData = tolerance?.data as { isOverbilled?: boolean; overage?: number } | undefined;
  if (tolerance?.status === 'warn' && toleranceData?.isOverbilled) {
    riskScore += 35;
    rulesFired.push({
      rule: 'RULE_TOLERANCE_CUMULATIVE_OVERBILLING',
      result: 'warn',
      evidence: `Total billed amount exceeds authorized PO ceiling by $${toleranceData.overage?.toFixed(2)}`,
      weight: 35,
    });
  } else if (tolerance?.status === 'pass') {
    rulesFired.push({
      rule: 'RULE_TOLERANCE_BUDGET_ADHERENCE',
      result: 'pass',
      evidence: 'Billed amount and cumulative commitment remain within authorized tolerance',
      weight: 0,
    });
  }

  // Math Audit
  if (mathAudit?.status === 'warn') {
    riskScore += 20;
    rulesFired.push({
      rule: 'RULE_MATH_ARITHMETIC_OR_3WAY_VARIANCE',
      result: 'warn',
      evidence: mathAudit.reasoning,
      weight: 20,
    });
  } else if (mathAudit?.status === 'pass') {
    rulesFired.push({
      rule: 'RULE_MATH_LINE_ITEM_EXTENSIONS_EXACT',
      result: 'pass',
      evidence: 'Line items, tax calculations, and grand total add up with 0 arithmetic discrepancy',
      weight: 0,
    });
  }

  // Extraction confidence check
  if (extract?.status === 'warn') {
    riskScore += 15;
    rulesFired.push({
      rule: 'RULE_EXTRACTION_LOW_CONFIDENCE',
      result: 'warn',
      evidence: 'Key fields were extracted with low optical/model confidence',
      weight: 15,
    });
  }

  // Bound risk score between 0 and 100
  riskScore = Math.min(100, Math.max(0, riskScore));

  // 2. Strict Precedence Hierarchy
  // INFO_REQUESTED (missing critical fields) > REJECTED (unapproved vendor / confirmed duplicate) > NEEDS_REVIEW (bank change, low PO confidence, over tolerance, low extraction) > APPROVED
  let decision: Decision;
  let recommendedAction = '';
  let defaultSummary = '';

  if (completeness?.status === 'fail' && missingFields.length > 0) {
    decision = 'INFO_REQUESTED';
    recommendedAction = 'Send auto-generated clarification email to vendor requesting revised invoice with missing fields.';
    defaultSummary = `Processing halted because mandatory invoice headers (${missingFields.join(', ')}) are absent. To prevent compliance exceptions and ensure accurate ledger entry, an automated request for clarification has been generated for the supplier.`;
  } else if (isUnapprovedVendor) {
    decision = 'REJECTED';
    recommendedAction = 'Reject invoice immediately and inform supplier that procurement onboarding must be completed before billing.';
    defaultSummary = `Invoice automatically REJECTED. Supplier "${ctx.matchedVendor?.legalName}" is marked as unapproved in company vendor master. No payments may be authorized to non-vetted entities under corporate procurement policy.`;
  } else if (isDuplicateDetected) {
    decision = 'REJECTED';
    recommendedAction = 'Hold payment permanently. Verify with supplier whether this is an erroneous re-billing or re-transmission of a settled claim.';
    defaultSummary = `Invoice REJECTED due to anti-fraud duplicate detection. Identical invoice or financial footprint (${ctx.normalised?.currency} ${ctx.normalised?.total?.toFixed(2)}) has already been processed in accounts payable history. Disbursement blocked to protect against duplicate settlement.`;
  } else if (isBankMismatch) {
    decision = 'NEEDS_REVIEW';
    recommendedAction = 'Escalate to Accounts Payable Lead to perform dual-call callback verification on the new bank remittance details.';
    defaultSummary = `Invoice placed on hold for human review due to a High-Risk Bank Detail Change. The remittance account on this document (ending in ****${ctx.normalised?.bankAccountLast4}) conflicts with our verified Vendor Master records. Although all financial calculations match, funds must not be released until banking details are confirmed via out-of-band supplier verification.`;
  } else if (toleranceData?.isOverbilled) {
    decision = 'NEEDS_REVIEW';
    recommendedAction = 'Request purchase order change order or budget extension from purchasing department to cover excess balance.';
    defaultSummary = `Invoice flagged for Accounts Payable Review due to cumulative overbilling. Processing this invoice of ${ctx.normalised?.currency} ${ctx.normalised?.subtotal?.toFixed(2)} would cause total spend against PO ${ctx.matchedPO?.poNumber} to exceed authorized limits by $${toleranceData.overage?.toFixed(2)}. Requires procurement manager authorization.`;
  } else if (poMatch?.status === 'warn') {
    decision = 'NEEDS_REVIEW';
    recommendedAction = 'Manually assign or confirm the correct Purchase Order reference in the AP queue.';
    defaultSummary = `Invoice flagged for AP review. No unambiguous purchase order could be linked automatically (top inference match scored ${Math.round(poConfidence * 100)}%). Manual verification is required to confirm whether this corresponds to PO ${ctx.matchedPO?.poNumber || 'an unlisted PO'}.`;
  } else if (mathAudit?.status === 'warn' || extract?.status === 'warn' || riskScore > 35) {
    decision = 'NEEDS_REVIEW';
    recommendedAction = 'Audit line item amounts and optical capture fidelity before clearing for payment.';
    defaultSummary = `Invoice placed in review queue due to audit discrepancies. Line extension or optical confidence tolerances were breached, requiring manual clearance by an AP specialist.`;
  } else {
    decision = 'APPROVED';
    recommendedAction = `Authorize straight-through payment processing under ${ctx.matchedVendor?.paymentTerms || 'Net 30'} terms.`;
    defaultSummary = `Invoice passed all 9 automated intake checks with zero exceptions. Supplier is approved, 3-way match against PO ${ctx.matchedPO?.poNumber} is verified, arithmetic is exact, and amount is well within budget tolerances. Cleared for Straight-Through Processing.`;
  }

  // 3. Optional Gemini Polish for non-technical AP Manager (purely wording rewrite, NEVER changes decision)
  let executiveSummary = defaultSummary;
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      });
      const prompt = `You are an Accounts Payable Assistant. Rewrite this single paragraph executive summary for a non-technical AP Manager.
DO NOT change the decision (${decision}), DO NOT change the numbers or facts. Just make the prose clear, crisp, and professional.
Original: "${defaultSummary}"
Output ONLY the revised paragraph:`;
      const aiResp = await model.generateContent(prompt);
      const text = aiResp.response.text()?.trim();
      if (text && text.length > 20) {
        executiveSummary = text;
      }
    } catch {
      // Fallback to deterministic template smoothly
    }
  }

  // Overall system confidence
  const extractionConf = ctx.extraction?.invoiceNumber.confidence ?? 0.8;
  const overallConfidence = Math.round(
    ((extractionConf + (ctx.poMatchConfidence ?? 0.9) + (riskScore > 50 ? 0.95 : 0.9)) / 3) * 100
  ) / 100;

  // Build final Verdict
  const duplicateData = duplicate?.data as { duplicateComparison?: Verdict['duplicateComparison'] } | undefined;
  const verdict: Verdict = {
    decision,
    riskScore,
    confidence: overallConfidence,
    executiveSummary,
    ruleTrace: rulesFired,
    recommendedAction,
    emailDraft: completenessData?.emailDraft,
    duplicateComparison: duplicateData?.duplicateComparison,
  };

  evidence.push({
    label: 'Final Verdict',
    value: decision,
    type: decision === 'APPROVED' ? 'positive' : decision === 'INFO_REQUESTED' ? 'neutral' : 'negative',
  });
  evidence.push({
    label: 'Calculated Risk Score',
    value: `${riskScore}/100`,
    type: riskScore < 25 ? 'positive' : riskScore < 60 ? 'neutral' : 'negative',
  });
  evidence.push({
    label: 'Rules Evaluated',
    value: `${rulesFired.length} rules checked`,
    type: 'neutral',
  });

  const durationMs = performance.now() - start;

  return {
    stage: 'RISK_DECISION',
    status: decision === 'APPROVED' ? 'pass' : decision === 'INFO_REQUESTED' ? 'info' : decision === 'NEEDS_REVIEW' ? 'warn' : 'fail',
    headline: `Decision: ${decision.replace('_', ' ')} (Risk: ${riskScore}/100)`,
    reasoning: executiveSummary,
    evidence,
    durationMs,
    data: { verdict },
    verdict,
  };
}

