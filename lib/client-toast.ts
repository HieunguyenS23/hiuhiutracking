export type ToastVariant = 'success' | 'error' | 'info';

export function showToast(message: string, variant: ToastVariant = 'info') {
  if (!message || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, variant } }));
}
