'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  isAdmin: boolean;
  username: string;
};

export function MobileTabbar({ isAdmin, username }: Props) {
  const pathname = usePathname();
  const roleLabel = isAdmin ? 'Admin' : 'Khách hàng';
  const profileInitial = (username[0] || 'U').toUpperCase();

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
          </>
        ) : (
          <Link className={pathname.startsWith('/orders/history') ? 'is-active' : ''} href="/orders/history">Lịch sử</Link>
        )}
        <form action="/api/auth/logout" method="post" className="tabbar-logout-form">
          <button className="tabbar-logout" type="submit">Đăng xuất</button>
        </form>
      </nav>
    </header>
  );
}
