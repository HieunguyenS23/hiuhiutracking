import { requireAdmin } from '@/lib/session';
import { getOrders } from '@/lib/store';
import { AdminOrdersTable } from '@/components/admin-orders-table';

export default async function AdminOrdersPage() {
  await requireAdmin();

  let orders = [] as Awaited<ReturnType<typeof getOrders>>;
  let loadError = '';

  try {
    orders = await getOrders();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Không tải được dữ liệu đơn hàng.';
  }

  return (
    <div className="page-stack page-stack-spaced">
      <section className="phone-card ui-polish-admin-orders">
        {loadError ? <div className="inline-error">{loadError}</div> : null}
        {!loadError ? <AdminOrdersTable initialOrders={orders} /> : null}
      </section>
    </div>
  );
}
