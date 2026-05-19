import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificationType } from '../context/NotificationContext';

interface NotificationToastProps {
  message: string;
  type: NotificationType;
  title?: string;
  onClose: () => void;
}

const icons = {
  success: <CheckCircle2 size={20} className="text-orange-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  info: <Info size={20} className="text-blue-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />
};

const styles = {
  success: "border-orange-500/50 bg-orange-500/5",
  error: "border-red-500/50 bg-red-500/5",
  info: "border-blue-500/50 bg-blue-500/5",
  warning: "border-yellow-500/50 bg-yellow-500/5"
};

export default function NotificationToast({ message, type, title, onClose }: NotificationToastProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9, skewX: -5 }}
      animate={{ opacity: 1, x: 0, scale: 1, skewX: 0 }}
      exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto relative group flex items-start gap-4 p-4 rounded-xl border-2 backdrop-blur-md shadow-2xl overflow-hidden",
        styles[type]
      )}
    >
      {/* Decorative Corner */}
      <div className={cn(
        "absolute top-0 right-0 w-8 h-8 -mr-4 -mt-4 rotate-45 transition-colors",
        type === 'success' ? 'bg-orange-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
      )} />

      <div className="shrink-0 mt-0.5">
        {icons[type]}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-1 opacity-50 font-mono">
            {title}
          </h4>
        )}
        <p className="text-sm font-medium leading-relaxed text-white/90">
          {message}
        </p>
      </div>

      <button 
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <X size={16} className="text-white/50" />
      </button>

      {/* Progress Bar Animation */}
      <motion.div 
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{ duration: 5, ease: "linear" }}
        className={cn(
          "absolute bottom-0 left-0 h-0.5",
          type === 'success' ? 'bg-orange-500' : 
          type === 'error' ? 'bg-red-500' : 
          type === 'info' ? 'bg-blue-500' : 'bg-yellow-500'
        )}
      />
    </motion.div>
  );
}
