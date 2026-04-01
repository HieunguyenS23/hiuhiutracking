import { ProfileCenter } from '@/components/profile-center';
import { requireSession } from '@/lib/session';

export default async function ProfilePage() {
  const session = await requireSession();
  const isAdmin = session.role === 'admin';

  return (
    <div className="page-stack page-stack-spaced">
      <ProfileCenter isAdmin={isAdmin} username={session.username} />
    </div>
  );
}
