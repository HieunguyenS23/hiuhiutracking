import { requireSession } from '@/lib/session';
import { MobileTabbar } from '@/components/mobile-tabbar';

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession();

  return (
    <main className="app-shell">
      <div className="app-frame">
        <MobileTabbar isAdmin={session.role === 'admin'} username={session.username} />
        <div className="content-area">{children}</div>
      </div>
    </main>
  );
}
