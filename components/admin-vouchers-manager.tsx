'use client';

import { useEffect, useMemo, useState } from 'react';

type Voucher = {
  id: string;
  label: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Settings = {
  orderFormEnabled: boolean;
  updatedAt: string;
};

export function AdminVouchersManager() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('0');

  const activeCount = useMemo(() => vouchers.filter((item) => item.active).length, [vouchers]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  async function loadAll() {
    setLoading(true);
    try {
      const [voucherRes, settingsRes] = await Promise.all([
        fetch('/api/vouchers', { cache: 'no-store' }),
        fetch('/api/settings', { cache: 'no-store' }),
      ]);

      const voucherData = await voucherRes.json();
      const settingsData = await settingsRes.json();

      if (!voucherRes.ok) throw new Error(voucherData.error || 'Không tải được voucher.');
      if (!settingsRes.ok) throw new Error(settingsData.error || 'Không tải được cài đặt.');

      setVouchers(Array.isArray(voucherData.vouchers) ? voucherData.vouchers : []);
      setSettings(settingsData.settings || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được dữ liệu voucher.');
    } finally {
      setLoading(false);
    }
  }

  async function createNewVoucher() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId,
          label: newLabel,
          price: Number(newPrice || 0),
          active: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được voucher.');
      setMessage('Đã tạo voucher mới.');
      setNewId('');
      setNewLabel('');
      setNewPrice('0');
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Không tạo được voucher.');
    } finally {
      setLoading(false);
    }
  }

  async function saveVoucher(voucher: Voucher) {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/vouchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: voucher.id,
          label: voucher.label,
          price: voucher.price,
          active: voucher.active,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được voucher.');
      setMessage(`Đã lưu voucher ${voucher.id}.`);
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không cập nhật được voucher.');
    } finally {
      setLoading(false);
    }
  }

  async function removeVoucher(id: string) {
    if (!confirm(`Xóa voucher ${id}?`)) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/vouchers?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được voucher.');
      setMessage(`Đã xóa voucher ${id}.`);
      await loadAll();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không xóa được voucher.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleOrderForm(enabled: boolean) {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderFormEnabled: enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được cài đặt.');
      setSettings(data.settings || settings);
      setMessage(enabled ? 'Đã mở form lên đơn.' : 'Đã đóng form lên đơn.');
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Không cập nhật được cài đặt.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card users-manager-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Quản lí voucher</h2>
        </div>
        <span className="chip">{activeCount}/{vouchers.length} đang bật</span>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Trạng thái form lên đơn</h3>
        </div>
        <div className="order-form-switch-row">
          <strong>{settings?.orderFormEnabled ? 'Đang mở' : 'Đang đóng'}</strong>
          <button
            type="button"
            className="mini-action"
            disabled={loading}
            onClick={() => toggleOrderForm(!(settings?.orderFormEnabled ?? true))}
          >
            {settings?.orderFormEnabled ? 'Đóng form' : 'Mở form'}
          </button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Thêm voucher mới</h3>
        </div>
        <div className="form-grid compact">
          <label><span>Mã</span><input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="vd: 50k" /></label>
          <label><span>Tên hiển thị</span><input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Mã 50k" /></label>
          <label><span>Giá</span><input type="number" min={0} value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></label>
          <button className="primary-button" type="button" disabled={loading} onClick={createNewVoucher}>Tạo voucher</button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Danh sách voucher</h3>
        </div>

        <div className="voucher-list">
          {vouchers.length === 0 ? <div className="empty-state">Chưa có voucher.</div> : null}
          {vouchers.map((voucher) => (
            <div key={voucher.id} className="voucher-item">
              <div className="form-grid compact">
                <label><span>Mã</span><input value={voucher.id} disabled className="readonly-input" /></label>
                <label><span>Tên</span><input value={voucher.label} onChange={(e) => setVouchers((prev) => prev.map((item) => item.id === voucher.id ? { ...item, label: e.target.value } : item))} /></label>
                <label><span>Giá</span><input type="number" min={0} value={voucher.price} onChange={(e) => setVouchers((prev) => prev.map((item) => item.id === voucher.id ? { ...item, price: Number(e.target.value || 0) } : item))} /></label>
                <label>
                  <span>Trạng thái</span>
                  <select value={voucher.active ? 'on' : 'off'} onChange={(e) => setVouchers((prev) => prev.map((item) => item.id === voucher.id ? { ...item, active: e.target.value === 'on' } : item))}>
                    <option value="on">Đang bật</option>
                    <option value="off">Đang tắt</option>
                  </select>
                </label>
              </div>

              <div className="voucher-actions">
                <button className="mini-action" type="button" onClick={() => saveVoucher(voucher)} disabled={loading}>Lưu</button>
                <button className="mini-action" type="button" onClick={() => removeVoucher(voucher.id)} disabled={loading}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
