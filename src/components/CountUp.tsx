'use client';

import React, { useEffect, useState } from 'react';

interface CountUpProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  const formatted = decimals > 0
    ? displayValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(displayValue).toLocaleString('en-US');

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
