'use client';

import { useEffect, useMemo, useState } from 'react';
import { showToast } from '@/lib/client-toast';

type RemoteVoucher = {
  id: string;
  code: string;
  title: string;
  kind: 'discount' | 'freeship';
  expiresAt: string;
  raw: Record<string, unknown>;
};

type InternalLink = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

type ApiConfig = {
  token: string;
  listEndpoint: string;
  saveEndpoint: string;
  listMethod: 'GET' | 'POST';
  saveMethod: 'POST' | 'PUT';
};

const CONFIG_KEY = 'portal_save_voucher_api_config_v1';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function normalizeKind(input: string) {
  const value = input.toLowerCase();
  return value.includes('ship') || value.includes('fsv') || value.includes('free') ? 'freeship' : 'discount';
}

function pickArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const anyPayload = payload as Record<string, unknown>;

  const candidates = [
    anyPayload.vouchers,
    anyPayload.items,
    (anyPayload.data as any)?.vouchers,
    (anyPayload.data as any)?.items,
    (anyPayload.data as any)?.list,
    anyPayload.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function normalizeVouchers(payload: unknown): RemoteVoucher[] {
  const rows = pickArray(payload);
  return rows
    .map((row, index) => {
      const item = (row || {}) as Record<string, unknown>;
      const code = cleanText(item.code || item.voucher_code || item.voucherCode || item.promotion_code || item.promotionCode);
      const id = cleanText(item.id || item.voucher_id || item.voucherId || item.promotion_id || item.promotionId || code || `row-${index}`);
      const title = cleanText(item.title || item.name || item.label || item.voucher_name || item.voucherName || `Voucher ${index + 1}`);
      const expiresAt = cleanText(item.expires_at || item.expire_at || item.expired_at || item.end_time || item.endTime);
      const kind = normalizeKind(cleanText(item.kind || item.type || item.category || title || code));

      return {
        id,
        code: code || id,
        title,
        kind,
        expiresAt,
        raw: item,
      } satisfies RemoteVoucher;
    })
    .filter((item) => item.code && item.title);
}

export function SaveVoucherCenter() {
  const [loading, setLoading] = useState(false);
  const [cookieText, setCookieText] = useState('');
  const [activeTab, setActiveTab] = useState<'discount' | 'freeship'>('discount');
  const [catalog, setCatalog] = useState<RemoteVoucher[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<Record<string, boolean>>({});

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [internalLinks, setInternalLinks] = useState<InternalLink[]>([]);

  const [config, setConfig] = useState<ApiConfig>({
    token: '',
    listEndpoint: '/api/shopee/voucher/list',
    saveEndpoint: '/api/shopee/voucher/save',
    listMethod: 'POST',
    saveMethod: 'POST',
  });

  const cookieLines = useMemo(() => cookieText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), [cookieText]);
  const catalogByTab = useMemo(() => catalog.filter((item) => item.kind === activeTab), [catalog, activeTab]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ApiConfig>;
      setConfig((prev) => ({
        ...prev,
        token: cleanText(parsed.token),
        listEndpoint: cleanText(parsed.listEndpoint) || prev.listEndpoint,
        saveEndpoint: cleanText(parsed.saveEndpoint) || prev.saveEndpoint,
        listMethod: parsed.listMethod === 'GET' ? 'GET' : 'POST',
        saveMethod: parsed.saveMethod === 'PUT' ? 'PUT' : 'POST',
      }));
    } catch {
      // ignore
    }
    loadInternalLinks();
  }, []);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  async function loadInternalLinks() {
    try {
      const response = await fetch('/api/save-voucher/internal-links', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được link nội bộ.');
      setInternalLinks(Array.isArray(data.links) ? data.links : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không tải được link nội bộ.', 'error');
    }
  }

  function toggleSelect(code: string) {
    setSelectedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  async function fetchCatalog() {
    setLoading(true);
    try {
      const response = await fetch('/api/save-voucher/autopee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          endpoint: config.listEndpoint,
          method: config.listMethod,
          token: config.token,
          cookie: cookieLines[0] || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được danh sách voucher từ Autopee.');

      const vouchers = normalizeVouchers(data.data);
      setCatalog(vouchers);

      if (vouchers.length === 0) {
        showToast('Không đọc được dữ liệu voucher. Hãy chỉnh endpoint/method theo API Autopee hiện tại.', 'error');
      } else {
        showToast(`Đã tải ${vouchers.length} voucher từ Autopee.`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Lỗi tải danh sách voucher.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveSelectedVouchers() {
    const selected = catalog.filter((item) => selectedCodes[item.code]);
    if (selected.length === 0) {
      showToast('Bạn chưa chọn voucher cần lưu.', 'error');
      return;
    }
    if (cookieLines.length === 0) {
      showToast('Bạn chưa nhập cookie SPC_ST.', 'error');
      return;
    }

    setLoading(true);
    let okCount = 0;
    let failCount = 0;

    try {
      for (const cookie of cookieLines) {
        for (const voucher of selected) {
          const response = await fetch('/api/save-voucher/autopee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'save',
              endpoint: config.saveEndpoint,
              method: config.saveMethod,
              token: config.token,
              cookie,
              voucher,
            }),
          });

          if (response.ok) okCount += 1;
          else failCount += 1;
        }
      }

      if (failCount === 0) showToast(`Đã gửi ${okCount} yêu cầu lưu voucher.`, 'success');
      else showToast(`Hoàn tất: ${okCount} thành công, ${failCount} lỗi.`, 'error');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Có lỗi khi lưu voucher.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function addInternalLink() {
    const title = cleanText(linkTitle);
    const url = cleanText(linkUrl);

    if (!title || !url) {
      showToast('Vui lòng nhập tiêu đề và link.', 'error');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      showToast('Link phải bắt đầu bằng http:// hoặc https://', 'error');
      return;
    }

    try {
      const response = await fetch('/api/save-voucher/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thêm được link nội bộ.');

      setLinkTitle('');
      setLinkUrl('');
      await loadInternalLinks();
      showToast('Đã thêm link nội bộ. Chỉ web của bạn thấy link này.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thêm được link nội bộ.', 'error');
    }
  }

  async function deleteInternalLink(id: string) {
    try {
      const response = await fetch(`/api/save-voucher/internal-links?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được link.');
      await loadInternalLinks();
      showToast('Đã xóa link nội bộ.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không xóa được link.', 'error');
    }
  }

  return (
    <section className="phone-card users-manager-wrap voucher-save-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>LƯU VOUCHER</h2>
        </div>
        <span className="chip">{catalog.length} voucher</span>
      </div>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Cấu hình API Autopee</h3>
          <span className="muted">Trang độc lập, gọi Autopee qua server proxy.</span>
        </div>
        <div className="form-grid compact">
          <label><span>Bearer token</span><input value={config.token} onChange={(e) => setConfig((prev) => ({ ...prev, token: e.target.value }))} placeholder="eyJhbGci..." /></label>
          <label><span>Endpoint lấy voucher</span><input value={config.listEndpoint} onChange={(e) => setConfig((prev) => ({ ...prev, listEndpoint: e.target.value }))} placeholder="/api/shopee/voucher/list" /></label>
          <label>
            <span>Method lấy voucher</span>
            <select value={config.listMethod} onChange={(e) => setConfig((prev) => ({ ...prev, listMethod: (e.target.value === 'GET' ? 'GET' : 'POST') }))}>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </label>
          <label><span>Endpoint lưu voucher</span><input value={config.saveEndpoint} onChange={(e) => setConfig((prev) => ({ ...prev, saveEndpoint: e.target.value }))} placeholder="/api/shopee/voucher/save" /></label>
          <label>
            <span>Method lưu voucher</span>
            <select value={config.saveMethod} onChange={(e) => setConfig((prev) => ({ ...prev, saveMethod: (e.target.value === 'PUT' ? 'PUT' : 'POST') }))}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
          <button type="button" className="mini-action" onClick={fetchCatalog} disabled={loading}>Tải danh sách voucher</button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Cookie Shopee</h3>
          <span className="muted">Mỗi dòng 1 cookie SPC_ST</span>
        </div>
        <textarea
          className="voucher-cookie-input"
          value={cookieText}
          onChange={(e) => setCookieText(e.target.value)}
          placeholder={'SPC_ST=...\nSPC_ST=...'}
        />
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Danh mục voucher</h3>
          <div className="voucher-tabs">
            <button type="button" className={activeTab === 'discount' ? 'is-active' : ''} onClick={() => setActiveTab('discount')}>Mã giảm giá</button>
            <button type="button" className={activeTab === 'freeship' ? 'is-active' : ''} onClick={() => setActiveTab('freeship')}>Freeship</button>
          </div>
        </div>

        <div className="voucher-list">
          {catalogByTab.length === 0 ? <div className="empty-state">Chưa có dữ liệu voucher. Bấm "Tải danh sách voucher" trước.</div> : null}
          {catalogByTab.map((item) => (
            <label key={`${item.code}-${item.id}`} className="voucher-item voucher-checkbox-item">
              <input type="checkbox" checked={Boolean(selectedCodes[item.code])} onChange={() => toggleSelect(item.code)} />
              <div>
                <strong>{item.code}</strong>
                <p>{item.title}</p>
                <small>{item.expiresAt || 'Không có hạn dùng'}</small>
              </div>
            </label>
          ))}
        </div>

        <div className="voucher-top-actions">
          <button className="primary-button" type="button" disabled={loading} onClick={saveSelectedVouchers}>
            Lưu voucher đã chọn
          </button>
          <button className="ghost-button" type="button" disabled={loading} onClick={() => setSelectedCodes({})}>
            Bỏ chọn
          </button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Gửi link voucher nội bộ</h3>
          <span className="muted">Chỉ lưu trong web con, web mẹ không có.</span>
        </div>

        <div className="form-grid compact">
          <label><span>Tiêu đề</span><input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="VD: Link săn 100K" /></label>
          <label><span>URL</span><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." /></label>
          <button className="primary-button" type="button" disabled={loading} onClick={addInternalLink}>Thêm link nội bộ</button>
        </div>

        <div className="voucher-link-list">
          {internalLinks.length === 0 ? <div className="empty-state">Chưa có link nội bộ.</div> : null}
          {internalLinks.map((link) => (
            <div key={link.id} className="voucher-link-item">
              <div>
                <strong>{link.title}</strong>
                <a href={link.url} target="_blank" rel="noreferrer">{link.url}</a>
              </div>
              <button type="button" className="mini-action" onClick={() => deleteInternalLink(link.id)}>Xóa</button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
