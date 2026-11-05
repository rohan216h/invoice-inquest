'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

// ── Context ────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ── Icon map ───────────────────────────────────────────────────
const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap: Record<ToastType, string> = {
  success: 'text-emerald-400 border-l-emerald-400',
  error: 'text-rose-400 border-l-rose-400',
  warning: 'text-amber-400 border-l-amber-400',
  info: 'text-sky-400 border-l-sky-400',
};

const bgMap: Record<ToastType, string> = {
  success: 'bg-emerald-950/80',
  error: 'bg-rose-950/80',
  warning: 'bg-amber-950/80',
  info: 'bg-sky-950/80',
};

// ── Toast Item ─────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = iconMap[toast.type];

  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`glass border-l-4 ${colorMap[toast.type]} ${bgMap[toast.type]} px-4 py-3 rounded-lg flex items-start gap-3 max-w-sm shadow-lg`}
    >
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="text-slate-400 hover:text-white transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ── Provider ───────────────────────────────────────────────────
let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
