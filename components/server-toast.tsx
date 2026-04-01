'use client';

import { useEffect } from 'react';
import { showToast } from '@/lib/client-toast';

type Props = {
  message: string;
  variant?: 'success' | 'error' | 'info';
};

export function ServerToast({ message, variant = 'error' }: Props) {
  useEffect(() => {
    if (!message) return;
    showToast(message, variant);
  }, [message, variant]);

  return null;
}
