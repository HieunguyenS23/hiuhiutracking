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

export function AdminOrdersTable({ initialOrders }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [savingId, setSavingId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      setMessage('Đã cập nhật đơn thành công.');
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Đã có lỗi xảy ra.');
    } finally {
      setSavingId('');
    }
  }

  function setOrderField(orderId: string, field: 'processingCookie' | 'processingAccount', value: string) {
    setOrders((prev) => prev.map((item) => (item.id === orderId ? { ...item, [field]: value } : item)));
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
              <th>Username</th>
              <th className="col-check">Check</th>
              <th>Người nhận</th>
              <th>SĐT</th>
              <th className="col-address">Địa chỉ</th>
              <th>Loại mã</th>
              <th>Sản phẩm</th>
              <th>Phân loại</th>
              <th>SL</th>
              <th className="col-cookie">Cookie</th>
              <th className="col-account">Account</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="sheet-empty" colSpan={12}>Chưa có đơn nào.</td>
              </tr>
            ) : null}
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                <td>@{order.username}</td>
                <td>
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
                <td>{order.recipientName}</td>
                <td>{order.phone}</td>
                <td className="cell-address" title={`${order.addressLine}, ${order.ward}, ${order.district}, ${order.province}`}>
                  {order.addressLine}, {order.ward}, {order.district}, {order.province}
                </td>
                <td>{order.voucherType.toUpperCase()}</td>
                <td><a href={order.productLink} target="_blank" rel="noreferrer">Mở link</a></td>
                <td>{order.variant}</td>
                <td>{order.quantity}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
