'use client';

import { useMemo, useState } from 'react';
import { showToast } from '@/lib/client-toast';

type ReadMailResponse = {
  links: string[];
  payload: unknown;
};

const DEFAULT_ENDPOINT = 'https://mail.botmmo.xyz';

export function ReadMailCenter() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReadMailResponse>({ links: [], payload: null });
  const [openedLinks, setOpenedLinks] = useState<string[]>([]);

  const newLinks = useMemo(() => data.links.filter((link) => !openedLinks.includes(link)), [data.links, openedLinks]);

  async function fetchMails() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/read-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, method, apiKey, query }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload.error || 'Không đọc được mail.'));

      const links = Array.isArray(payload.links) ? payload.links : [];
      setData({ links, payload: payload.payload });
      showToast(`Đã đọc mail, phát hiện ${links.length} link.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không đọc được mail.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openAllNewLinks() {
    if (newLinks.length === 0) {
      showToast('Không có link mới để mở.', 'error');
      return;
    }

    for (const link of newLinks) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
    setOpenedLinks((prev) => [...prev, ...newLinks]);
    showToast(`Đã mở ${newLinks.length} link mới.`, 'success');
  }

  function copyAllLinks() {
    if (data.links.length === 0) {
      showToast('Chưa có link để copy.', 'error');
      return;
    }

    navigator.clipboard.writeText(data.links.join('\n'));
    showToast('Đã copy toàn bộ link.', 'success');
  }

  return (
    <section className="phone-card users-manager-wrap read-mail-shell">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Đọc mail</h2>
        </div>
        <span className="chip">{data.links.length} link</span>
      </div>

      <article className="hub-card">
        <div className="hub-card-head">
          <h3>Cấu hình API mail</h3>
          <span className="muted">Lấy nội dung mail và tách link tự động</span>
        </div>

        <div className="form-grid compact">
          <label><span>Endpoint</span><input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder={DEFAULT_ENDPOINT} /></label>
          <label>
            <span>Method</span>
            <select value={method} onChange={(e) => setMethod((e.target.value === 'POST' ? 'POST' : 'GET'))}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </label>
          <label><span>API key (nếu có)</span><input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Bearer / x-api-key" /></label>
          <label><span>Từ khóa/mailbox</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nhập mailbox hoặc keyword" /></label>
        </div>

        <div className="voucher-top-actions">
          <button className="primary-button" type="button" onClick={fetchMails} disabled={loading}>{loading ? 'Đang đọc...' : 'Đọc mail'}</button>
          <button className="ghost-button" type="button" onClick={openAllNewLinks}>Mở tất cả link mới</button>
          <button className="ghost-button" type="button" onClick={copyAllLinks}>Copy links</button>
        </div>
      </article>

      <article className="hub-card read-mail-content">
        <div className="read-mail-left">
          <div className="hub-card-head"><h3>Payload</h3></div>
          <pre className="read-mail-json">{JSON.stringify(data.payload, null, 2)}</pre>
        </div>

        <div className="read-mail-right">
          <div className="hub-card-head"><h3>Links ({data.links.length})</h3></div>
          <div className="read-mail-links">
            {data.links.length === 0 ? <div className="empty-state">Chưa có link.</div> : null}
            {data.links.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer" className={openedLinks.includes(link) ? 'is-opened' : ''}>
                {link}
              </a>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
