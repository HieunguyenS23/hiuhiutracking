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
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev);
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('left-tagbar:toggle', onToggle);
    window.addEventListener('left-tagbar:open', onOpen);
    window.addEventListener('left-tagbar:close', onClose);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('left-tagbar:toggle', onToggle);
      window.removeEventListener('left-tagbar:open', onOpen);
      window.removeEventListener('left-tagbar:close', onClose);
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const links = isAdmin
    ? [
        { href: '/orders/new', label: 'Lên đơn' },
        { href: '/orders/history', label: 'Lịch sử' },
        { href: '/admin/orders', label: 'Quản lí đơn' },
        { href: '/admin/users', label: 'Quản lí tài khoản', badge: unread.unreadMessages },
        { href: '/admin/vouchers', label: 'Quản lí voucher' },
        { href: '/admin/lookup', label: 'Tra cứu' },
        { href: '/admin/save-voucher', label: 'LƯU VOUCHER' },
        { href: '/admin/add-mail', label: 'Thêm mail' },
        { href: '/admin/read-mail', label: 'Đọc mail' },
        { href: '/profile', label: 'Hồ sơ' },
        { href: '/announcements', label: 'Thông báo', badge: unread.unreadAnnouncements },
      ]
    : [
        { href: '/orders/new', label: 'Lên đơn' },
        { href: '/orders/history', label: 'Lịch sử' },
        { href: '/profile', label: 'Hồ sơ' },
        { href: '/announcements', label: 'Thông báo', badge: unread.unreadAnnouncements + unread.unreadMessages },
      ];

  return (
    <>
      <div className={`left-tagbar-overlay ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`left-tagbar ${open ? 'open' : 'closed'}`}>
        <div className="left-tagbar-head">
          <strong>Menu</strong>
          <button type="button" className="left-tagbar-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <nav className="left-tagbar-nav">
          {links.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`left-tagbar-link ${active ? 'is-active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span>{item.label}</span>
                {Number(item.badge || 0) > 0 ? <span className="left-tagbar-badge">{item.badge! > 99 ? '99+' : item.badge}</span> : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
