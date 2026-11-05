'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface RiskGaugeProps {
  score: number; // 0 - 100
  size?: number;
}

export function RiskGauge({ score, size = 180 }: RiskGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  // Radius and circumference for semi-circle
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const arcLength = Math.PI * radius; // Half circumference
  const strokeDashoffset = arcLength * (1 - animatedScore / 100);

  let color = '#10b981'; // emerald
  let tier = 'LOW RISK';
  let tierClass = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';

  if (score > 60) {
    color = '#f43f5e'; // rose
    tier = 'HIGH RISK';
    tierClass = 'text-rose-400 bg-rose-950/60 border-rose-500/30';
  } else if (score > 25) {
    color = '#f59e0b'; // amber
    tier = 'MEDIUM RISK';
    tierClass = 'text-amber-400 bg-amber-950/60 border-amber-500/30';
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg
        width={size}
        height={size * 0.62}
        viewBox={`0 0 ${size} ${size * 0.62}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>

        {/* Background track arc */}
        <path
          d={`M ${strokeWidth / 2} ${size * 0.58} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.58}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Animated fill arc */}
        <motion.path
          d={`M ${strokeWidth / 2} ${size * 0.58} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.58}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      </svg>

      {/* Center score readout */}
      <div className="absolute top-[38%] flex flex-col items-center">
        <motion.span
          className="text-4xl font-extrabold tracking-tight font-mono"
          style={{ color }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {animatedScore}
        </motion.span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 -mt-1">
          out of 100
        </span>
      </div>

      {/* Risk Tier Badge */}
      <span
        className={`mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-sm ${tierClass}`}
      >
        {tier}
      </span>
    </div>
  );
}
