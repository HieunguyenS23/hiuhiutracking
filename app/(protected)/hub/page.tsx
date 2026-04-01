import { UserHub } from '@/components/user-hub';
import { requireSession } from '@/lib/session';

export default async function HubPage() {
  const session = await requireSession();
  const isAdmin = session.role === 'admin';

  return (
    <div className="page-stack page-stack-spaced">
      <UserHub isAdmin={isAdmin} username={session.username} />
    </div>
  );
}
