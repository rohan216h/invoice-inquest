// ============================================================
// INVOICE INQUEST — Stage 2: EXTRACT
// ============================================================
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ExtractionResultSchema } from './types';
import type {
  PipelineContext,
  StageResult,
  Evidence,
  ExtractionResult,
  ExtractionEngine,
} from './types';
import cachedExtractionsData from '../../../data/cached-extractions.json';

// ── Gemini Prompt ────────────────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `You are a specialist invoice data extraction AI. Extract all structured data from this invoice document and return it as a JSON object.

Return EXACTLY this JSON structure (all fields required):
{
  "vendorName": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "vendorTaxId": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "invoiceNumber": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "invoiceDate": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "dueDate": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "currency": { "value": "3-letter code or null", "confidence": 0.0-1.0, "source": "where found" },
  "poReference": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "lineItems": { "value": [{"description":"string","qty":1,"unitPrice":0.00,"amount":0.00}], "confidence": 0.0-1.0, "source": "where found" },
  "subtotal": { "value": 0.00, "confidence": 0.0-1.0, "source": "where found" },
  "taxAmount": { "value": 0.00, "confidence": 0.0-1.0, "source": "where found" },
  "taxRate": { "value": 0.00, "confidence": 0.0-1.0, "source": "where found" },
  "total": { "value": 0.00, "confidence": 0.0-1.0, "source": "where found" },
  "taxIncluded": { "value": false, "confidence": 0.0-1.0, "source": "where found" },
  "bankAccountLast4": { "value": "string or null", "confidence": 0.0-1.0, "source": "where found" },
  "documentQuality": { "value": "clean|scanned|poor", "confidence": 1.0, "source": "assessment" },
  "notes": { "value": "any additional notes or null", "confidence": 1.0, "source": "assessment" }
}

Rules:
- Set confidence 0.9-1.0 for clearly visible data, 0.5-0.8 for inferred data, 0.1-0.4 for guessed data
- Use null for truly absent fields with confidence 0
- taxRate should be a decimal (e.g. 0.08 for 8%)
- taxIncluded = true if the total includes tax and no separate subtotal is shown
- Return ONLY valid JSON, no markdown, no commentary`;

const GEMINI_REPAIR_PROMPT = `The previous extraction had validation errors. Please fix your JSON output to match the required schema exactly. Every field must be an object with "value", "confidence", and optionally "source". Return ONLY valid JSON.`;

// ── Mime type map ────────────────────────────────────────────
function geminiMimeType(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'application/pdf',
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
  };
  return map[mime] ?? mime;
}

// ── Gemini extraction ────────────────────────────────────────
async function extractWithGemini(
  ctx: PipelineContext
): Promise<ExtractionResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const inlineData = {
      inlineData: {
        data: ctx.fileBuffer.toString('base64'),
        mimeType: geminiMimeType(ctx.fileMimeType),
      },
    };

    // First attempt
    const result = await model.generateContent([
      GEMINI_SYSTEM_PROMPT,
      inlineData,
    ]);
    const text = result.response.text();
    const jsonStr = extractJSON(text);
    const parsed = JSON.parse(jsonStr);
    const validated = ExtractionResultSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    // Retry with repair prompt
    const retryResult = await model.generateContent([
      GEMINI_REPAIR_PROMPT,
      `Previous output:\n${jsonStr}\n\nValidation errors:\n${JSON.stringify(validated.error.issues, null, 2)}`,
      inlineData,
    ]);
    const retryText = retryResult.response.text();
    const retryJsonStr = extractJSON(retryText);
    const retryParsed = JSON.parse(retryJsonStr);
    const retryValidated = ExtractionResultSchema.safeParse(retryParsed);

    if (retryValidated.success) {
      return retryValidated.data;
    }

    // Both attempts failed
    return null;
  } catch {
    // API error — fall through
    return null;
  }
}

/** Strip markdown code fences and extract JSON */
function extractJSON(text: string): string {
  // Remove ```json ... ``` wrappers
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find { ... } directly
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

// ── Heuristic extraction (pdf-parse) ─────────────────────────
async function extractWithHeuristic(
  ctx: PipelineContext
): Promise<ExtractionResult | null> {
  // Heuristic only works for PDFs — we need text content
  if (ctx.fileMimeType !== 'application/pdf') {
    return null;
  }

  try {
    // Dynamic import for pdf-parse (CommonJS module)
    const pdfModule = await import('pdf-parse');
    const pdfParse = ((pdfModule as unknown as { default?: (b: Buffer) => Promise<{ text: string }> }).default ||
      pdfModule) as unknown as (b: Buffer) => Promise<{ text: string }>;
    const pdfData = await pdfParse(ctx.fileBuffer);
    const text = pdfData.text;

    if (!text || text.trim().length === 0) {
      return null;
    }

    return extractFromText(text);
  } catch {
    return null;
  }
}

/** Extract structured data from raw text using regex patterns */
function extractFromText(text: string): ExtractionResult {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Invoice number patterns
  const invMatch = text.match(/(?:Invoice\s*(?:#|No\.?|Number)\s*:?\s*)([A-Z0-9][\w\-\.]+)/i)
    ?? text.match(/(INV[\-\s]?\d{3,})/i)
    ?? text.match(/(?:Invoice\s*:?\s*)([A-Z0-9][\w\-\.]+)/i);

  // Date patterns
  const dateMatch = text.match(
    /(?:Invoice\s*Date|Date\s*of\s*Invoice|Date)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i
  );

  const dueDateMatch = text.match(
    /(?:Due\s*Date|Payment\s*Due|Due)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/i
  );

  // Currency
  const currencyMatch = text.match(/(?:Currency|Curr)\s*:?\s*([A-Z]{3})/i);
  const hasDollarSign = /\$[\d,]+/.test(text);
  const hasEuroSign = /€[\d,]+/.test(text);
  const hasPoundSign = /£[\d,]+/.test(text);
  const hasYenSign = /¥[\d,]+/.test(text);

  let currency: string | null = null;
  if (currencyMatch) currency = currencyMatch[1].toUpperCase();
  else if (hasDollarSign) currency = 'USD';
  else if (hasEuroSign) currency = 'EUR';
  else if (hasPoundSign) currency = 'GBP';
  else if (hasYenSign) currency = 'JPY';

  // Amounts
  const totalMatch = text.match(
    /(?:Total\s*(?:Due|Amount|Payable)?|Grand\s*Total|Amount\s*Due|Balance\s*Due)\s*:?\s*[\$€£¥S]?\$?\s*([\d,]+\.?\d*)/i
  );

  const subtotalMatch = text.match(
    /(?:Sub\s*-?\s*total|Net\s*Amount|Amount\s*Before\s*Tax)\s*:?\s*[\$€£¥S]?\$?\s*([\d,]+\.?\d*)/i
  );

  const taxMatch = text.match(
    /(?:Tax|VAT|GST|Sales\s*Tax|HST)\s*(?:\(?\d+\.?\d*%?\)?)?\s*:?\s*[\$€£¥S]?\$?\s*([\d,]+\.?\d*)/i
  );

  const taxRateMatch = text.match(
    /(?:Tax|VAT|GST)\s*(?:Rate)?\s*:?\s*\(?\s*(\d+\.?\d*)\s*%/i
  );

  // PO Reference
  const poMatch = text.match(/(?:PO|Purchase\s*Order|P\.O\.)\s*(?:#|No\.?|Number|Ref)?\s*:?\s*([A-Z0-9][\w\-]+)/i)
    ?? text.match(/(PO[\-\s]?\d{4}[\-\s]?\d{3,})/i);

  // Vendor name: typically in first few lines
  const vendorName = lines.length > 0 ? lines[0] : null;

  // Vendor Tax ID patterns
  const taxIdMatch = text.match(
    /(?:Tax\s*ID|TIN|EIN|VAT\s*(?:No|Number|ID)|ABN|GST\s*(?:No|Number)|UEN)\s*:?\s*([A-Z0-9\-\.]+)/i
  );

  // Bank account
  const bankMatch = text.match(
    /(?:Account|Acct|A\/C)\s*(?:No\.?|Number)?\s*:?\s*[\*xX]*(\d{4})\s*$/im
  );

  // Line items: look for patterns like "description    qty    price    amount"
  const lineItems = extractLineItems(text);

  const parseAmount = (s: string | undefined): number | null => {
    if (!s) return null;
    return parseFloat(s.replace(/,/g, '')) || null;
  };

  return {
    vendorName: {
      value: vendorName,
      confidence: vendorName ? 0.4 : 0,
      source: 'heuristic: first line of document',
    },
    vendorTaxId: {
      value: taxIdMatch?.[1] ?? null,
      confidence: taxIdMatch ? 0.5 : 0,
      source: 'heuristic: tax ID regex',
    },
    invoiceNumber: {
      value: invMatch?.[1] ?? null,
      confidence: invMatch ? 0.6 : 0,
      source: 'heuristic: invoice number regex',
    },
    invoiceDate: {
      value: dateMatch?.[1] ?? null,
      confidence: dateMatch ? 0.5 : 0,
      source: 'heuristic: date regex',
    },
    dueDate: {
      value: dueDateMatch?.[1] ?? null,
      confidence: dueDateMatch ? 0.5 : 0,
      source: 'heuristic: due date regex',
    },
    currency: {
      value: currency,
      confidence: currency ? 0.5 : 0,
      source: 'heuristic: currency symbol/code detection',
    },
    poReference: {
      value: poMatch?.[1] ?? null,
      confidence: poMatch ? 0.5 : 0,
      source: 'heuristic: PO reference regex',
    },
    lineItems: {
      value: lineItems.length > 0 ? lineItems : null,
      confidence: lineItems.length > 0 ? 0.4 : 0,
      source: 'heuristic: line item pattern matching',
    },
    subtotal: {
      value: parseAmount(subtotalMatch?.[1]),
      confidence: subtotalMatch ? 0.5 : 0,
      source: 'heuristic: subtotal regex',
    },
    taxAmount: {
      value: parseAmount(taxMatch?.[1]),
      confidence: taxMatch ? 0.5 : 0,
      source: 'heuristic: tax amount regex',
    },
    taxRate: {
      value: taxRateMatch ? parseFloat(taxRateMatch[1]) / 100 : null,
      confidence: taxRateMatch ? 0.5 : 0,
      source: 'heuristic: tax rate regex',
    },
    total: {
      value: parseAmount(totalMatch?.[1]),
      confidence: totalMatch ? 0.6 : 0,
      source: 'heuristic: total regex',
    },
    taxIncluded: {
      value: false,
      confidence: 0.3,
      source: 'heuristic: default assumption',
    },
    bankAccountLast4: {
      value: bankMatch?.[1] ?? null,
      confidence: bankMatch ? 0.4 : 0,
      source: 'heuristic: bank account regex',
    },
    documentQuality: {
      value: 'clean',
      confidence: 0.5,
      source: 'heuristic: PDF text extraction succeeded',
    },
    notes: {
      value: null,
      confidence: 0,
      source: 'heuristic',
    },
  };
}

/** Extract line items from text using pattern matching */
function extractLineItems(
  text: string
): Array<{ description: string; qty: number; unitPrice: number; amount: number }> {
  const items: Array<{ description: string; qty: number; unitPrice: number; amount: number }> = [];

  // Common pattern: "Description    Qty    Unit Price    Amount"
  // Match lines like: "Widget X    5    $12.00    $60.00"
  const linePattern = /^(.{10,50}?)\s+(\d+)\s+[\$€£¥]?\s*([\d,]+\.?\d*)\s+[\$€£¥]?\s*([\d,]+\.?\d*)$/gm;
  let match: RegExpExecArray | null;

  while ((match = linePattern.exec(text)) !== null) {
    const description = match[1].trim();
    const qty = parseInt(match[2]);
    const unitPrice = parseFloat(match[3].replace(/,/g, ''));
    const amount = parseFloat(match[4].replace(/,/g, ''));

    if (qty > 0 && unitPrice > 0 && amount > 0 && description.length > 2) {
      items.push({ description, qty, unitPrice, amount });
    }
  }

  return items;
}

// ── Cached extraction ────────────────────────────────────────
interface CachedExtractions {
  [filename: string]: ExtractionResult;
}

async function extractFromCache(
  ctx: PipelineContext
): Promise<ExtractionResult | null> {
  try {
    const cache = cachedExtractionsData as unknown as Record<string, unknown>;
    const extraction = cache[ctx.fileName];
    if (!extraction) return null;

    const validated = ExtractionResultSchema.safeParse(extraction);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

// ── Main extraction stage ────────────────────────────────────
/**
 * Stage 2: EXTRACT — Extracts structured data from the invoice document.
 * Strategy: Gemini AI → Heuristic (pdf-parse) → Cached fallback
 */
export async function stageExtract(
  ctx: PipelineContext
): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];
  let extraction: ExtractionResult | null = null;
  let engine: ExtractionEngine = 'cached';

  // Strategy 1: Gemini AI
  if (process.env.GEMINI_API_KEY) {
    evidence.push({
      label: 'Strategy attempted',
      value: 'Gemini AI',
      type: 'neutral',
    });

    extraction = await extractWithGemini(ctx);
    if (extraction) {
      engine = 'gemini';
      evidence.push({
        label: 'Gemini extraction',
        value: 'Successful',
        type: 'positive',
      });
    } else {
      evidence.push({
        label: 'Gemini extraction',
        value: 'Failed — falling back to heuristic',
        type: 'negative',
      });
    }
  }

  // Strategy 2: Heuristic (pdf-parse)
  if (!extraction) {
    evidence.push({
      label: 'Strategy attempted',
      value: 'Heuristic (pdf-parse)',
      type: 'neutral',
    });

    extraction = await extractWithHeuristic(ctx);
    if (extraction) {
      engine = 'heuristic';
      evidence.push({
        label: 'Heuristic extraction',
        value: 'Successful',
        type: 'positive',
      });
    } else {
      evidence.push({
        label: 'Heuristic extraction',
        value: 'Failed — falling back to cache',
        type: 'negative',
      });
    }
  }

  // Strategy 3: Cached
  if (!extraction) {
    evidence.push({
      label: 'Strategy attempted',
      value: 'Cached extraction',
      type: 'neutral',
    });

    extraction = await extractFromCache(ctx);
    if (extraction) {
      engine = 'cached';
      evidence.push({
        label: 'Cached extraction',
        value: 'Found in cache',
        type: 'positive',
      });
    } else {
      evidence.push({
        label: 'Cached extraction',
        value: 'Not found in cache',
        type: 'negative',
      });
    }
  }

  const durationMs = performance.now() - start;

  // No extraction possible
  if (!extraction) {
    return {
      stage: 'EXTRACT',
      status: 'fail',
      headline: 'Extraction failed',
      reasoning: 'All extraction strategies failed. The document could not be parsed by Gemini AI, heuristic text extraction, or cached data lookup.',
      evidence,
      durationMs,
    };
  }

  // Store in context
  ctx.extraction = extraction;
  ctx.extractionEngine = engine;

  // Compute average confidence
  const confidenceFields = [
    extraction.vendorName.confidence,
    extraction.invoiceNumber.confidence,
    extraction.invoiceDate.confidence,
    extraction.total.confidence,
  ];
  const avgConfidence = confidenceFields.reduce((a, b) => a + b, 0) / confidenceFields.length;

  evidence.push({
    label: 'Engine used',
    value: engine,
    type: engine === 'gemini' ? 'positive' : 'neutral',
  });

  evidence.push({
    label: 'Average confidence (key fields)',
    value: `${(avgConfidence * 100).toFixed(0)}%`,
    type: avgConfidence >= ctx.config.extractionConfidenceThreshold ? 'positive' : 'negative',
  });

  if (extraction.invoiceNumber.value) {
    evidence.push({
      label: 'Invoice number',
      value: extraction.invoiceNumber.value,
      type: 'positive',
    });
  }

  if (extraction.vendorName.value) {
    evidence.push({
      label: 'Vendor name',
      value: extraction.vendorName.value,
      type: 'positive',
    });
  }

  if (extraction.total.value !== null) {
    evidence.push({
      label: 'Total amount',
      value: String(extraction.total.value),
      type: 'positive',
    });
  }

  const isLowConfidence = avgConfidence < ctx.config.extractionConfidenceThreshold;

  return {
    stage: 'EXTRACT',
    status: isLowConfidence ? 'warn' : 'pass',
    headline: isLowConfidence
      ? `Extraction completed with low confidence (${(avgConfidence * 100).toFixed(0)}%)`
      : `Extraction successful via ${engine}`,
    reasoning: `Extracted invoice data using ${engine} engine. Average confidence across key fields: ${(avgConfidence * 100).toFixed(0)}%.${isLowConfidence ? ' Confidence is below the threshold — manual review of extracted data is recommended.' : ''}`,
    evidence,
    durationMs,
    data: {
      engine,
      avgConfidence,
      fieldsExtracted: Object.entries(extraction).filter(
        ([, v]) => v && typeof v === 'object' && 'value' in v && v.value !== null
      ).length,
    },
  };
}
