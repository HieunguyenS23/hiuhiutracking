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
        <p>Bên admin hiển thị dạng sheet để lọc và xử lí nhanh theo từng dòng đơn.</p>
      </section>

      <section className="phone-card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Danh sách đơn</p>
            <h2>Bảng quản lí</h2>
          </div>
          <span className="chip">{orders.length} đơn</span>
        </div>

        <div className="sheet-wrap">
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Username</th>
                <th>Người nhận</th>
                <th>SĐT</th>
                <th>Địa chỉ</th>
                <th>Loại mã</th>
                <th>Sản phẩm</th>
                <th>Phân loại</th>
                <th>SL</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td className="sheet-empty" colSpan={9}>Chưa có đơn nào.</td>
                </tr>
              ) : null}
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                  <td>@{order.username}</td>
                  <td>{order.recipientName}</td>
                  <td>{order.phone}</td>
                  <td>{order.addressLine}, {order.ward}, {order.district}, {order.province}</td>
                  <td>{order.voucherType.toUpperCase()}</td>
                  <td><a href={order.productLink} target="_blank">Mở link</a></td>
                  <td>{order.variant}</td>
                  <td>{order.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
