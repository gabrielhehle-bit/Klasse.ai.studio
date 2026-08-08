import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ 
  icon = '✨', 
  title, 
  description, 
  actionLabel, 
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`w-full p-8 md:p-14 rounded-[2.5rem] border-2 border-dashed border-slate-200/80 bg-slate-50/30 backdrop-blur-xs flex flex-col items-center justify-center text-center space-y-6 hover:border-accent/20 transition-colors duration-300 ${className}`}
    >
      <div className="w-20 h-20 bg-white rounded-[2rem] shadow-md border border-slate-100 flex items-center justify-center text-4xl relative group">
        <div className="absolute inset-0 bg-accent/5 rounded-[2rem] scale-90 opacity-0 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
        <span className="relative z-10 select-none group-hover:scale-110 transition-transform duration-300 block">{icon}</span>
      </div>
      <div className="space-y-2 max-w-sm">
        <h3 className="text-[1.125rem] leading-snug font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="text-slate-500 font-medium text-[0.8125rem] leading-relaxed max-w-[280px] mx-auto">{description}</p>
      </div>
      
      {actionLabel && onAction && (
        <button 
          onClick={onAction}
          className="mt-2 px-6 py-3 bg-white hover:bg-slate-950 hover:text-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-lg border border-slate-200 hover:border-slate-950 transition-all duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>{actionLabel}</span>
        </button>
      )}
    </motion.div>
  );
}
