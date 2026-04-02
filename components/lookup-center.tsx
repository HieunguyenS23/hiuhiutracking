'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { showToast } from '@/lib/client-toast';

type LookupOrder = {
  orderId?: number;
  statusText?: string;
  shopName?: string;
  total?: string;
  products?: Array<{ name?: string; model?: string; amount?: number; price?: string }>;
  recipient?: string;
  phone?: string;
  address?: string;
  tracking?: string;
  carrier?: string;
  shipPhone?: string;
  driverName?: string;
  orderTime?: string;
  canCancel?: boolean;
  isCheckout?: boolean;
};

type SpxResult = {
  tracking?: string;
  status?: string;
  timeline?: Array<{ time?: string; description?: string }>;
  records?: Array<{ time?: string; desc?: string; status?: string }>;
  error?: string;
};

function normalizeCookie(raw: string) {
  const value = String(raw || '').trim();
  if (!value) return '';
  return value.startsWith('SPC_ST=') ? value : `SPC_ST=${value}`;
}

function extractOrderProductName(order: LookupOrder) {
  const names = (order.products || []).map((item) => String(item?.name || '').trim()).filter(Boolean);
  if (names.length > 0) return names.join(' | ');
  return 'Chưa có';
}

export function LookupCenter() {
  const [tab, setTab] = useState<'cookie' | 'account' | 'qr' | 'spx'>('cookie');
  const [loading, setLoading] = useState(false);

  const [cookieInput, setCookieInput] = useState('');
  const [accountInput, setAccountInput] = useState('');
  const [spxInput, setSpxInput] = useState('');

  const [username, setUsername] = useState('');
  const [cookieOutput, setCookieOutput] = useState('');
  const [orders, setOrders] = useState<LookupOrder[]>([]);

  const [qrSessionId, setQrSessionId] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrStatusText, setQrStatusText] = useState('Chưa tạo QR.');

  const [spxResults, setSpxResults] = useState<SpxResult[]>([]);
  const [spxDetail, setSpxDetail] = useState<SpxResult | null>(null);

  const pollTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, []);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const cancelable = orders.filter((item) => item.canCancel).length;
    const shipping = orders.filter((item) => String(item.statusText || '').toLowerCase().includes('giao')).length;
    return { total, cancelable, shipping };
  }, [orders]);

  async function callLookup(payload: Record<string, unknown>) {
    const response = await fetch('/api/admin/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(data.error || 'Gọi API tra cứu thất bại.'));
    }

    return data;
  }

  async function runCheckByCookie(cookieRaw: string) {
    const cookie = normalizeCookie(cookieRaw);
    if (!cookie) {
      showToast('Bạn chưa nhập cookie SPC_ST.', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await callLookup({ action: 'check', cookie });
      const payload = data.data || {};
      const nextOrders = Array.isArray(payload.orders) ? payload.orders : [];
      setOrders(nextOrders);
      setCookieInput(String(payload.cookie || cookie));
      setCookieOutput(String(payload.cookie || cookie));
      setUsername(String(payload.username || ''));
      showToast(`Tra cứu thành công: ${nextOrders.length} đơn.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không kiểm tra được cookie.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function runLoginAndCheck() {
    const input = String(accountInput || '').trim();
    if (!input) {
      showToast('Bạn chưa nhập user|pass|SPC_F.', 'error');
      return;
    }

    setLoading(true);
    try {
      const login = await callLookup({ action: 'login', input });
      const payload = login.data || {};
      const cookie = String(payload.cookie || '');

      setCookieOutput(cookie);
      setCookieInput(cookie);
      setUsername(String(payload.username || ''));

      const nextOrders = Array.isArray(payload.orders) ? payload.orders : [];
      if (nextOrders.length > 0) {
        setOrders(nextOrders);
      } else {
        await runCheckByCookie(cookie);
      }

      showToast('Đăng nhập và lấy SPC_ST thành công.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không lấy được SPC_ST.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function startQrLogin() {
    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    setLoading(true);
    try {
      const result = await callLookup({ action: 'qr_generate' });
      const payload = result.data || {};
      const sessionId = String(payload.sessionId || payload.session_id || '');
      const qrBase64 = String(payload.qrBase64 || payload.qr_base64 || '');

      if (!sessionId || !qrBase64) throw new Error('API không trả sessionId hoặc qrBase64.');

      setQrSessionId(sessionId);
      setQrImage(qrBase64);
      setQrStatusText('Đang chờ quét QR...');

      pollTimer.current = window.setInterval(async () => {
        try {
          const statusResult = await callLookup({ action: 'qr_status', sessionId });
          const statusPayload = statusResult.data || {};
          const status = String(statusPayload.status || '').trim().toLowerCase();

          if (!status) return;

          if (status === 'waiting') {
            setQrStatusText('Đang chờ quét QR...');
            return;
          }

          if (status === 'scanned') {
            setQrStatusText('Đã quét QR, chờ xác nhận trên app Shopee...');
            return;
          }

          if (status === 'success') {
            if (pollTimer.current) {
              window.clearInterval(pollTimer.current);
              pollTimer.current = null;
            }
            const cookie = normalizeCookie(String(statusPayload.cookie || ''));
            setQrStatusText('Đăng nhập QR thành công.');
            setCookieOutput(cookie);
            setCookieInput(cookie);
            showToast('QR login thành công, đã lấy cookie.', 'success');
            await runCheckByCookie(cookie);
            return;
          }

          if (status === 'failed') {
            if (pollTimer.current) {
              window.clearInterval(pollTimer.current);
              pollTimer.current = null;
            }
            setQrStatusText('Phiên QR thất bại hoặc đã hết hạn.');
            showToast('QR login thất bại hoặc hết hạn.', 'error');
          }
        } catch {
          // ignore transient polling errors
        }
      }, 2500);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không tạo được QR login.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function cancelQr() {
    const sessionId = String(qrSessionId || '').trim();
    if (!sessionId) return;

    try {
      await callLookup({ action: 'qr_cancel', sessionId });
    } catch {
      // ignore
    }

    if (pollTimer.current) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }

    setQrSessionId('');
    setQrImage('');
    setQrStatusText('Đã hủy phiên QR.');
    showToast('Đã hủy phiên QR.', 'success');
  }

  async function cancelOrder(order: LookupOrder) {
    const cookie = normalizeCookie(cookieInput || cookieOutput);
    if (!cookie || !order.orderId) {
      showToast('Thiếu cookie hoặc mã đơn để hủy.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await callLookup({
        action: 'cancel',
        cookie,
        orderId: order.orderId,
        isCheckout: Boolean(order.isCheckout),
      });
      showToast(String(result?.data?.message || `Đã hủy đơn #${order.orderId}.`), 'success');
      await runCheckByCookie(cookie);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể hủy đơn này.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function runSpxLookup() {
    const trackings = spxInput
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (trackings.length === 0) {
      showToast('Bạn chưa nhập mã vận đơn SPX.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await callLookup({ action: 'spx', trackings });
      const rows = Array.isArray(result?.data?.results) ? result.data.results : [];
      setSpxResults(rows);
      setSpxDetail(rows[0] || null);
      showToast(`Đã tra ${rows.length} vận đơn.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không tra được SPX.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function copyCookie() {
    const text = normalizeCookie(cookieOutput || cookieInput);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showToast('Đã copy SPC_ST.', 'success');
  }

  return (
    <section className="phone-card users-manager-wrap lookup-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Tra cứu</h2>
        </div>
        <span className="chip">{orderStats.total} đơn</span>
      </div>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Đăng nhập và tra đơn Shopee</h3>
          <span className="muted">API: dodanhvu.dpdns.org</span>
        </div>

        <div className="lookup-tabs">
          <button type="button" className={tab === 'cookie' ? 'is-active' : ''} onClick={() => setTab('cookie')}>Cookie</button>
          <button type="button" className={tab === 'account' ? 'is-active' : ''} onClick={() => setTab('account')}>User|Pass</button>
          <button type="button" className={tab === 'qr' ? 'is-active' : ''} onClick={() => setTab('qr')}>QR Login</button>
          <button type="button" className={tab === 'spx' ? 'is-active' : ''} onClick={() => setTab('spx')}>Tra MVĐ</button>
        </div>

        {tab === 'cookie' ? (
          <div className="form-grid compact lookup-form-grid">
            <label className="full-span"><span>Cookie SPC_ST</span><input value={cookieInput} onChange={(e) => setCookieInput(e.target.value)} placeholder="SPC_ST=..." /></label>
            <button className="primary-button" type="button" disabled={loading} onClick={() => runCheckByCookie(cookieInput)}>Kiểm tra đơn</button>
            <button className="ghost-button" type="button" disabled={loading} onClick={copyCookie}>Copy SPC_ST</button>
          </div>
        ) : null}

        {tab === 'account' ? (
          <div className="form-grid compact lookup-form-grid">
            <label className="full-span"><span>User|Pass|SPC_F</span><input value={accountInput} onChange={(e) => setAccountInput(e.target.value)} placeholder="username|password|SPC_F" /></label>
            <button className="primary-button" type="button" disabled={loading} onClick={runLoginAndCheck}>Lấy SPC_ST + Tra đơn</button>
            <button className="ghost-button" type="button" disabled={loading} onClick={copyCookie}>Copy SPC_ST</button>
          </div>
        ) : null}

        {tab === 'qr' ? (
          <div className="lookup-qr-wrap">
            <div className="lookup-qr-actions">
              <button className="primary-button" type="button" disabled={loading} onClick={startQrLogin}>Tạo QR</button>
              <button className="ghost-button" type="button" onClick={cancelQr}>Hủy QR</button>
            </div>
            <p className="lookup-qr-status">{qrStatusText}</p>
            {qrImage ? <img className="lookup-qr-image" src={qrImage} alt="QR Login" /> : null}
          </div>
        ) : null}

        {tab === 'spx' ? (
          <div className="form-grid compact lookup-form-grid">
            <label className="full-span">
              <span>Mã vận đơn SPX (mỗi dòng 1 mã)</span>
              <textarea value={spxInput} onChange={(e) => setSpxInput(e.target.value)} placeholder={'SPXVN...\nSPXVN...'} />
            </label>
            <button className="primary-button" type="button" disabled={loading} onClick={runSpxLookup}>Tra cứu SPX</button>
          </div>
        ) : null}

        <div className="lookup-output">
          <div><span>Username:</span><strong>{username || 'Chưa có'}</strong></div>
          <div><span>SPC_ST:</span><strong>{cookieOutput ? 'Đã có cookie' : 'Chưa có'}</strong></div>
        </div>
      </article>

      {tab === 'spx' ? (
        <article className="hub-card">
          <div className="hub-card-head">
            <h3>Kết quả vận đơn</h3>
            <span className="chip">{spxResults.length} mã</span>
          </div>

          <div className="lookup-spx-grid">
            <div className="lookup-spx-list">
              {spxResults.length === 0 ? <div className="empty-state">Chưa có kết quả tra vận đơn.</div> : null}
              {spxResults.map((row, index) => (
                <button key={`${row.tracking || 'tracking'}-${index}`} className={`lookup-spx-item ${spxDetail?.tracking === row.tracking ? 'is-active' : ''}`} type="button" onClick={() => setSpxDetail(row)}>
                  <strong>{row.tracking || 'Không rõ mã'}</strong>
                  <span>{row.error || row.status || 'Chưa có trạng thái'}</span>
                </button>
              ))}
            </div>

            <div className="lookup-spx-detail">
              {!spxDetail ? <div className="empty-state">Chọn một vận đơn để xem timeline.</div> : null}
              {spxDetail ? (
                <>
                  <h4>{spxDetail.tracking}</h4>
                  <p className="lookup-spx-current">{spxDetail.error || spxDetail.status || 'Chưa có trạng thái'}</p>
                  <div className="lookup-timeline">
                    {(spxDetail.timeline || spxDetail.records || []).length === 0 ? <div className="empty-state">Chưa có timeline.</div> : null}
                    {(spxDetail.timeline || spxDetail.records || []).map((item, idx) => (
                      <div className="lookup-timeline-item" key={`${item.time || idx}-${idx}`}>
                        <strong>{(item as any).description || (item as any).desc || (item as any).status || 'Không rõ mô tả'}</strong>
                        <small>{item.time || 'Không rõ thời gian'}</small>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </article>
      ) : null}

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Danh sách đơn</h3>
          <div className="lookup-order-stats">
            <span>Tổng: {orderStats.total}</span>
            <span>Hủy được: {orderStats.cancelable}</span>
            <span>Đang giao: {orderStats.shipping}</span>
          </div>
        </div>

        <div className="lookup-orders-grid">
          {orders.length === 0 ? <div className="empty-state">Chưa có đơn để hiển thị.</div> : null}
          {orders.map((order, idx) => (
            <article className="lookup-order-card" key={`${order.orderId || idx}-${idx}`}>
              <div className="lookup-order-head">
                <strong>#{order.orderId || '---'}</strong>
                <span className="status-pill status-ordered">{order.statusText || 'Chưa rõ trạng thái'}</span>
              </div>

              <p><b>Người nhận:</b> {order.recipient || 'Chưa có'}</p>
              <p><b>SĐT:</b> {order.phone || 'Chưa có'}</p>
              <p><b>Địa chỉ:</b> {order.address || 'Chưa có'}</p>
              <p><b>Sản phẩm:</b> {extractOrderProductName(order)}</p>
              <p><b>Tổng:</b> {order.total || 'Chưa có'}</p>
              <p><b>Mã vận đơn:</b> {order.tracking || 'Chưa có'}</p>
              <p><b>Thời gian:</b> {order.orderTime || 'Chưa có'}</p>

              <div className="lookup-order-actions">
                <button
                  type="button"
                  className="mini-action"
                  onClick={() => cancelOrder(order)}
                  disabled={loading || !order.canCancel}
                >
                  Hủy đơn
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
