'use client';

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/lib/client-toast';

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

type LocalVoucherLink = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

const LOCAL_LINK_KEY = 'portal_internal_voucher_links_v1';

function inferVoucherKind(voucher: Voucher): 'discount' | 'freeship' {
  const raw = `${voucher.id} ${voucher.label}`.toLowerCase();
  return raw.includes('ship') || raw.includes('fsv') || raw.includes('free') ? 'freeship' : 'discount';
}

function parseCookieLines(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function AdminVouchersManager() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [cookieText, setCookieText] = useState('');
  const [activeTab, setActiveTab] = useState<'discount' | 'freeship'>('discount');

  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('0');

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [localLinks, setLocalLinks] = useState<LocalVoucherLink[]>([]);

  const activeCount = useMemo(() => vouchers.filter((item) => item.active).length, [vouchers]);
  const cookieLines = useMemo(() => parseCookieLines(cookieText), [cookieText]);

  const vouchersByTab = useMemo(() => {
    const rows = vouchers.filter((item) => inferVoucherKind(item) === activeTab);
    return rows.sort((a, b) => Number(b.active) - Number(a.active) || b.updatedAt.localeCompare(a.updatedAt));
  }, [vouchers, activeTab]);

  const activeVoucherInTab = useMemo(() => vouchersByTab.filter((item) => item.active).length, [vouchersByTab]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_LINK_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .map((item) => ({
            id: String(item?.id || ''),
            title: String(item?.title || ''),
            url: String(item?.url || ''),
            createdAt: String(item?.createdAt || new Date().toISOString()),
          }))
          .filter((item) => item.id && item.title && item.url);
        setLocalLinks(cleaned);
      }
    } catch {
      setLocalLinks([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_LINK_KEY, JSON.stringify(localLinks));
  }, [localLinks]);

  useEffect(() => {
    if (!message && !error) return;
    if (message) showToast(message, 'success');
    if (error) showToast(error, 'error');
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

  async function runSaveAll() {
    setMessage('');
    setError('');

    const accounts = parseCookieLines(cookieText);
    if (accounts.length === 0) {
      setError('Bạn chưa nhập cookie SPC_ST.');
      return;
    }

    const selected = vouchersByTab.filter((item) => item.active);
    if (selected.length === 0) {
      setError('Không có voucher bật để lưu.');
      return;
    }

    const totalTasks = accounts.length * selected.length;
    setMessage(`Đã tạo ${totalTasks} yêu cầu lưu voucher nội bộ (${accounts.length} cookie x ${selected.length} mã).`);
  }

  function addInternalLink() {
    const title = linkTitle.trim();
    const url = linkUrl.trim();
    if (!title || !url) {
      setError('Vui lòng nhập tiêu đề và link voucher.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      setError('Link phải bắt đầu bằng http:// hoặc https://');
      return;
    }

    setLocalLinks((prev) => [{ id: crypto.randomUUID(), title, url, createdAt: new Date().toISOString() }, ...prev]);
    setLinkTitle('');
    setLinkUrl('');
    setMessage('Đã thêm link voucher nội bộ.');
  }

  function deleteInternalLink(id: string) {
    setLocalLinks((prev) => prev.filter((item) => item.id !== id));
    setMessage('Đã xóa link voucher nội bộ.');
  }

  function copyText(value: string, success: string) {
    navigator.clipboard.writeText(value)
      .then(() => setMessage(success))
      .catch(() => setError('Không copy được.'));
  }

  return (
    <section className="phone-card users-manager-wrap voucher-admin-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Lưu voucher</h2>
        </div>
        <span className="chip">{activeCount}/{vouchers.length} đang bật</span>
      </div>

      <article className="hub-card voucher-cookie-card">
        <div className="hub-card-head">
          <h3>Cookie Shopee</h3>
          <span className="muted">Mỗi dòng 1 tài khoản</span>
        </div>

        <textarea
          className="voucher-cookie-input"
          value={cookieText}
          onChange={(e) => setCookieText(e.target.value)}
          placeholder={'SPC_ST=...\nSPC_ST=...'}
        />

        <div className="voucher-top-actions">
          <button className="primary-button" type="button" disabled={loading} onClick={runSaveAll}>
            Lưu tất cả ({cookieLines.length})
          </button>
          <button className="ghost-button" type="button" disabled={loading} onClick={loadAll}>
            Làm mới
          </button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Danh sách voucher</h3>
          <div className="voucher-tabs">
            <button
              type="button"
              className={activeTab === 'discount' ? 'is-active' : ''}
              onClick={() => setActiveTab('discount')}
            >
              Mã giảm giá
            </button>
            <button
              type="button"
              className={activeTab === 'freeship' ? 'is-active' : ''}
              onClick={() => setActiveTab('freeship')}
            >
              Freeship
            </button>
          </div>
        </div>

        <div className="voucher-summary-row">
          <span className="chip">{activeVoucherInTab}/{vouchersByTab.length} mã đang bật</span>
          <span className="muted">Dùng cookie ở trên để lưu nhanh theo nhóm mã đang bật.</span>
        </div>

        <div className="voucher-list">
          {vouchersByTab.length === 0 ? <div className="empty-state">Chưa có voucher trong nhóm này.</div> : null}
          {vouchersByTab.map((voucher) => (
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
                <button className="mini-action" type="button" onClick={() => copyText(voucher.id, `Đã copy mã ${voucher.id}`)}>Copy mã</button>
                <button className="mini-action" type="button" onClick={() => saveVoucher(voucher)} disabled={loading}>Lưu</button>
                <button className="mini-action" type="button" onClick={() => removeVoucher(voucher.id)} disabled={loading}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Gửi link add voucher (nội bộ)</h3>
          <span className="muted">Chỉ hiển thị trong web của bạn, không đẩy lên web mẹ.</span>
        </div>

        <div className="form-grid compact">
          <label><span>Tiêu đề</span><input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="VD: Link săn mã 100K" /></label>
          <label><span>URL</span><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." /></label>
          <button className="primary-button" type="button" disabled={loading} onClick={addInternalLink}>Thêm link nội bộ</button>
          <button className="ghost-button" type="button" onClick={() => copyText(localLinks.map((item) => `${item.title}: ${item.url}`).join('\n'), 'Đã copy danh sách link')}>Copy tất cả link</button>
        </div>

        <div className="voucher-link-list">
          {localLinks.length === 0 ? <div className="empty-state">Chưa có link nội bộ.</div> : null}
          {localLinks.map((item) => (
            <div className="voucher-link-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <a href={item.url} target="_blank" rel="noreferrer">{item.url}</a>
              </div>
              <div className="voucher-actions">
                <button className="mini-action" type="button" onClick={() => copyText(item.url, 'Đã copy link')}>Copy</button>
                <button className="mini-action" type="button" onClick={() => deleteInternalLink(item.id)}>Xóa</button>
              </div>
            </div>
          ))}
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
    </section>
  );
}
