import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Navigation } from '@/components/Navigation';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'INVOICE INQUEST — AI-Assisted AP Processing & Audit Engine',
  description:
    'Production-grade, fully explainable accounts payable intake system. Deterministic rules, multimodal AI extraction, and live 10-stage audit pipeline.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full`}>
      <body className="min-h-full flex flex-col font-sans bg-[#0a0e1a] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <ToastProvider>
          <AuroraBackground />
          <Navigation />
          <main className="flex-1 relative z-10">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
