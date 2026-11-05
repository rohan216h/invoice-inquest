'use client';

import React from 'react';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Deep navy base gradient */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />

      {/* Mesh / Aurora glow blobs */}
      <div
        className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-20 bg-gradient-to-br from-emerald-500/40 via-sky-500/20 to-transparent animate-pulse"
        style={{ animationDuration: '8s' }}
      />
      <div
        className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-15 bg-gradient-to-bl from-blue-600/30 via-indigo-500/20 to-transparent animate-pulse"
        style={{ animationDuration: '12s' }}
      />
      <div
        className="absolute -bottom-[20%] left-[25%] w-[55vw] h-[55vw] rounded-full blur-[130px] opacity-15 bg-gradient-to-t from-emerald-600/20 via-teal-500/10 to-transparent"
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  );
}
