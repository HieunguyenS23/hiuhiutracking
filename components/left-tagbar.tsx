'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  isAdmin: boolean;
};

type UnreadPayload = {
  unreadMessages: number;
  unreadAnnouncements: number;
};

export function LeftTagbar({ isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [unread, setUnread] = useState<UnreadPayload>({ unreadMessages: 0, unreadAnnouncements: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) return;
        setUnread({
          unreadMessages: Number(data.unreadMessages || 0),
          unreadAnnouncements: Number(data.unreadAnnouncements || 0),
        });
      } catch {
        setUnread({ unreadMessages: 0, unreadAnnouncements: 0 });
      }
    };

    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const links = isAdmin
    ? [
        { href: '/orders/new', label: 'Lên đơn' },
        { href: '/orders/history', label: 'Lịch sử' },
        { href: '/admin/orders', label: 'Quản lí đơn' },
        { href: '/admin/users', label: 'Quản lí tài khoản', badge: unread.unreadMessages },
        { href: '/admin/vouchers', label: 'Quản lí voucher' },
        { href: '/profile', label: 'Hồ sơ' },
        { href: '/announcements', label: 'Thông báo', badge: unread.unreadAnnouncements },
      ]
    : [
        { href: '/orders/new', label: 'Lên đơn' },
        { href: '/orders/history', label: 'Lịch sử' },
        { href: '/profile', label: 'Hồ sơ', badge: unread.unreadMessages },
        { href: '/announcements', label: 'Thông báo', badge: unread.unreadAnnouncements },
      ];

  return (
    <aside className={`left-tagbar ${open ? 'open' : 'closed'}`}>
      <button type="button" className="left-tagbar-toggle" onClick={() => setOpen((prev) => !prev)}>
        {open ? 'Thu gọn' : 'Mở menu'}
      </button>

      <nav className="left-tagbar-nav">
        {links.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`left-tagbar-link ${active ? 'is-active' : ''}`}>
              <span>{item.label}</span>
              {Number(item.badge || 0) > 0 ? <span className="left-tagbar-badge">{item.badge! > 99 ? '99+' : item.badge}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
