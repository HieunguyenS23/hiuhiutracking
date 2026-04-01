import { AnnouncementsCenter } from '@/components/announcements-center';
import { requireSession } from '@/lib/session';

export default async function AnnouncementsPage() {
  const session = await requireSession();
  const isAdmin = session.role === 'admin';

  return (
    <div className="page-stack page-stack-spaced">
      <AnnouncementsCenter isAdmin={isAdmin} />
    </div>
  );
}
