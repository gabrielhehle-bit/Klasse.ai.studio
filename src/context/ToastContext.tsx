
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-3.5 items-center pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92, y: 20, transition: { duration: 0.18, ease: 'easeIn' } }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={`pointer-events-auto flex items-center gap-4 px-5 py-4 bg-white/95 backdrop-blur-xl border rounded-[22px] shadow-2xl shadow-slate-900/10 min-w-[320px] max-w-full overflow-hidden relative ${
                toast.type === 'success' ? 'border-emerald-100/80 shadow-emerald-950/5' :
                toast.type === 'error' ? 'border-rose-100/80 shadow-rose-950/5' :
                'border-blue-100/80 shadow-blue-950/5'
              }`}
            >
              {/* Left edge accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-rose-500' :
                'bg-blue-500'
              }`} />

              <div className={`p-2.5 rounded-xl ml-1 shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                toast.type === 'error' ? 'bg-rose-50 text-rose-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {toast.type === 'success' ? <CheckCircle size={18} className="stroke-[2.5]" /> :
                 toast.type === 'error' ? <AlertCircle size={18} className="stroke-[2.5]" /> :
                 <Info size={18} className="stroke-[2.5]" />}
              </div>
              <p className="flex-1 text-[12px] font-extrabold text-slate-800 leading-snug tracking-tight">
                {toast.message}
              </p>
              <button 
                onClick={() => removeToast(toast.id)}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-350 hover:text-slate-650 transition-colors shrink-0"
              >
                <X size={14} className="stroke-[2.5]" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
