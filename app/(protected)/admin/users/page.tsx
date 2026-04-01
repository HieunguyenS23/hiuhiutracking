import { requireAdmin } from '@/lib/session';
import { getUsers } from '@/lib/store';
import { AdminUsersManager } from '@/components/admin-users-manager';
import { ServerToast } from '@/components/server-toast';

export default async function AdminUsersPage() {
  await requireAdmin();

  let users = [] as Awaited<ReturnType<typeof getUsers>>;
  let loadError = '';

  try {
    users = await getUsers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Không tải được danh sách tài khoản.';
  }

  return (
    <div className="page-stack page-stack-spaced">
      {loadError ? <ServerToast message={loadError} variant="error" /> : null}
      {!loadError ? <AdminUsersManager initialUsers={users.map((u) => ({ username: u.username, role: u.role, createdAt: u.createdAt, unreadCount: 0 }))} /> : null}
    </div>
  );
}
