import { requireAdmin } from '@/lib/session';
import { getOrders } from '@/lib/store';

export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await getOrders();

  return (
    <div className="page-stack page-stack-spaced">
      <section className="hero-card">
        <p className="eyebrow">Admin</p>
        <h1>Quản lí đơn đặt</h1>
        <p>Tất cả đơn khách hàng gửi lên đều đổ về đây, có kèm username và đầy đủ địa chỉ đã chọn từ Google Maps.</p>
      </section>
      <section className="phone-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Danh sách đơn</p>
            <h2>Bảng quản lí</h2>
          </div>
          <span className="chip">{orders.length} đơn</span>
        </div>
        <div className="order-list">
          {orders.length === 0 ? <div className="empty-state">Chưa có đơn nào.</div> : null}
          {orders.map((order) => (
            <article className="order-card admin-card" key={order.id}>
              <div className="order-row">
                <strong>{order.recipientName}</strong>
                <span className="chip chip-soft">@{order.username}</span>
              </div>
              <p><strong>SĐT:</strong> {order.phone}</p>
              <p><strong>Địa chỉ:</strong> {order.addressLine}, {order.ward}, {order.district}, {order.province}</p>
              <p><strong>Sản phẩm:</strong> <a href={order.productLink} target="_blank">{order.productLink}</a></p>
              <p><strong>Phân loại:</strong> {order.variant} · <strong>SL:</strong> {order.quantity}</p>
              <div className="order-row muted">
                <span>{order.voucherType.toUpperCase()}</span>
                <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
