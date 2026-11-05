// ============================================================
// INVOICE INQUEST — Stage 1: INGEST
// ============================================================
import type { PipelineContext, StageResult, Evidence } from './types';

/** Maximum file size in bytes (4 MB) */
const MAX_FILE_SIZE = 4 * 1024 * 1024;

/** Supported MIME types */
const SUPPORTED_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
};

/**
 * Stage 1: INGEST — Validates file type, size, and assesses quality.
 */
export async function stageIngest(ctx: PipelineContext): Promise<StageResult> {
  const start = performance.now();
  const evidence: Evidence[] = [];

  const fileType = SUPPORTED_TYPES[ctx.fileMimeType];
  const fileSizeKB = (ctx.fileSize / 1024).toFixed(1);
  const fileSizeMB = (ctx.fileSize / (1024 * 1024)).toFixed(2);

  evidence.push({
    label: 'File name',
    value: ctx.fileName,
    type: 'neutral',
  });

  evidence.push({
    label: 'MIME type',
    value: ctx.fileMimeType,
    type: fileType ? 'positive' : 'negative',
  });

  evidence.push({
    label: 'File size',
    value: `${fileSizeKB} KB (${fileSizeMB} MB)`,
    type: ctx.fileSize <= MAX_FILE_SIZE ? 'positive' : 'negative',
  });

  // Check file type
  if (!fileType) {
    const durationMs = performance.now() - start;
    return {
      stage: 'INGEST',
      status: 'fail',
      headline: 'Unsupported file type',
      reasoning: `The file "${ctx.fileName}" has MIME type "${ctx.fileMimeType}" which is not supported. Only PDF, PNG, and JPEG files are accepted.`,
      evidence,
      durationMs,
    };
  }

  // Check file size
  if (ctx.fileSize > MAX_FILE_SIZE) {
    const durationMs = performance.now() - start;
    return {
      stage: 'INGEST',
      status: 'fail',
      headline: 'File too large',
      reasoning: `The file "${ctx.fileName}" is ${fileSizeMB} MB which exceeds the 4 MB limit.`,
      evidence,
      durationMs,
    };
  }

  // Check for empty file
  if (ctx.fileSize === 0) {
    const durationMs = performance.now() - start;
    return {
      stage: 'INGEST',
      status: 'fail',
      headline: 'Empty file',
      reasoning: `The file "${ctx.fileName}" is empty (0 bytes).`,
      evidence,
      durationMs,
    };
  }

  // Assess document quality
  const isPDF = ctx.fileMimeType === 'application/pdf';
  const quality = isPDF ? 'clean' : 'scanned';

  evidence.push({
    label: 'Document quality',
    value: quality,
    type: quality === 'clean' ? 'positive' : 'neutral',
  });

  evidence.push({
    label: 'Format',
    value: fileType,
    type: 'positive',
  });

  const durationMs = performance.now() - start;

  return {
    stage: 'INGEST',
    status: 'pass',
    headline: `${fileType} document accepted`,
    reasoning: `File "${ctx.fileName}" (${fileSizeKB} KB) was successfully ingested as a ${quality} ${fileType} document.`,
    evidence,
    durationMs,
    data: {
      fileType,
      quality,
      fileSizeBytes: ctx.fileSize,
    },
  };
}
