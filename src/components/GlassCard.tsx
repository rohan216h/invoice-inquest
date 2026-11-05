'use client';

import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  glowColor?: 'emerald' | 'amber' | 'rose' | 'sky' | 'default';
}

export function GlassCard({
  children,
  className = '',
  glow = false,
  glowColor = 'default',
  ...props
}: GlassCardProps) {
  const glowClasses = {
    default: 'hover:shadow-[0_0_25px_rgba(255,255,255,0.06)]',
    emerald: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.15)] hover:border-emerald-500/30',
    amber: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.15)] hover:border-amber-500/30',
    rose: 'hover:shadow-[0_0_25px_rgba(244,63,94,0.15)] hover:border-rose-500/30',
    sky: 'hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] hover:border-sky-500/30',
  };

  return (
    <motion.div
      className={`relative backdrop-blur-xl bg-[#0f1629]/75 border border-white/[0.08] rounded-xl shadow-2xl transition-all duration-300 ${
        glow ? glowClasses[glowColor] : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}

