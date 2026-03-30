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
            <div className="modal-head">
              <h3>Chi tiết đơn hàng</h3>
              <button className="mini-action" onClick={() => setDetailOrder(null)} type="button">Đóng</button>
            </div>
            <div className="modal-body">
              <p><strong>Trạng thái:</strong> <span className={`status-pill status-${detailOrder.status}`}>{statusLabel[detailOrder.status]}</span></p>
              <p><strong>Username:</strong> @{detailOrder.username}</p>
              <p><strong>Người nhận:</strong> {detailOrder.recipientName}</p>
              <p><strong>SĐT:</strong> {detailOrder.phone}</p>
              <p><strong>Địa chỉ:</strong> {detailOrder.addressLine}, {detailOrder.ward}, {detailOrder.district}, {detailOrder.province}</p>
              <p><strong>Loại mã:</strong> {detailOrder.voucherType.toUpperCase()}</p>
              <p><strong>Sản phẩm:</strong> <a href={detailOrder.productLink} target="_blank" rel="noreferrer">Mở link</a></p>
              <p><strong>Phân loại:</strong> {detailOrder.variant}</p>
              <p><strong>Số lượng:</strong> {detailOrder.quantity}</p>
              <p><strong>Cookie xử lí:</strong> {detailOrder.processingCookie || '(trống)'}</p>
              <p><strong>Account xử lí:</strong> {detailOrder.processingAccount || '(trống)'}</p>
              <p><strong>Thời gian tạo:</strong> {new Date(detailOrder.createdAt).toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
