'use client';

import { useEffect, useState } from 'react';

type ToastItem = {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; variant?: ToastItem['variant'] }>).detail;
      const message = String(detail?.message || '').trim();
      if (!message) return;
      const variant = detail?.variant || 'info';
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setItems((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    };

    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`toast-item toast-${item.variant}`}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
