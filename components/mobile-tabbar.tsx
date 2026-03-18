'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  isAdmin: boolean;
  username: string;
};

export function MobileTabbar({ isAdmin, username }: Props) {
  const pathname = usePathname();

  return (
    <>
      <header className="mobile-topbar">
        <div>
          <p className="eyebrow">Khách hàng</p>
          <strong>@{username}</strong>
        </div>
        <form action="/api/auth/logout" method="post">
          <button className="ghost-button" type="submit">Thoát</button>
        </form>
      </header>
      <nav className="mobile-tabbar">
        <Link className={pathname.startsWith('/orders') ? 'is-active' : ''} href="/orders/new">Lên đơn</Link>
        {isAdmin ? <Link className={pathname.startsWith('/admin') ? 'is-active' : ''} href="/admin/orders">Quản lí đơn</Link> : null}
      </nav>
    </>
  );
}
