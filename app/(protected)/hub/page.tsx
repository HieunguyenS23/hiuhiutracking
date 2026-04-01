import { UserHub } from '@/components/user-hub';
import { requireSession } from '@/lib/session';
import { getUsers } from '@/lib/store';

export default async function HubPage() {
  const session = await requireSession();
  const isAdmin = session.role === 'admin';

  const userOptions = isAdmin
    ? (await getUsers())
        .filter((item) => item.role === 'customer')
        .map((item) => item.username)
    : [];

  return (
    <div className="page-stack page-stack-spaced">
      <UserHub isAdmin={isAdmin} username={session.username} userOptions={userOptions} />
    </div>
  );
}
