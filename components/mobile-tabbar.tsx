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
    <>
      <header className="mobile-topbar">
        <div className="profile-card">
          <div className="profile-avatar">{profileInitial}</div>
          <div className="profile-meta">
            <p className="eyebrow">{roleLabel}</p>
            <strong>@{username}</strong>
          </div>
        </div>

        <form action="/api/auth/logout" method="post" className="logout-form-desktop">
          <button className="ghost-button" type="submit">Đăng xuất</button>
        </form>
      </header>

      <nav className="mobile-tabbar">
        <Link className={pathname.startsWith('/orders') ? 'is-active' : ''} href="/orders/new">Lên đơn</Link>
        {isAdmin ? <Link className={pathname.startsWith('/admin') ? 'is-active' : ''} href="/admin/orders">Quản lí đơn</Link> : null}
        <form action="/api/auth/logout" method="post" className="tabbar-logout-form">
          <button className="tabbar-logout" type="submit">Đăng xuất</button>
        </form>
      </nav>
    </>
  );
}
