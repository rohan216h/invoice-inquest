'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, PlayCircle, BarChart3, BookOpen, Info, Search, Menu, X } from 'lucide-react';

interface NavigationProps {
  onOpenCommandPalette?: () => void;
}

export function Navigation({ onOpenCommandPalette }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Run', icon: PlayCircle },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/rules', label: 'Rulebook & Ledger', icon: BookOpen },
    { href: '/about', label: 'Architecture & Assumptions', icon: Info },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0a0e1a]/85 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-sky-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShieldAlert className="w-5 h-5 text-navy-950 font-bold" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                INVOICE INQUEST
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
                v1.0 AP
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-tight hidden sm:inline">
              Deterministic AP Decision Engine
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-full border border-white/[0.06] shadow-inner">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/25 via-teal-500/20 to-sky-500/25 border border-emerald-500/40 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 relative z-10 ${isActive ? 'text-emerald-400' : ''}`} />
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Action: Command Palette Shortcut */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCommandPalette}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-white/[0.08] text-xs text-slate-400 hover:text-white transition-all shadow-sm"
            title="Press Cmd+K or Ctrl+K to open"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Search actions...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-900 rounded border border-slate-700 font-mono text-slate-300">
              ⌘K
            </kbd>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60 border border-white/[0.08]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.08] bg-[#0a0e1a]/95 backdrop-blur-2xl px-4 py-4 space-y-2"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCommandPalette?.();
              }}
              className="w-full mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800/70 text-slate-300 border border-white/[0.08]"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4" /> Quick Command Palette
              </span>
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-900 rounded font-mono">⌘K</kbd>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
