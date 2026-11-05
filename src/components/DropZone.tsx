'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, selectedFile, disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndHandle = (file: File) => {
    setErrorMsg(null);

    // Size limit: 4MB
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg(`File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB — max permitted is 4.0MB.`);
      return;
    }

    // Supported MIME types
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g)$/i)) {
      setErrorMsg(`File format not supported. Only PDF, PNG, and JPG invoices are processed.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 transition-all duration-300 backdrop-blur-xl ${
          isDragOver
            ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_35px_rgba(16,185,129,0.2)]'
            : selectedFile
            ? 'border-emerald-500/40 bg-slate-900/60'
            : 'border-white/[0.12] hover:border-white/[0.25] bg-slate-900/40 hover:bg-slate-900/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              validateAndHandle(e.target.files[0]);
            }
          }}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {/* Floating invoice illustration */}
          <motion.div
            animate={{
              y: [0, -8, 0],
              rotate: [0, -1, 1, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="relative mb-5"
          >
            <div className="w-20 h-24 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/[0.15] shadow-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="w-4 h-4 rounded bg-emerald-400/30 flex items-center justify-center">
                  <FileText className="w-2.5 h-2.5 text-emerald-300" />
                </div>
                <div className="w-6 h-1 rounded bg-white/20" />
              </div>
              <div className="space-y-1.5 my-2">
                <div className="w-full h-1 rounded bg-white/30" />
                <div className="w-4/5 h-1 rounded bg-white/15" />
                <div className="w-3/5 h-1 rounded bg-white/20" />
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-[7px] font-mono text-emerald-400 font-bold">$ AUDIT</span>
                <span className="text-[7px] font-mono text-slate-400">OK</span>
              </div>
            </div>

            {/* Accent badge icon */}
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-[#0f1629]">
              <UploadCloud className="w-4 h-4 text-navy-950 font-bold" />
            </div>
          </motion.div>

          {/* Heading */}
          {selectedFile ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Selected: {selectedFile.name}</span>
              </div>
              <p className="text-xs text-slate-400">
                {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop another document to replace
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                Drop your accounts-payable invoice here
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Accepts text PDFs, scanned documents, and photo receipts (PDF, PNG, JPG up to 4MB).
              </p>
            </div>
          )}

          {/* Format badges */}
          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">PDF</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">PNG</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">JPEG</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Instant deterministic AP verification</span>
          </div>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
