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
  const [configJsonInput, setConfigJsonInput] = useState('');

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
      if (!response.ok) throw new Error(data.error || 'Khong tai duoc link noi bo.');
      setInternalLinks(Array.isArray(data.links) ? data.links : []);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Khong tai duoc link noi bo.', 'error');
    }
  }

  function toggleSelect(code: string) {
    setSelectedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  }

  function applyConfigFromJsonInput() {
    const input = cleanText(configJsonInput);
    if (!input) {
      showToast('Ban chua dan JSON config.', 'error');
      return;
    }

    try {
      const parsed = JSON.parse(input) as Record<string, unknown>;
      const nextToken = cleanText(parsed.token || parsed.bearer || parsed.bearerToken || parsed.authorization);
      const nextListEndpoint = cleanText(parsed.listEndpoint || parsed.voucherListEndpoint || parsed.list_url) || '/api/shopee/voucher/list';
      const nextSaveEndpoint = cleanText(parsed.saveEndpoint || parsed.voucherSaveEndpoint || parsed.save_url) || '/api/shopee/voucher/save';

      const listMethodRaw = cleanText(parsed.listMethod || parsed.voucherListMethod || parsed.list_method).toUpperCase();
      const saveMethodRaw = cleanText(parsed.saveMethod || parsed.voucherSaveMethod || parsed.save_method).toUpperCase();

      const listMethod: 'GET' | 'POST' = listMethodRaw === 'GET' ? 'GET' : 'POST';
      const saveMethod: 'POST' | 'PUT' = saveMethodRaw === 'PUT' ? 'PUT' : 'POST';

      if (!nextToken) {
        showToast('JSON thieu token/bearer.', 'error');
        return;
      }

      setConfig({ token: nextToken, listEndpoint: nextListEndpoint, saveEndpoint: nextSaveEndpoint, listMethod, saveMethod });
      showToast('Da tu dong dan config tu JSON.', 'success');
    } catch {
      showToast('JSON config khong hop le.', 'error');
    }
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
      if (!response.ok) throw new Error(data.error || 'Khong tai duoc danh sach voucher tu Autopee.');

      const vouchers = normalizeVouchers(data.data);
      setCatalog(vouchers);

      if (vouchers.length === 0) {
        showToast('Khong doc duoc du lieu voucher. Hay chinh endpoint/method theo API Autopee hien tai.', 'error');
      } else {
        showToast(`Da tai ${vouchers.length} voucher tu Autopee.`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Loi tai danh sach voucher.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveSelectedVouchers() {
    const selected = catalog.filter((item) => selectedCodes[item.code]);
    if (selected.length === 0) {
      showToast('Ban chua chon voucher can luu.', 'error');
      return;
    }
    if (cookieLines.length === 0) {
      showToast('Ban chua nhap cookie SPC_ST.', 'error');
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

      if (failCount === 0) showToast(`Da gui ${okCount} yeu cau luu voucher.`, 'success');
      else showToast(`Hoan tat: ${okCount} thanh cong, ${failCount} loi.`, 'error');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Co loi khi luu voucher.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function addInternalLink() {
    const title = cleanText(linkTitle);
    const url = cleanText(linkUrl);

    if (!title || !url) {
      showToast('Vui long nhap tieu de va link.', 'error');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      showToast('Link phai bat dau bang http:// hoac https://', 'error');
      return;
    }

    try {
      const response = await fetch('/api/save-voucher/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong them duoc link noi bo.');

      setLinkTitle('');
      setLinkUrl('');
      await loadInternalLinks();
      showToast('Da them link noi bo. Chi web cua ban thay link nay.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Khong them duoc link noi bo.', 'error');
    }
  }

  async function deleteInternalLink(id: string) {
    try {
      const response = await fetch(`/api/save-voucher/internal-links?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong xoa duoc link.');
      await loadInternalLinks();
      showToast('Da xoa link noi bo.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Khong xoa duoc link.', 'error');
    }
  }

  return (
    <section className="phone-card users-manager-wrap voucher-save-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>LUU VOUCHER</h2>
        </div>
        <span className="chip">{catalog.length} voucher</span>
      </div>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Cau hinh API Autopee</h3>
          <span className="muted">Trang doc lap, goi Autopee qua server proxy.</span>
        </div>
        <div className="form-grid compact">
          <label className="full-span"><span>JSON config (dan 1 lan)</span><textarea className="voucher-config-json-input" value={configJsonInput} onChange={(e) => setConfigJsonInput(e.target.value)} placeholder='{"token":"...","listEndpoint":"/api/shopee/voucher/list","saveEndpoint":"/api/shopee/voucher/save","listMethod":"POST","saveMethod":"POST"}' /></label>
          <div className="voucher-config-actions full-span">
            <button type="button" className="mini-action" onClick={applyConfigFromJsonInput} disabled={loading}>Tu dong dan config</button>
            <button type="button" className="ghost-button" onClick={() => setConfigJsonInput('')} disabled={loading}>Xoa JSON</button>
          </div>
          <label><span>Bearer token</span><input value={config.token} onChange={(e) => setConfig((prev) => ({ ...prev, token: e.target.value }))} placeholder="eyJhbGci..." /></label>
          <label><span>Endpoint lay voucher</span><input value={config.listEndpoint} onChange={(e) => setConfig((prev) => ({ ...prev, listEndpoint: e.target.value }))} placeholder="/api/shopee/voucher/list" /></label>
          <label>
            <span>Method lay voucher</span>
            <select value={config.listMethod} onChange={(e) => setConfig((prev) => ({ ...prev, listMethod: (e.target.value === 'GET' ? 'GET' : 'POST') }))}>
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </label>
          <label><span>Endpoint luu voucher</span><input value={config.saveEndpoint} onChange={(e) => setConfig((prev) => ({ ...prev, saveEndpoint: e.target.value }))} placeholder="/api/shopee/voucher/save" /></label>
          <label>
            <span>Method luu voucher</span>
            <select value={config.saveMethod} onChange={(e) => setConfig((prev) => ({ ...prev, saveMethod: (e.target.value === 'PUT' ? 'PUT' : 'POST') }))}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </label>
          <button type="button" className="mini-action" onClick={fetchCatalog} disabled={loading}>Tai danh sach voucher</button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Cookie Shopee</h3>
          <span className="muted">Moi dong 1 cookie SPC_ST</span>
        </div>
        <textarea className="voucher-cookie-input" value={cookieText} onChange={(e) => setCookieText(e.target.value)} placeholder={'SPC_ST=...\nSPC_ST=...'} />
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Danh muc voucher</h3>
          <div className="voucher-tabs">
            <button type="button" className={activeTab === 'discount' ? 'is-active' : ''} onClick={() => setActiveTab('discount')}>Ma giam gia</button>
            <button type="button" className={activeTab === 'freeship' ? 'is-active' : ''} onClick={() => setActiveTab('freeship')}>Freeship</button>
          </div>
        </div>

        <div className="voucher-list">
          {catalogByTab.length === 0 ? <div className="empty-state">Chua co du lieu voucher. Bam "Tai danh sach voucher" truoc.</div> : null}
          {catalogByTab.map((item) => (
            <label key={`${item.code}-${item.id}`} className="voucher-item voucher-checkbox-item">
              <input type="checkbox" checked={Boolean(selectedCodes[item.code])} onChange={() => toggleSelect(item.code)} />
              <div>
                <strong>{item.code}</strong>
                <p>{item.title}</p>
                <small>{item.expiresAt || 'Khong co han dung'}</small>
              </div>
            </label>
          ))}
        </div>

        <div className="voucher-top-actions">
          <button className="primary-button" type="button" disabled={loading} onClick={saveSelectedVouchers}>Luu voucher da chon</button>
          <button className="ghost-button" type="button" disabled={loading} onClick={() => setSelectedCodes({})}>Bo chon</button>
        </div>
      </article>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Gui link voucher noi bo</h3>
          <span className="muted">Chi luu trong web con, web me khong co.</span>
        </div>

        <div className="form-grid compact">
          <label><span>Tieu de</span><input value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="VD: Link san 100K" /></label>
          <label><span>URL</span><input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." /></label>
          <button className="primary-button" type="button" disabled={loading} onClick={addInternalLink}>Them link noi bo</button>
        </div>

        <div className="voucher-link-list">
          {internalLinks.length === 0 ? <div className="empty-state">Chua co link noi bo.</div> : null}
          {internalLinks.map((link) => (
            <div key={link.id} className="voucher-link-item">
              <div>
                <strong>{link.title}</strong>
                <a href={link.url} target="_blank" rel="noreferrer">{link.url}</a>
              </div>
              <button type="button" className="mini-action" onClick={() => deleteInternalLink(link.id)}>Xoa</button>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
