import { CustomerOrders } from '@/components/customer-orders';
import { requireSession } from '@/lib/session';
import { getOrders, getOrdersByUsername } from '@/lib/store';

export default async function OrderHistoryPage() {
  const session = await requireSession();

  let recentOrders = [] as Awaited<ReturnType<typeof getOrdersByUsername>>;
  let loadError = '';

  try {
    recentOrders = session.role === 'admin' ? await getOrders() : await getOrdersByUsername(session.username);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Không t?i du?c l?ch s? don.';
  }

  return (
    <div className="page-stack page-stack-spaced">
      <CustomerOrders initialOrders={recentOrders} initialError={loadError} />
    </div>
  );
}

