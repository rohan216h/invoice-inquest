// ============================================================
// INVOICE INQUEST — API Route: /api/process (Server-Sent Events)
// ============================================================
import { NextRequest } from 'next/server';
import type {
  PipelineContext,
  SSEEvent,
  Vendor,
  PurchaseOrder,
  RunRecord,
  PipelineConfig,
} from '@/lib/engine/types';
import { DEFAULT_CONFIG } from '@/lib/engine/types';
import { stageIngest } from '@/lib/engine/ingest';
import { stageExtract } from '@/lib/engine/extract';
import { stageNormalise } from '@/lib/engine/normalise';
import { stageCompleteness } from '@/lib/engine/completeness';
import { stageVendorCheck } from '@/lib/engine/vendor-check';
import { stagePOMatch } from '@/lib/engine/po-match';
import { stageMathAudit } from '@/lib/engine/math-audit';
import { stageTolerance } from '@/lib/engine/tolerance';
import { stageDuplicateCheck } from '@/lib/engine/duplicate-check';
import { stageRiskDecision } from '@/lib/engine/risk-decision';
import { v4 as uuidv4 } from 'uuid';

import vendorsData from '../../../../data/vendors.json';
import posData from '../../../../data/purchase_orders.json';

export const maxDuration = 60;
export const runtime = 'nodejs';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No invoice file supplied' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileName = file.name;
    const fileMimeType = file.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png');
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const fileSize = fileBuffer.length;

    // Parse client state if provided, otherwise use fallback data
    let vendors: Vendor[] = vendorsData as unknown as Vendor[];
    const vendorsJson = formData.get('vendors') as string | null;
    if (vendorsJson) {
      try {
        vendors = JSON.parse(vendorsJson);
      } catch {}
    }

    let purchaseOrders: PurchaseOrder[] = posData as unknown as PurchaseOrder[];
    const posJson = formData.get('purchaseOrders') as string | null;
    if (posJson) {
      try {
        purchaseOrders = JSON.parse(posJson);
      } catch {}
    }

    let runHistory: RunRecord[] = [];
    const historyJson = formData.get('runHistory') as string | null;
    if (historyJson) {
      try {
        runHistory = JSON.parse(historyJson);
      } catch {}
    }

    let config: PipelineConfig = DEFAULT_CONFIG;
    const configJson = formData.get('config') as string | null;
    if (configJson) {
      try {
        config = { ...DEFAULT_CONFIG, ...JSON.parse(configJson) };
      } catch {}
    }

    const runId = uuidv4();

    // Prepare pipeline execution context
    const ctx: PipelineContext = {
      fileBuffer,
      fileName,
      fileMimeType,
      fileSize,
      vendors,
      purchaseOrders,
      runHistory,
      config,
      stageResults: [],
    };

    // Return Server-Sent Events stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SSEEvent) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          // 1. INGEST
          send({ type: 'stage_start', stage: 'INGEST' });
          await delay(350);
          const ingestRes = await stageIngest(ctx);
          ctx.stageResults.push(ingestRes);
          send({ type: 'stage_result', result: ingestRes });

          if (ingestRes.status === 'fail') {
            const riskRes = await stageRiskDecision(ctx);
            send({ type: 'verdict', verdict: riskRes.verdict });
            send({ type: 'done', runId });
            controller.close();
            return;
          }

          // 2. EXTRACT
          send({ type: 'stage_start', stage: 'EXTRACT' });
          await delay(450);
          const extractRes = await stageExtract(ctx);
          ctx.stageResults.push(extractRes);
          send({ type: 'stage_result', result: extractRes });
          if (ctx.extraction) {
            send({
              type: 'extraction',
              extraction: ctx.extraction,
              engine: ctx.extractionEngine || 'cached',
            });
          }

          // 3. NORMALISE
          send({ type: 'stage_start', stage: 'NORMALISE' });
          await delay(350);
          const normRes = await stageNormalise(ctx);
          ctx.stageResults.push(normRes);
          send({ type: 'stage_result', result: normRes });

          // 4. COMPLETENESS
          send({ type: 'stage_start', stage: 'COMPLETENESS' });
          await delay(350);
          const compRes = await stageCompleteness(ctx);
          ctx.stageResults.push(compRes);
          send({ type: 'stage_result', result: compRes });

          // 5. VENDOR CHECK
          send({ type: 'stage_start', stage: 'VENDOR_CHECK' });
          await delay(400);
          const vendorRes = await stageVendorCheck(ctx);
          ctx.stageResults.push(vendorRes);
          send({ type: 'stage_result', result: vendorRes });

          // 6. PO MATCH
          send({ type: 'stage_start', stage: 'PO_MATCH' });
          await delay(450);
          const poRes = await stagePOMatch(ctx);
          ctx.stageResults.push(poRes);
          send({ type: 'stage_result', result: poRes });

          // 7. MATH AUDIT
          send({ type: 'stage_start', stage: 'MATH_AUDIT' });
          await delay(400);
          const mathRes = await stageMathAudit(ctx);
          ctx.stageResults.push(mathRes);
          send({ type: 'stage_result', result: mathRes });

          // 8. TOLERANCE
          send({ type: 'stage_start', stage: 'TOLERANCE' });
          await delay(350);
          const tolRes = await stageTolerance(ctx);
          ctx.stageResults.push(tolRes);
          send({ type: 'stage_result', result: tolRes });

          // 9. DUPLICATE CHECK
          send({ type: 'stage_start', stage: 'DUPLICATE_CHECK' });
          await delay(400);
          const dupRes = await stageDuplicateCheck(ctx);
          ctx.stageResults.push(dupRes);
          send({ type: 'stage_result', result: dupRes });

          // 10. RISK & DECISION
          send({ type: 'stage_start', stage: 'RISK_DECISION' });
          await delay(450);
          const riskRes = await stageRiskDecision(ctx);
          ctx.stageResults.push(riskRes);
          send({ type: 'stage_result', result: riskRes });
          send({ type: 'verdict', verdict: riskRes.verdict });

          await delay(200);
          send({ type: 'done', runId });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          send({ type: 'error', message: errMsg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

