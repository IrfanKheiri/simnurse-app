import { useCallback, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastContext, type Toast, type ToastVariant } from './toast-context';

const VARIANTS: Record<
  ToastVariant,
  { icon: typeof AlertCircle; bg: string; border: string; text: string; iconColor: string }
> = {
  error: {
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    iconColor: 'text-red-500',
  },
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    iconColor: 'text-emerald-500',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    iconColor: 'text-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
};

export function ToastProvider({ children, scenarioActive = false }: { children: React.ReactNode; scenarioActive?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((previousToasts) => [...previousToasts.slice(-3), { id, message, variant }]);

      const timer = setTimeout(() => {
        dismiss(id);
      }, 4000);

      timersRef.current.set(id, timer);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className={`pointer-events-none fixed left-1/2 z-[900] flex w-full max-w-[440px] -translate-x-1/2 flex-col gap-2 px-4 ${scenarioActive ? 'top-[144px]' : 'top-[72px]'}`}
      >
        {toasts.map((toast) => {
          const variant = VARIANTS[toast.variant];
          const Icon = variant.icon;

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${variant.bg} ${variant.border}`}
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${variant.iconColor}`} />
              <p className={`flex-1 text-sm font-semibold leading-snug ${variant.text}`}>{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className={`shrink-0 rounded-full p-0.5 transition-colors hover:bg-black/10 ${variant.iconColor}`}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
