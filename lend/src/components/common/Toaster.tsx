import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToast, type Toast } from '../../lib/notify';

const AUTO_DISMISS_MS = 5000;

const STYLES: Record<Toast['kind'], { ring: string; icon: typeof Info; iconColor: string }> = {
  error:   { ring: 'border-red-200',   icon: AlertCircle,  iconColor: 'text-red-500' },
  success: { ring: 'border-teal-200',  icon: CheckCircle2, iconColor: 'text-teal-500' },
  info:    { ring: 'border-slate-200', icon: Info,         iconColor: 'text-slate-500' },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToast(toast => {
      setToasts(prev => [...prev, toast]);
      setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    });
  }, [dismiss]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] w-80">
      {toasts.map(t => {
        const { ring, icon: Icon, iconColor } = STYLES[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 bg-white border ${ring} shadow-lg rounded-xl px-4 py-3
              animate-[slideIn_0.15s_ease-out]`}
          >
            <Icon size={18} className={`${iconColor} flex-shrink-0 mt-0.5`} />
            <p className="text-sm text-slate-700 flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
