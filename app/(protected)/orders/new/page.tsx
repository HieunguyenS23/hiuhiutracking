import { OrderForm } from '@/components/order-form';
import { CustomerOrders } from '@/components/customer-orders';
import { requireSession } from '@/lib/session';
import { getOrdersByUsername } from '@/lib/store';

export default async function NewOrderPage() {
  const session = await requireSession();

  let recentOrders = [] as Awaited<ReturnType<typeof getOrdersByUsername>>;
  let loadError = '';

  try {
    recentOrders = await getOrdersByUsername(session.username);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Không tải được lịch sử đơn.';
  }

  return (
    <div className="page-stack page-stack-spaced">
      <section className="hero-card">
        <p className="eyebrow">Dịch vụ</p>
        <h1>Lên đơn Shopee</h1>
        <p>Chọn địa chỉ hành chính bằng dropdown, kiểm tra tên và số điện thoại, rồi gửi đơn trực tiếp vào hệ thống.</p>
      </section>
      <OrderForm />
      <CustomerOrders initialOrders={recentOrders} initialError={loadError} />
    </div>
  );
}
