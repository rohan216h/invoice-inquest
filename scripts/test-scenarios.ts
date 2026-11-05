import { stageIngest } from '../src/lib/engine/ingest';
import { stageExtract } from '../src/lib/engine/extract';
import { stageNormalise } from '../src/lib/engine/normalise';
import { stageCompleteness } from '../src/lib/engine/completeness';
import { stageVendorCheck } from '../src/lib/engine/vendor-check';
import { stagePOMatch } from '../src/lib/engine/po-match';
import { stageMathAudit } from '../src/lib/engine/math-audit';
import { stageTolerance } from '../src/lib/engine/tolerance';
import { stageDuplicateCheck } from '../src/lib/engine/duplicate-check';
import { stageRiskDecision } from '../src/lib/engine/risk-decision';
import { DEFAULT_CONFIG } from '../src/lib/engine/types';
import type { PipelineContext, Vendor, PurchaseOrder, RunRecord } from '../src/lib/engine/types';
import vendorsData from '../data/vendors.json';
import posData from '../data/purchase_orders.json';
import fs from 'fs';
import path from 'path';

const samples = [
  { file: '01_happy_path_clean.pdf', expected: 'APPROVED' },
  { file: '02_split_po_instalment_2.pdf', expected: 'APPROVED' },
  { file: '02b_split_po_instalment_3_overbill.pdf', expected: 'NEEDS_REVIEW' },
  { file: '03_near_duplicate.pdf', expected: 'REJECTED' },
  { file: '04_missing_fields.pdf', expected: 'INFO_REQUESTED' },
  { file: '05_scanned_implied_po.png', expected: 'NEEDS_REVIEW' },
  { file: '06_unapproved_vendor.pdf', expected: 'REJECTED' },
];

async function runScenario(fileName: string) {
  const filePath = path.join(process.cwd(), 'public', 'samples', fileName);
  const fileBuffer = fs.readFileSync(filePath);
  const fileMimeType = fileName.endsWith('.png') ? 'image/png' : 'application/pdf';

  const ctx: PipelineContext = {
    fileBuffer,
    fileName,
    fileMimeType,
    fileSize: fileBuffer.length,
    vendors: vendorsData as unknown as Vendor[],
    purchaseOrders: posData as unknown as PurchaseOrder[],
    runHistory: [],
    config: DEFAULT_CONFIG,
    stageResults: [],
  };

  const s1 = await stageIngest(ctx);
  ctx.stageResults.push(s1);

  const s2 = await stageExtract(ctx);
  ctx.stageResults.push(s2);

  const s3 = await stageNormalise(ctx);
  ctx.stageResults.push(s3);

  const s4 = await stageCompleteness(ctx);
  ctx.stageResults.push(s4);

  const s5 = await stageVendorCheck(ctx);
  ctx.stageResults.push(s5);

  const s6 = await stagePOMatch(ctx);
  ctx.stageResults.push(s6);

  const s7 = await stageMathAudit(ctx);
  ctx.stageResults.push(s7);

  const s8 = await stageTolerance(ctx);
  ctx.stageResults.push(s8);

  const s9 = await stageDuplicateCheck(ctx);
  ctx.stageResults.push(s9);

  const s10 = await stageRiskDecision(ctx);
  ctx.stageResults.push(s10);

  return s10.verdict;
}

async function main() {
  console.log('🧪 Verifying All Sample Scenarios');
  console.log('=================================');
  let passed = true;

  for (const s of samples) {
    const verdict = await runScenario(s.file);
    const match = verdict.decision === s.expected;
    const icon = match ? '✅' : '❌';
    console.log(
      `${icon} ${s.file.padEnd(38)} → ${verdict.decision.padEnd(16)} (Expected: ${s.expected.padEnd(16)}) | Risk: ${verdict.riskScore}/100`
    );
    if (!match) passed = false;
  }

  if (passed) {
    console.log('\n🎉 ALL 7 SCENARIOS PRODUCED THEIR EXACT SPECIFIED DECISIONS!');
  } else {
    console.error('\n⚠️ Discrepancy detected in one or more scenarios');
    process.exit(1);
  }
}

main();

