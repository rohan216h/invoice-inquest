'use client';

import React, { useState } from 'react';
import type { ExtractionResult, ExtractionEngine } from '@/lib/engine/types';
import { GlassCard } from './GlassCard';
import { FileText, Eye, CheckCircle2, Cpu, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface DocumentPreviewProps {
  fileName: string;
  fileUrl?: string | null;
  extraction?: ExtractionResult | null;
  extractionEngine?: ExtractionEngine | null;
}

export function DocumentPreview({
  fileName,
  fileUrl,
  extraction,
  extractionEngine = 'cached',
}: DocumentPreviewProps) {
  const [showAllLines, setShowAllLines] = useState(false);
  const isImage = fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');

  const engineLabel = {
    gemini: 'Gemini 2.5 Flash (Vision LLM)',
    heuristic: 'Heuristic Regex (pdf-parse)',
    cached: 'Cached Fixture (Ground Truth)',
  }[extractionEngine || 'cached'];

  const engineBadgeColor = {
    gemini: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    heuristic: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    cached: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  }[extractionEngine || 'cached'];

  return (
    <div className="space-y-4">
      {/* Document View Card */}
      <GlassCard className="p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Document Preview
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
            {fileName}
          </span>
        </div>

        {/* View container */}
        <div className="relative w-full h-[320px] bg-slate-950/80 rounded-xl border border-white/[0.08] flex items-center justify-center overflow-hidden">
          {fileUrl ? (
            isImage ? (
              <img
                src={fileUrl}
                alt="Invoice document"
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0`}
                title="Invoice PDF"
                className="w-full h-full border-0"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <FileText className="w-12 h-12 text-slate-600 mb-2" />
              <p className="text-xs font-mono">{fileName}</p>
              <p className="text-[11px] text-slate-400 mt-1">Binary loaded into memory pipeline</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Extracted Fields Table with Confidence Scores */}
      {extraction && (
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Extracted Fields
              </h4>
            </div>

            {/* Extraction Engine Chip */}
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${engineBadgeColor}`}
            >
              Engine: {engineLabel}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Field item row */}
            <FieldRow
              label="Vendor"
              value={extraction.vendorName.value || '— (Missing)'}
              confidence={extraction.vendorName.confidence}
              isMissing={!extraction.vendorName.value}
            />
            <FieldRow
              label="Tax ID"
              value={extraction.vendorTaxId.value || '—'}
              confidence={extraction.vendorTaxId.confidence}
            />
            <FieldRow
              label="Invoice #"
              value={extraction.invoiceNumber.value || '— (Missing)'}
              confidence={extraction.invoiceNumber.confidence}
              isMissing={!extraction.invoiceNumber.value}
            />
            <FieldRow
              label="Date"
              value={extraction.invoiceDate.value || '—'}
              confidence={extraction.invoiceDate.confidence}
            />
            <FieldRow
              label="PO Reference"
              value={extraction.poReference.value || '— (No explicit reference)'}
              confidence={extraction.poReference.confidence}
            />
            <FieldRow
              label="Subtotal"
              value={
                extraction.subtotal.value != null
                  ? `${extraction.currency.value || '$'} ${extraction.subtotal.value.toFixed(2)}`
                  : '—'
              }
              confidence={extraction.subtotal.confidence}
            />
            <FieldRow
              label="Tax"
              value={
                extraction.taxAmount.value != null
                  ? `${extraction.currency.value || '$'} ${extraction.taxAmount.value.toFixed(2)}`
                  : '—'
              }
              confidence={extraction.taxAmount.confidence}
            />
            <FieldRow
              label="Grand Total"
              value={
                extraction.total.value != null
                  ? `${extraction.currency.value || '$'} ${extraction.total.value.toFixed(2)}`
                  : '— (Missing)'
              }
              confidence={extraction.total.confidence}
              isMissing={extraction.total.value == null}
            />
            <FieldRow
              label="Remit Bank Last4"
              value={extraction.bankAccountLast4.value ? `****${extraction.bankAccountLast4.value}` : '—'}
              confidence={extraction.bankAccountLast4.confidence}
            />
          </div>

          {/* Line items accordion */}
          {extraction.lineItems.value && extraction.lineItems.value.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/[0.08]">
              <button
                onClick={() => setShowAllLines(!showAllLines)}
                className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white font-medium"
              >
                <span>Line Items ({extraction.lineItems.value.length})</span>
                {showAllLines ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAllLines && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {extraction.lineItems.value.map((item, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.05] text-[11px] flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-white font-medium truncate">{item.description}</p>
                        <p className="text-slate-400 font-mono">
                          Qty {item.qty} × {extraction.currency.value || '$'} {item.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold shrink-0">
                        {extraction.currency.value || '$'} {item.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function FieldRow({
  label,
  value,
  confidence,
  isMissing = false,
}: {
  label: string;
  value: string;
  confidence: number;
  isMissing?: boolean;
}) {
  const confPct = Math.round(confidence * 100);
  const barColor =
    confidence >= 0.85 ? 'bg-emerald-400' : confidence >= 0.6 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="flex items-center justify-between py-1 border-b border-white/[0.03]">
      <span className="text-slate-400 font-medium shrink-0 w-28">{label}</span>
      <span
        className={`font-mono text-right truncate max-w-[140px] ${
          isMissing ? 'text-rose-400 font-bold' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
      <div className="flex items-center gap-1.5 shrink-0 ml-2 w-16 justify-end">
        <div className="w-10 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${confPct}%` }} />
        </div>
        <span className="text-[10px] font-mono text-slate-400">{confPct}%</span>
      </div>
    </div>
  );
}

