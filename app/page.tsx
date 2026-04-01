import Image from 'next/image';
import Link from 'next/link';
import { getSession } from '@/lib/session';

export default async function HomePage() {
  const session = await getSession();

  return (
    <main className="auth-shell landing-shell">
      <section className="hero-card landing-card">
        <div className="landing-grid">
          <div className="landing-copy">
            <p className="eyebrow">Shopee Portal</p>
            <h1>Lên đơn nhanh, theo dõi rõ, quản lí tập trung</h1>
            <p>
              Hệ thống hỗ trợ khách hàng điền đơn nhanh trên điện thoại, theo dõi lịch sử và hành trình vận đơn.
              Admin có thể quản lí đơn, tài khoản, thông báo, chat và cấu hình voucher ngay trong một nơi.
            </p>

            <div className="landing-actions">
              <Link className="primary-button landing-btn" href={session ? '/orders/new' : '/login'}>
                {session ? 'Vào hệ thống' : 'Đăng nhập ngay'}
              </Link>
              <Link className="ghost-button landing-btn" href={session ? '/orders/history' : '/login'}>
                Xem tính năng
              </Link>
            </div>

            <div className="landing-list">
              <span className="chip chip-soft">Lên đơn nhanh</span>
              <span className="chip chip-soft">Theo dõi vận đơn</span>
              <span className="chip chip-soft">Thông báo realtime</span>
              <span className="chip chip-soft">Chat admin - khách</span>
            </div>
          </div>

          <div className="landing-image-wrap">
            <Image src="/landing-hero.svg" alt="Shopee Portal" width={900} height={520} className="landing-image" priority />
          </div>
        </div>
      </section>
    </main>
  );
}
