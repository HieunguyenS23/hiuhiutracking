'use client';

import { useEffect, useState } from 'react';
import type { OrderRecord } from '@/lib/types';

const statusLabel: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  ordered: 'Đã đặt',
};

function detectDeliveryTone(raw: string) {
  const value = raw.toLowerCase();
  if (value.includes('giao hàng thành công') || value.includes('đã giao') || value.includes('da giao')) return 'delivered';
  if (value.includes('hủy') || value.includes('huy') || value.includes('trả') || value.includes('tra hang')) return 'failed';
  if (value.includes('đang giao') || value.includes('dang giao') || value.includes('đang vận chuyển') || value.includes('van chuyen')) return 'shipping';
  return 'pending';
}

type Props = {
  initialOrders: OrderRecord[];
  initialError?: string;
};

export function CustomerOrders({ initialOrders, initialError = '' }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState(initialError);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được lịch sử đơn.');
        if (!stopped) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          setError('');
        }
      } catch (pollError) {
        if (!stopped) setError(pollError instanceof Error ? pollError.message : 'Không tải được lịch sử đơn.');
      }
    };

    const timer = window.setInterval(load, 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="phone-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lịch sử đơn hàng</p>
          <h2>Danh sách đơn của bạn</h2>
        </div>
        <span className="chip">{orders.length} đơn</span>
      </div>
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="order-list">
        {!error && orders.length === 0 ? <div className="empty-state">Chưa có đơn nào được gửi.</div> : null}
        {orders.map((order) => {
          const deliveryTone = detectDeliveryTone(order.deliveryStatus || '');
          return (
            <article className="order-card" key={order.id}>
              <div className="order-row">
                <strong>{order.recipientName}</strong>
                <div className="order-status-wrap">
                  <span className={`status-pill status-${order.status}`}>{statusLabel[order.status] || 'Chờ xác nhận'}</span>
                  {order.deliveryTracking ? <span className="tracking-tag">{order.deliveryTracking}</span> : null}
                </div>
              </div>
              <div className="order-row muted">
                <span className={`delivery-pill delivery-${deliveryTone}`}>{order.deliveryStatus || 'Chưa kiểm tra'}</span>
              </div>
              <p>{order.addressLine}, {order.ward}, {order.district}, {order.province}</p>
              <p>{order.variant} · SL {order.quantity}</p>
              <a className="order-link" href={order.productLink} target="_blank" rel="noreferrer">Mở link sản phẩm</a>
              <div className="order-row muted">
                <span>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
                <span>@{order.username}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

