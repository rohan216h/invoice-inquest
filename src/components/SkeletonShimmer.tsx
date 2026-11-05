'use client';

import React from 'react';

interface SkeletonShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function SkeletonShimmer({ className = '', width, height }: SkeletonShimmerProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? '100%',
  };

  return (
    <div
      style={style}
      className={`relative overflow-hidden rounded-lg bg-slate-800/60 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent ${className}`}
    />
  );
}

