import './globals.css';
import type { Metadata } from 'next';
import { ToastHost } from '@/components/toast-host';

export const metadata: Metadata = {
  title: 'Hieu Nguyen Shopee',
  description: 'Cổng lên đơn mobile-first',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}
