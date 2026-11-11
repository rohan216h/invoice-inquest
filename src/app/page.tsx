'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type {
  StageName,
  StageResult,
  Verdict,
  ExtractionResult,
  ExtractionEngine,
  PipelineConfig,
  RunRecord,
  SSEEvent,
} from '@/lib/engine/types';
import { DEFAULT_CONFIG } from '@/lib/engine/types';
import { runPipelineClientSide } from '@/lib/engine/pipeline';
import { useRunHistory } from '@/lib/hooks/useRunHistory';
import { useToast } from '@/components/Toast';
import { GlassCard } from '@/components/GlassCard';
import { DropZone } from '@/components/DropZone';
import { SampleLab, SAMPLES } from '@/components/SampleLab';
import { DocumentPreview } from '@/components/DocumentPreview';
import { PipelineView } from '@/components/PipelineView';
import { VerdictDisplay } from '@/components/VerdictDisplay';
import { ToleranceLab } from '@/components/ToleranceLab';
import { CommandPalette } from '@/components/CommandPalette';
import { Play, RotateCcw, Sparkles, FileText, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import vendorsData from '../../data/vendors.json';
import posData from '../../data/purchase_orders.json';
import cachedExtractionsData from '../../data/cached-extractions.json';

export default function RunPage() {
  const { runs, addRun, clearRuns, seedRuns } = useRunHistory();
  const { addToast } = useToast();

  const handleResetHistory = () => {
    clearRuns();
    setTimeout(() => {
      seedRuns(true);
      addToast('Run history reset to clean baseline (duplicates cleared)', 'success');
    }, 50);
  };

  // State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageName | null>(null);
  const [stageResults, setStageResults] = useState<StageResult[]>([]);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [extractionEngine, setExtractionEngine] = useState<ExtractionEngine | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [config, setConfig] = useState<PipelineConfig>(DEFAULT_CONFIG);

  // Demo script automation state
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const stopDemoRef = useRef(false);

  const demoScriptFiles = [
    '01_happy_path_clean.pdf',
    '02b_split_po_instalment_3_overbill.pdf',
    '03_near_duplicate.pdf',
    '04_missing_fields.pdf',
    '05_scanned_implied_po.png',
  ];

  // Keyboard shortcuts: 'R' to run demo, Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        if (!isRunning && !isDemoRunning && document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault();
          startDemoScript();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isDemoRunning]);

  // Process a single file
  const processInvoice = useCallback(
    async (file: File, fileDisplayName: string) => {
      setIsRunning(true);
      setCurrentStage('INGEST');
      setStageResults([]);
      setExtraction(null);
      setVerdict(null);
      setActiveFileName(fileDisplayName);

      const startTime = performance.now();
      const currentConfig = config;

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('vendors', JSON.stringify(vendorsData));
        formData.append('purchaseOrders', JSON.stringify(posData));
        formData.append('runHistory', JSON.stringify(runs));
        formData.append('config', JSON.stringify(currentConfig));

        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server returned error ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let localExtraction: ExtractionResult | null = null;
        let localEngine: ExtractionEngine = 'cached';
        let localVerdict: Verdict | null = null;
        const localStages: StageResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event: SSEEvent = JSON.parse(line.slice(6));

                if (event.type === 'stage_start') {
                  setCurrentStage(event.stage);
                } else if (event.type === 'stage_result') {
                  localStages.push(event.result);
                  setStageResults([...localStages]);
                } else if (event.type === 'extraction') {
                  localExtraction = event.extraction;
                  localEngine = event.engine;
                  setExtraction(event.extraction);
                  setExtractionEngine(event.engine);
                } else if (event.type === 'verdict') {
                  localVerdict = event.verdict;
                  setVerdict(event.verdict);
                } else if (event.type === 'error') {
                  addToast(event.message, 'error');
                } else if (event.type === 'done') {
                  setCurrentStage(null);
                  setIsRunning(false);

                  // Persist to run history
                  if (localVerdict && localExtraction) {
                    const duration = Math.round(performance.now() - startTime);
                    const record: RunRecord = {
                      id: event.runId || `run-${Date.now()}`,
                      fileName: fileDisplayName,
                      timestamp: new Date().toISOString(),
                      decision: localVerdict.decision,
                      riskScore: localVerdict.riskScore,
                      confidence: localVerdict.confidence,
                      vendorName: localExtraction.vendorName.value || 'Unknown Vendor',
                      invoiceNumber: localExtraction.invoiceNumber.value || 'N/A',
                      amount: localExtraction.total.value || localExtraction.subtotal.value || 0,
                      currency: localExtraction.currency.value || 'USD',
                      processingTimeMs: duration,
                      stages: localStages,
                      verdict: localVerdict,
                      extraction: localExtraction,
                      extractionEngine: localEngine,
                      config: currentConfig,
                    };
                    addRun(record);
                  }
                }
              } catch (parseErr) {
                console.error('SSE parse error:', parseErr);
              }
            }
          }
        }
      } catch (err: unknown) {
        setIsRunning(false);
        setCurrentStage(null);
        const msg = err instanceof Error ? err.message : 'Processing failed';
        addToast(msg, 'error');
      }
    },
    [config, runs, addRun, addToast]
  );

  // Handle uploaded file
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    processInvoice(file, file.name);
  };

  // Load sample invoice from /samples/
  const handleSelectSample = async (fileName: string) => {
    try {
      setActiveFileName(fileName);
      const res = await fetch(`/samples/${fileName}`);
      if (!res.ok) throw new Error(`Could not load /samples/${fileName}`);
      const blob = await res.blob();
      const file = new File([blob], fileName, {
        type: fileName.endsWith('.png') ? 'image/png' : 'application/pdf',
      });
      setSelectedFile(file);
      setFileUrl(`/samples/${fileName}`);
      await processInvoice(file, fileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load sample';
      addToast(msg, 'error');
    }
  };

  // Run Demo Script: Happy path then 4 edge cases with pause
  const startDemoScript = async () => {
    if (isDemoRunning) {
      // Toggle off / cancel
      stopDemoRef.current = true;
      setIsDemoRunning(false);
      setDemoStep(0);
      addToast('Automated demo stopped', 'info');
      return;
    }

    if (isRunning) return;
    stopDemoRef.current = false;
    setIsDemoRunning(true);
    addToast('Starting automated demo script (Click button again to Stop)', 'info');

    for (let i = 0; i < demoScriptFiles.length; i++) {
      if (stopDemoRef.current) break;
      setDemoStep(i + 1);
      const fileName = demoScriptFiles[i];
      await handleSelectSample(fileName);

      if (stopDemoRef.current) break;

      // Pause 3 seconds between runs so viewer can see verdict
      if (i < demoScriptFiles.length - 1) {
        for (let p = 0; p < 30; p++) {
          if (stopDemoRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    setIsDemoRunning(false);
    setDemoStep(0);
    if (!stopDemoRef.current) {
      addToast('Demo script complete! All 5 scenarios executed.', 'success');
    }
  };

  // Tolerance Lab Client-Side Re-evaluation
  const handleConfigChange = async (newConfig: PipelineConfig) => {
    setConfig(newConfig);

    const activeExtract =
      extraction ||
      (activeFileName ? (cachedExtractionsData as Record<string, ExtractionResult>)[activeFileName] : null);

    if (activeExtract && activeFileName) {
      try {
        // Instantly recalculate decision in browser
        const reevaluated = await runPipelineClientSide({
          extraction: activeExtract,
          fileName: activeFileName,
          config: newConfig,
          vendors: vendorsData as unknown as any,
          purchaseOrders: posData as unknown as any,
          runHistory: runs,
        });

        setVerdict(reevaluated.verdict);
        setStageResults((prev) => {
          // Keep INGEST & EXTRACT as they were, update downstream
          const preserved = prev.filter((s) => s.stage === 'INGEST' || s.stage === 'EXTRACT');
          return [...preserved, ...reevaluated.stages];
        });
      } catch (err) {
        console.error('Client-side re-evaluation error:', err);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* ── Hero Section ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              Autonomous AP Audit Desk
            </span>
            <span className="text-xs text-slate-400">• Deterministic Rules • AI Extraction</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Invoice Inquest Control Room
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Ingest invoices, inspect optical extraction, and audit line-level accounting against
            Procurement Purchase Orders with 10 transparent, deterministic verification stages.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleResetHistory}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.08] transition-colors shadow-sm"
            title="Clear previous test history so Happy Path and edge cases start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo State</span>
          </button>

          <button
            onClick={startDemoScript}
            disabled={isRunning && !isDemoRunning}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-all ${
              isDemoRunning
                ? 'bg-amber-500 hover:bg-amber-400 text-navy-950 shadow-amber-500/25 cursor-pointer'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-navy-950 shadow-emerald-500/25 hover:scale-[1.02]'
            } ${isRunning && !isDemoRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Play className={`w-4 h-4 ${isDemoRunning ? 'hidden' : 'fill-current'}`} />
            <span>
              {isDemoRunning ? `⏹ Stop Auto-Run (Step ${demoStep}/5)` : '▶ Run Demo Script (Press R)'}
            </span>
          </button>
        </div>
      </div>

      {/* Demo Stepper Progress Bar */}
      {isDemoRunning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-white font-medium">
              Demo Script Step {demoStep} of 5:{' '}
              <span className="text-emerald-400 font-mono font-bold">
                {demoScriptFiles[demoStep - 1]}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <span>Pausing 2s between scenarios</span>
          </div>
        </motion.div>
      )}

      {/* ── Dropzone & Sample Lab ───────────────────────────────── */}
      <div className="space-y-6">
        <DropZone
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          disabled={isRunning || isDemoRunning}
        />

        <SampleLab
          onSelectSample={handleSelectSample}
          activeFileName={activeFileName}
          disabled={isRunning || isDemoRunning}
        />
      </div>

      {/* ── Main Two-Panel Layout (Active Run or Loaded Document) ── */}
      {(activeFileName || isRunning || verdict) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
          {/* Left Panel: Document Preview & Extracted Fields (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <DocumentPreview
              fileName={activeFileName || 'document.pdf'}
              fileUrl={fileUrl}
              extraction={extraction}
              extractionEngine={extractionEngine}
            />
          </div>

          {/* Right Panel: Pipeline Stages & Verdict (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live 10-Stage Pipeline View */}
            <PipelineView
              currentStage={currentStage}
              stageResults={stageResults}
              isRunning={isRunning}
            />

            {/* Verdict Rubber Stamp Moment */}
            {verdict && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <VerdictDisplay verdict={verdict} />
              </motion.div>
            )}

            {/* Tolerance & Sensitivity Lab */}
            {verdict && (
              <ToleranceLab
                currentConfig={config}
                currentVerdict={verdict}
                onConfigChange={handleConfigChange}
                disabled={isRunning}
              />
            )}
          </div>
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onRunDemo={startDemoScript}
        onSelectSample={handleSelectSample}
      />
    </div>
  );
}
