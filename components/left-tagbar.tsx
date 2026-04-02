'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type Props = {
  isAdmin: boolean;
};

type UnreadPayload = {
  unreadMessages: number;
  unreadAnnouncements: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: string;
  badge?: number;
};

export function LeftTagbar({ isAdmin }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState<UnreadPayload>({ unreadMessages: 0, unreadAnnouncements: 0 });

  const closeMenu = () => setOpen(false);

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
    const onClose = () => closeMenu();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    window.addEventListener('left-tagbar:toggle', onToggle);
    window.addEventListener('left-tagbar:open', onOpen);
    window.addEventListener('left-tagbar:close', onClose);
    document.addEventListener('left-tagbar:toggle', onToggle as EventListener);
    document.addEventListener('left-tagbar:open', onOpen as EventListener);
    document.addEventListener('left-tagbar:close', onClose as EventListener);
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('left-tagbar:toggle', onToggle);
      window.removeEventListener('left-tagbar:open', onOpen);
      window.removeEventListener('left-tagbar:close', onClose);
      document.removeEventListener('left-tagbar:toggle', onToggle as EventListener);
      document.removeEventListener('left-tagbar:open', onOpen as EventListener);
      document.removeEventListener('left-tagbar:close', onClose as EventListener);
      window.removeEventListener('keydown', onKeydown);
    };
  }, []);

  const links = isAdmin
    ? [
        { href: '/admin/lookup', label: 'Kiểm tra vận đơn', icon: '📦', section: 'Cookie & xác thực' },
        { href: '/admin/orders', label: 'Quản lí đơn', icon: '📋', section: 'Cookie & xác thực' },

        { href: '/admin/vouchers', label: 'Quản lí voucher', icon: '🎟', section: 'Thao tác Shop' },
        { href: '/admin/save-voucher', label: 'Lưu mã voucher', icon: '💾', section: 'Thao tác Shop' },
        { href: '/admin/add-mail', label: 'Thêm Mail', icon: '✉️', section: 'Thao tác Shop' },
        { href: '/admin/read-mail', label: 'Đọc Mail', icon: '📨', section: 'Thao tác Shop' },

        { href: '/admin/users', label: 'Quản lí tài khoản', icon: '👤', section: 'Quản trị', badge: unread.unreadMessages },
        { href: '/orders/history', label: 'Lịch sử đơn', icon: '🕘', section: 'Quản trị' },
        { href: '/profile', label: 'Hồ sơ', icon: '🪪', section: 'Quản trị' },
        { href: '/announcements', label: 'Thông báo', icon: '🔔', section: 'Quản trị', badge: unread.unreadAnnouncements },
      ]
    : [
        { href: '/orders/new', label: 'Lên đơn', icon: '📝', section: 'Khách hàng' },
        { href: '/orders/history', label: 'Lịch sử', icon: '🕘', section: 'Khách hàng' },
        { href: '/profile', label: 'Hồ sơ', icon: '🪪', section: 'Khách hàng' },
        { href: '/announcements', label: 'Thông báo', icon: '🔔', section: 'Khách hàng', badge: unread.unreadAnnouncements + unread.unreadMessages },
      ];

  const grouped = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of links) {
      const bucket = map.get(item.section) || [];
      bucket.push(item);
      map.set(item.section, bucket);
    }
    return Array.from(map.entries());
  }, [links]);

  return (
    <>
      <div className={`left-tagbar-overlay ${open ? 'show' : ''}`} onClick={closeMenu} />
      <aside className={`left-tagbar ${open ? 'open' : 'closed'}`}>
        <div className="left-tagbar-head">
          <strong>Dịch vụ Shoppe</strong>
          <button type="button" className="left-tagbar-close" onClick={closeMenu} aria-label="Đóng menu">×</button>
        </div>

        <nav className="left-tagbar-nav">
          {grouped.map(([section, items]) => (
            <div key={section} className="left-tagbar-group">
              <p className="left-tagbar-group-title">{section}</p>
              {items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`left-tagbar-link ${active ? 'is-active' : ''}`}
                    onClick={closeMenu}
                  >
                    <span className="left-tagbar-icon" aria-hidden>{item.icon}</span>
                    <span className="left-tagbar-label">{item.label}</span>
                    {Number(item.badge || 0) > 0 ? <span className="left-tagbar-badge">{item.badge! > 99 ? '99+' : item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
