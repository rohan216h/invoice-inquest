'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Play,
  BarChart2,
  BookOpen,
  Info,
  FileText,
  Sliders,
  Trash2,
  X,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onRunDemo?: () => void;
  onSelectSample?: (fileName: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Actions' | 'Samples' | 'Navigation';
  icon: typeof Play;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onRunDemo,
  onSelectSample,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'run-demo',
      title: 'Run Full Demo Script',
      subtitle: 'Auto-run Happy Path and 4 edge cases with live 10-stage animations',
      category: 'Actions',
      icon: Play,
      action: () => {
        onClose();
        router.push('/');
        setTimeout(() => onRunDemo?.(), 200);
      },
    },
    {
      id: 'sample-01',
      title: 'Load 01_happy_path_clean.pdf',
      subtitle: 'Acme Safety Gloves — Exact PO match → APPROVED',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('01_happy_path_clean.pdf');
      },
    },
    {
      id: 'sample-02',
      title: 'Load 02_split_po_instalment_2.pdf',
      subtitle: 'Pinnacle Desks — Cumulative budget check → APPROVED',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('02_split_po_instalment_2.pdf');
      },
    },
    {
      id: 'sample-02b',
      title: 'Load 02b_split_po_instalment_3_overbill.pdf',
      subtitle: 'Pinnacle Desks — Cumulative overbilling exceeds PO → NEEDS_REVIEW',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('02b_split_po_instalment_3_overbill.pdf');
      },
    },
    {
      id: 'sample-03',
      title: 'Load 03_near_duplicate.pdf',
      subtitle: 'INV 2041 vs cleared INV-2041 — Duplicate hold → REJECTED',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('03_near_duplicate.pdf');
      },
    },
    {
      id: 'sample-04',
      title: 'Load 04_missing_fields.pdf',
      subtitle: 'Missing invoice number & total — Drafts vendor email → INFO_REQUESTED',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('04_missing_fields.pdf');
      },
    },
    {
      id: 'sample-05',
      title: 'Load 05_scanned_implied_po.png',
      subtitle: 'Scanned image with bank change fraud flag → NEEDS_REVIEW',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('05_scanned_implied_po.png');
      },
    },
    {
      id: 'sample-06',
      title: 'Load 06_unapproved_vendor.pdf',
      subtitle: 'QuickPrint unapproved supplier → REJECTED',
      category: 'Samples',
      icon: FileText,
      action: () => {
        onClose();
        router.push('/');
        onSelectSample?.('06_unapproved_vendor.pdf');
      },
    },
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      subtitle: 'KPIs, STP rate, financial savings, and run history',
      category: 'Navigation',
      icon: BarChart2,
      action: () => {
        onClose();
        router.push('/dashboard');
      },
    },
    {
      id: 'nav-rules',
      title: 'Go to Rules & Ledger',
      subtitle: 'Inspect engine thresholds, Vendor Master, and PO ledger',
      category: 'Navigation',
      icon: BookOpen,
      action: () => {
        onClose();
        router.push('/rules');
      },
    },
    {
      id: 'nav-about',
      title: 'Go to Architecture & Assumptions',
      subtitle: 'Deterministic AP design philosophy & failure modes',
      category: 'Navigation',
      icon: Info,
      action: () => {
        onClose();
        router.push('/about');
      },
    },
  ];

  const filteredCommands = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#0f1629] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[75vh]"
          >
            {/* Input Header */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3">
              <Search className="w-5 h-5 text-emerald-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command, jump to sample, or search rules..."
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto p-2 divide-y divide-white/[0.04]">
              {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No matching commands found for "{query}".
                </div>
              ) : (
                filteredCommands.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500/25 text-emerald-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                          {item.category}
                        </span>
                        {isSelected && <ArrowRight className="w-4 h-4 text-emerald-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-t border-white/[0.06] text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
              <span className="font-mono text-emerald-400/80">INVOICE INQUEST Engine</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
