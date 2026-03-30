import { requireAdmin } from '@/lib/session';
import { getOrders, getUsers } from '@/lib/store';
import { AdminOrdersTable } from '@/components/admin-orders-table';
import { AdminUsersManager } from '@/components/admin-users-manager';

export default async function AdminOrdersPage() {
  await requireAdmin();

  let orders = [] as Awaited<ReturnType<typeof getOrders>>;
  let users = [] as Awaited<ReturnType<typeof getUsers>>;
  let loadError = '';

  try {
    orders = await getOrders();
    users = await getUsers();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Không tải được dữ liệu admin.';
  }

  return (
    <div className="page-stack page-stack-spaced">
      <section className="phone-card">
        {loadError ? <div className="inline-error">{loadError}</div> : null}
        {!loadError ? <AdminOrdersTable initialOrders={orders} /> : null}
      </section>
      {!loadError ? <AdminUsersManager initialUsers={users.map((u) => ({ username: u.username, role: u.role, createdAt: u.createdAt }))} /> : null}
    </div>
  );
}
