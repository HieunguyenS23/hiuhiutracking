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
  const roleLabel = isAdmin ? 'Admin' : 'Khach hang';
  const profileInitial = (username[0] || 'U').toUpperCase();

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
    <header className="mobile-topbar combined-topbar">
      <div className="profile-row">
        <div className="profile-card profile-inline">
          <div className="profile-avatar">{profileInitial}</div>
          <div className="profile-meta">
            <p className="eyebrow">{roleLabel}</p>
            <strong>@{username}</strong>
          </div>
        </div>
        <form action="/api/auth/logout" method="post" className="logout-inline-form">
          <button className="logout-inline-btn" type="submit">Dang xuat</button>
        </form>
      </div>

      <nav className={`mobile-tabbar ${isAdmin ? 'mobile-tabbar-admin' : ''}`}>
        <Link className={pathname.startsWith('/orders') && !pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/new">Len don</Link>
        {isAdmin ? (
          <>
            <Link className={pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/history">Lich su</Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/admin/orders') ? 'is-active' : ''}`} href="/admin/orders">
              Quan li don
            </Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/admin/users') ? 'is-active' : ''}`} href="/admin/users">
              Tai khoan
              {unread.unreadMessages > 0 ? <span className="tab-badge">{unread.unreadMessages > 99 ? '99+' : unread.unreadMessages}</span> : null}
            </Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/hub') ? 'is-active' : ''}`} href="/hub">
              Trung tam
              {unread.unreadAnnouncements > 0 ? <span className="tab-badge">{unread.unreadAnnouncements > 99 ? '99+' : unread.unreadAnnouncements}</span> : null}
            </Link>
          </>
        ) : (
          <>
            <Link className={pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/history">Lich su</Link>
            <Link className={`tab-link-with-badge ${pathname.startsWith('/hub') ? 'is-active' : ''}`} href="/hub">
              Trung tam
              {unread.total > 0 ? <span className="tab-badge">{unread.total > 99 ? '99+' : unread.total}</span> : null}
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
