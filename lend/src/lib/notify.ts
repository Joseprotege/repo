/**
 * Tiny framework-agnostic toast bus.
 *
 * Services (plain TS, no React) call `notify.error(...)` / `notify.success(...)`
 * and the <Toaster> component subscribes and renders them. This lets the data
 * layer surface real failures (e.g. DB rate-limit / constraint messages) to the
 * user without coupling services to React or threading error state through every
 * call site.
 */
export type ToastKind = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let counter = 0;

function emit(kind: ToastKind, message: string) {
  const toast: Toast = { id: ++counter, kind, message };
  listeners.forEach(l => l(toast));
}

export const notify = {
  error: (message: string) => emit('error', message),
  success: (message: string) => emit('success', message),
  info: (message: string) => emit('info', message),
};

/** Subscribe to toasts. Returns an unsubscribe function. */
export function subscribeToast(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
