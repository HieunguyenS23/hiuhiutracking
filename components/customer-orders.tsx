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

type TrackingResult = {
  tracking?: string;
  status?: string;
  timeline?: Array<{ time?: string; description?: string }>;
  error?: string;
};

export function CustomerOrders({ initialOrders, initialError = '' }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState('');
  const [trackingLoading, setTrackingLoading] = useState('');
  const [trackingDetail, setTrackingDetail] = useState<{ tracking: string; result: TrackingResult } | null>(null);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    let stopped = false;

    const load = async () => {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tải được lịch sử đơn.');
        if (!stopped) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
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

  async function openTracking(tracking: string) {
    setTrackingLoading(tracking);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/tracking?tracking=${encodeURIComponent(tracking)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tra được hành trình vận đơn.');

      setTrackingDetail({ tracking, result: data.result || {} });
      setMessage('Đã tải hành trình vận đơn thành công.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tra được hành trình vận đơn.');
    } finally {
      setTrackingLoading('');
    }
  }

  return (
    <section className="phone-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Lịch sử đơn hàng</p>
          <h2>Danh sách đơn của bạn</h2>
        </div>
        <span className="chip">{orders.length} đơn</span>
      </div>
      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}
      <div className="order-list">
        {!error && orders.length === 0 ? <div className="empty-state">Chưa có đơn nào được gửi.</div> : null}
        {orders.map((order) => {
          const deliveryTone = detectDeliveryTone(order.deliveryStatus || '');
          return (
            <article className="order-card order-card-rich" key={order.id}>
              <div className="order-row order-top-row">
                <strong>{order.recipientName}</strong>
                <div className="order-status-wrap">
                  <span className={`status-pill status-${order.status}`}>{statusLabel[order.status] || 'Chờ xác nhận'}</span>
                  {order.deliveryTracking ? <span className="tracking-tag">{order.deliveryTracking}</span> : null}
                  {order.deliveryTracking ? (
                    <button
                      className="mini-action"
                      type="button"
                      onClick={() => openTracking(order.deliveryTracking)}
                      disabled={trackingLoading === order.deliveryTracking}
                    >
                      {trackingLoading === order.deliveryTracking ? 'Đang tra...' : 'Xem hành trình'}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="order-meta-grid">
                <span className="order-code-chip">Mã đơn hàng: {order.orderCode || 'Chưa có'}</span>
                <span className="amount-text">{order.orderAmount || 'Chưa có thành tiền'}</span>
              </div>

              <div className="order-row muted">
                <span className={`delivery-pill delivery-${deliveryTone}`}>{order.deliveryStatus || 'Chưa kiểm tra'}</span>
              </div>
              <p>{order.addressLine}, {order.ward}, {order.district}, {order.province}</p>
              <p>{order.productName ? `Tên sản phẩm: ${order.productName}` : 'Tên sản phẩm: Chưa có'}</p>
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

      {trackingDetail ? (
        <div className="modal-backdrop" onClick={() => setTrackingDetail(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head modern">
              <div>
                <p className="eyebrow">Vận đơn</p>
                <h3>{trackingDetail.tracking}</h3>
              </div>
              <button className="mini-action modal-close" onClick={() => setTrackingDetail(null)} type="button">Đóng</button>
            </div>
            <div className="modal-body modern">
              <div className="detail-item">
                <span>Trạng thái hiện tại</span>
                <strong>{trackingDetail.result?.status || trackingDetail.result?.error || 'Chưa có dữ liệu'}</strong>
              </div>
              <div className="detail-block">
                <span>Timeline</span>
                {Array.isArray(trackingDetail.result?.timeline) && trackingDetail.result.timeline.length > 0 ? (
                  <ul className="timeline-list">
                    {trackingDetail.result.timeline.map((item, idx) => (
                      <li key={`${item.time || ''}-${idx}`}>
                        <strong>{item.time || '--:--'}</strong>
                        <p>{item.description || 'Không có mô tả'}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có timeline chi tiết cho vận đơn này.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
