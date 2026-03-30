import { requireSession } from '@/lib/session';
import { MobileTabbar } from '@/components/mobile-tabbar';

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();
  const isAdmin = session.role === 'admin';

  return (
    <main className="app-shell">
      <div className={`app-frame ${isAdmin ? 'app-frame-admin' : ''}`}>
        <MobileTabbar isAdmin={isAdmin} username={session.username} />
        <div className="content-area">{children}</div>
      </div>
    </main>
  );
}
