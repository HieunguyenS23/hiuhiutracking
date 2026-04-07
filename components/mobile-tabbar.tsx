'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  isAdmin: boolean;
  username: string;
};

type UnreadPayload = {
  unreadMessages: number;
  unreadAnnouncements: number;
  total: number;
};

export function MobileTabbar({ isAdmin, username }: Props) {
  const pathname = usePathname();
  const [unread, setUnread] = useState<UnreadPayload>({ unreadMessages: 0, unreadAnnouncements: 0, total: 0 });
  const roleLabel = isAdmin ? 'Admin' : 'Khách hàng';
  const profileInitial = (username[0] || 'U').toUpperCase();

  function toggleDrawer() {
    if (typeof window !== 'undefined') {
      const w = window as any;
      if (typeof w.__toggleAppDrawer === 'function') {
        w.__toggleAppDrawer();
        return;
      }
      window.dispatchEvent(new Event('app-drawer:toggle'));
    }
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('app-drawer:toggle'));
  }

  useEffect(() => {
    let stopped = false;

    const loadUnread = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) return;
        if (!stopped) {
          setUnread({
            unreadMessages: Number(data.unreadMessages || 0),
            unreadAnnouncements: Number(data.unreadAnnouncements || 0),
            total: Number(data.total || 0),
          });
        }
      } catch {
        if (!stopped) setUnread({ unreadMessages: 0, unreadAnnouncements: 0, total: 0 });
      }
    };

    loadUnread();
    const timer = window.setInterval(loadUnread, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="mobile-topbar combined-topbar app-topbar">
      <div className="profile-row app-topbar-row">
        <div className="profile-row-left">
          <button
            className="app-menu-btn"
            type="button"
            onPointerUp={toggleDrawer}
            aria-label="Mở menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="profile-card profile-inline">
            <div className="profile-avatar">{profileInitial}</div>
            <div className="profile-meta">
              <p className="eyebrow">{roleLabel}</p>
              <strong>@{username}</strong>
            </div>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="logout-inline-form">
          <button className="logout-inline-btn" type="submit">Đăng xuất</button>
        </form>
      </div>

      <nav className="mobile-tabbar">
        <Link className={pathname.startsWith('/orders') && !pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/new">Lên đơn</Link>
        <Link className={pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/history">Lịch sử</Link>
        <Link className={pathname.startsWith('/profile') ? 'is-active' : ''} href="/profile">Hồ sơ</Link>
        <Link className={`tab-link-with-badge ${pathname.startsWith('/announcements') ? 'is-active' : ''}`} href="/announcements">
          Thông báo
          {unread.total > 0 ? <span className="tab-badge">{unread.total > 99 ? '99+' : unread.total}</span> : null}
        </Link>
      </nav>
    </header>
  );
}


