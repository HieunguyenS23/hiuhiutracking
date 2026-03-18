import { OrderForm } from '@/components/order-form';
import { requireSession } from '@/lib/session';
import { getOrdersByUsername } from '@/lib/store';

export default async function NewOrderPage() {
  const session = await requireSession();
  const recentOrders = await getOrdersByUsername(session.username);

  return (
    <div className="page-stack page-stack-spaced">
      <section className="hero-card">
        <p className="eyebrow">Dịch vụ</p>
        <h1>Lên đơn Shopee</h1>
        <p>Chọn địa chỉ bằng Google Maps, kiểm tra tên và số điện thoại ngay trên form, rồi gửi đơn trực tiếp vào hệ thống.</p>
      </section>
      <OrderForm />
      <section className="phone-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Lịch sử cá nhân</p>
            <h2>Đơn gần đây của bạn</h2>
          </div>
          <span className="chip">{recentOrders.length} đơn</span>
        </div>
        <div className="order-list">
          {recentOrders.length === 0 ? <div className="empty-state">Chưa có đơn nào được gửi.</div> : null}
          {recentOrders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-row">
                <strong>{order.recipientName}</strong>
                <span className="chip chip-soft">{order.voucherType.toUpperCase()}</span>
              </div>
              <p>{order.addressLine}, {order.ward}, {order.district}, {order.province}</p>
              <p>{order.variant} · SL {order.quantity}</p>
              <div className="order-row muted">
                <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                <span>@{order.username}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
