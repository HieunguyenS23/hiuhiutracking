'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  isAdmin: boolean;
  username: string;
};

export function MobileTabbar({ isAdmin, username }: Props) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const roleLabel = isAdmin ? 'Admin' : 'Khách hàng';
  const profileInitial = (username[0] || 'U').toUpperCase();

  useEffect(() => {
    let stopped = false;
    const loadUnread = async () => {
      try {
        const response = await fetch('/api/messages/unread-count', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) return;
        if (!stopped) setUnread(Number(data.unread || 0));
      } catch {
        if (!stopped) setUnread(0);
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
    <header className="mobile-topbar combined-topbar">
      <div className="profile-card profile-inline">
        <div className="profile-avatar">{profileInitial}</div>
        <div className="profile-meta">
          <p className="eyebrow">{roleLabel}</p>
          <strong>@{username}</strong>
        </div>
      </div>

      <nav className={`mobile-tabbar ${isAdmin ? 'mobile-tabbar-admin' : ''}`}>
        <Link className={pathname.startsWith('/orders') && !pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/new">Lên đơn</Link>
        {isAdmin ? (
          <>
            <Link className={pathname.startsWith('/admin/orders') ? 'is-active' : ''} href="/admin/orders">Quản lí đơn</Link>
            <Link className={pathname.startsWith('/admin/users') ? 'is-active' : ''} href="/admin/users">Tài khoản</Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/hub') ? 'is-active' : ''}`} href="/hub">
              Trung tâm
              {unread > 0 ? <span className="tab-badge">{unread > 99 ? '99+' : unread}</span> : null}
            </Link>
          </>
        ) : (
          <>
            <Link className={pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/history">Lịch sử</Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/hub') ? 'is-active' : ''}`} href="/hub">
              Trung tâm
              {unread > 0 ? <span className="tab-badge">{unread > 99 ? '99+' : unread}</span> : null}
            </Link>
          </>
        )}
        <form action="/api/auth/logout" method="post" className="tabbar-logout-form">
          <button className="tabbar-logout" type="submit">Đăng xuất</button>
        </form>
      </nav>
    </header>
  );
}
