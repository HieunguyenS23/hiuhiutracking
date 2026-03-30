'use client';

import { useMemo, useState } from 'react';
import type { OrderRecord, OrderStatus } from '@/lib/types';

type Props = {
  initialOrders: OrderRecord[];
};

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Chờ xác nhận' },
  { value: 'confirmed', label: 'Đã xác nhận' },
  { value: 'ordered', label: 'Đã đặt' },
];

const statusLabel: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  ordered: 'Đã đặt',
};

export function AdminOrdersTable({ initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);

  async function patchOrder(orderId: string, payload: Partial<Pick<OrderRecord, 'status' | 'processingCookie' | 'processingAccount'>>) {
    setSavingId(orderId);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được đơn.');

      const updated = data.order as OrderRecord;
      setOrders((prev) => prev.map((item) => (item.id === orderId ? updated : item)));
      if (detailOrder?.id === updated.id) setDetailOrder(updated);
      setMessage('Đã cập nhật đơn thành công.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Đã có lỗi xảy ra.');
    } finally {
      setSavingId('');
    }
  }

  function setOrderField(orderId: string, field: 'processingCookie' | 'processingAccount', value: string) {
    setOrders((prev) => prev.map((item) => (item.id === orderId ? { ...item, [field]: value } : item)));
    if (detailOrder?.id === orderId) setDetailOrder({ ...detailOrder, [field]: value });
  }

  async function commitField(order: OrderRecord, field: 'processingCookie' | 'processingAccount', value: string) {
    const normalized = value.trim();
    if (normalized === (order[field] || '').trim()) return;
    await patchOrder(order.id, { [field]: normalized });
  }

  const total = useMemo(() => orders.length, [orders.length]);

  return (
    <>
      <div className="section-head">
        <div>
          <p className="eyebrow">Danh sách đơn</p>
          <h2>Bảng quản lí</h2>
        </div>
        <span className="chip">{total} đơn</span>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="sheet-wrap">
        <table className="sheet-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Check</th>
              <th className="col-cookie">Cookie</th>
              <th className="col-account">Account</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="sheet-empty" colSpan={5}>Chưa có đơn nào.</td>
              </tr>
            ) : null}
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                <td className="col-check">
                  <select
                    className={`status-select status-${order.status}`}
                    value={order.status}
                    disabled={savingId === order.id}
                    onChange={(event) => patchOrder(order.id, { status: event.target.value as OrderStatus })}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    className="admin-inline-input"
                    value={order.processingCookie || ''}
                    disabled={savingId === order.id}
                    placeholder="Nhập cookie"
                    onChange={(event) => setOrderField(order.id, 'processingCookie', event.target.value)}
                    onBlur={(event) => commitField(order, 'processingCookie', event.target.value)}
                  />
                </td>
                <td>
                  <input
                    className="admin-inline-input"
                    value={order.processingAccount || ''}
                    disabled={savingId === order.id}
                    placeholder="Nhập account"
                    onChange={(event) => setOrderField(order.id, 'processingAccount', event.target.value)}
                    onBlur={(event) => commitField(order, 'processingAccount', event.target.value)}
                  />
                </td>
                <td>
                  <button className="mini-action" type="button" onClick={() => setDetailOrder(order)}>
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailOrder ? (
        <div className="modal-backdrop" onClick={() => setDetailOrder(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head modern">
              <div>
                <p className="eyebrow">Đơn hàng</p>
                <h3>Chi tiết #{detailOrder.id.slice(0, 8)}</h3>
              </div>
              <button className="mini-action modal-close" onClick={() => setDetailOrder(null)} type="button">Đóng</button>
            </div>

            <div className="modal-body modern">
              <div className="modal-status-row">
                <span className={`status-pill status-${detailOrder.status}`}>{statusLabel[detailOrder.status]}</span>
                <span className="modal-muted">{new Date(detailOrder.createdAt).toLocaleString('vi-VN')}</span>
              </div>

              <div className="detail-grid">
                <div className="detail-item"><span>Username</span><strong>@{detailOrder.username}</strong></div>
                <div className="detail-item"><span>Người nhận</span><strong>{detailOrder.recipientName}</strong></div>
                <div className="detail-item"><span>SĐT</span><strong>{detailOrder.phone}</strong></div>
                <div className="detail-item"><span>Loại mã</span><strong>{detailOrder.voucherType.toUpperCase()}</strong></div>
                <div className="detail-item"><span>Phân loại</span><strong>{detailOrder.variant}</strong></div>
                <div className="detail-item"><span>Số lượng</span><strong>{detailOrder.quantity}</strong></div>
              </div>

              <div className="detail-block">
                <span>Địa chỉ</span>
                <p>{detailOrder.addressLine}, {detailOrder.ward}, {detailOrder.district}, {detailOrder.province}</p>
              </div>

              <div className="detail-block">
                <span>Sản phẩm</span>
                <a className="order-link" href={detailOrder.productLink} target="_blank" rel="noreferrer">Mở link sản phẩm</a>
              </div>

              <div className="detail-grid">
                <div className="detail-item wide">
                  <span>Cookie xử lí</span>
                  <p>{detailOrder.processingCookie || '(trống)'}</p>
                </div>
                <div className="detail-item wide">
                  <span>Account xử lí</span>
                  <p>{detailOrder.processingAccount || '(trống)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
