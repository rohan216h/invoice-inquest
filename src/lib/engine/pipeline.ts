// ============================================================
// INVOICE INQUEST — Pipeline Orchestrator
// ============================================================
import type {
  PipelineContext,
  StageResult,
  Verdict,
  ExtractionResult,
  ExtractionEngine,
  PipelineConfig,
  Vendor,
  PurchaseOrder,
  RunRecord,
} from './types';
import { stageIngest } from './ingest';
import { stageExtract } from './extract';
import { stageNormalise } from './normalise';
import { stageCompleteness } from './completeness';
import { stageVendorCheck } from './vendor-check';
import { stagePOMatch } from './po-match';
import { stageMathAudit } from './math-audit';
import { stageTolerance } from './tolerance';
import { stageDuplicateCheck } from './duplicate-check';
import { stageRiskDecision } from './risk-decision';

export interface PipelineExecutionResult {
  stages: StageResult[];
  verdict: Verdict;
  extraction: ExtractionResult;
  extractionEngine: ExtractionEngine;
  processingTimeMs: number;
}

/**
 * Executes the full 10-stage invoice processing pipeline.
 */
export async function runPipeline(
  ctx: PipelineContext,
  onStageComplete?: (stage: StageResult) => void
): Promise<PipelineExecutionResult> {
  const startTime = performance.now();
  ctx.stageResults = [];

  // Stage 1: INGEST
  const ingestResult = await stageIngest(ctx);
  ctx.stageResults.push(ingestResult);
  onStageComplete?.(ingestResult);
  if (ingestResult.status === 'fail') {
    const riskResult = await stageRiskDecision(ctx);
    return {
      stages: ctx.stageResults,
      verdict: riskResult.verdict,
      extraction: ctx.extraction!,
      extractionEngine: ctx.extractionEngine || 'heuristic',
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  // Stage 2: EXTRACT
  const extractResult = await stageExtract(ctx);
  ctx.stageResults.push(extractResult);
  onStageComplete?.(extractResult);

  // Stage 3: NORMALISE
  const normaliseResult = await stageNormalise(ctx);
  ctx.stageResults.push(normaliseResult);
  onStageComplete?.(normaliseResult);

  // Stage 4: COMPLETENESS
  const completenessResult = await stageCompleteness(ctx);
  ctx.stageResults.push(completenessResult);
  onStageComplete?.(completenessResult);

  // Stage 5: VENDOR CHECK
  const vendorResult = await stageVendorCheck(ctx);
  ctx.stageResults.push(vendorResult);
  onStageComplete?.(vendorResult);

  // Stage 6: PO MATCH
  const poResult = await stagePOMatch(ctx);
  ctx.stageResults.push(poResult);
  onStageComplete?.(poResult);

  // Stage 7: MATH AUDIT
  const mathResult = await stageMathAudit(ctx);
  ctx.stageResults.push(mathResult);
  onStageComplete?.(mathResult);

  // Stage 8: TOLERANCE & CUMULATIVE
  const toleranceResult = await stageTolerance(ctx);
  ctx.stageResults.push(toleranceResult);
  onStageComplete?.(toleranceResult);

  // Stage 9: DUPLICATE CHECK
  const duplicateResult = await stageDuplicateCheck(ctx);
  ctx.stageResults.push(duplicateResult);
  onStageComplete?.(duplicateResult);

  // Stage 10: RISK & DECISION
  const riskResult = await stageRiskDecision(ctx);
  ctx.stageResults.push(riskResult);
  onStageComplete?.(riskResult);

  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    stages: ctx.stageResults,
    verdict: riskResult.verdict,
    extraction: ctx.extraction!,
    extractionEngine: ctx.extractionEngine || 'cached',
    processingTimeMs,
  };
}

/**
 * Re-evaluates stages 3 through 10 client-side when tolerance or configuration sliders are changed.
 * This runs purely in browser memory with zero network delay.
 */
export async function runPipelineClientSide(params: {
  extraction: ExtractionResult;
  fileName: string;
  config: PipelineConfig;
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  runHistory: RunRecord[];
}): Promise<{ stages: StageResult[]; verdict: Verdict }> {
  const ctx: PipelineContext = {
    fileBuffer: Buffer.from(''),
    fileName: params.fileName,
    fileMimeType: params.fileName.endsWith('.png') ? 'image/png' : 'application/pdf',
    fileSize: 1024,
    vendors: params.vendors,
    purchaseOrders: params.purchaseOrders,
    runHistory: params.runHistory,
    config: params.config,
    extraction: params.extraction,
    extractionEngine: 'cached',
    stageResults: [],
  };

  // Re-run stages 3 to 10
  const normaliseResult = await stageNormalise(ctx);
  ctx.stageResults.push(normaliseResult);

  const completenessResult = await stageCompleteness(ctx);
  ctx.stageResults.push(completenessResult);

  const vendorResult = await stageVendorCheck(ctx);
  ctx.stageResults.push(vendorResult);

  const poResult = await stagePOMatch(ctx);
  ctx.stageResults.push(poResult);

  const mathResult = await stageMathAudit(ctx);
  ctx.stageResults.push(mathResult);

  const toleranceResult = await stageTolerance(ctx);
  ctx.stageResults.push(toleranceResult);

  const duplicateResult = await stageDuplicateCheck(ctx);
  ctx.stageResults.push(duplicateResult);

  const riskResult = await stageRiskDecision(ctx);
  ctx.stageResults.push(riskResult);

  return {
    stages: ctx.stageResults,
    verdict: riskResult.verdict,
  };
}

