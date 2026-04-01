'use client';

import { useEffect, useState } from 'react';

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
};

const POLL_MS = 15000;

export function AnnouncementsCenter({ isAdmin }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadAnnouncements(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/announcements?markSeen=1', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được thông báo.');
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được thông báo.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadAnnouncements(true);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  async function postAnnouncement() {
    if (!isAdmin) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không đăng được thông báo.');

      setNewTitle('');
      setNewContent('');
      setMessage('Đã đăng thông báo mới.');
      await loadAnnouncements(true);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Không đăng được thông báo.');
    } finally {
      setLoading(false);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!isAdmin) return;
    if (!confirm('Xóa thông báo này?')) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được thông báo.');
      setMessage('Đã xóa thông báo.');
      await loadAnnouncements(true);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không xóa được thông báo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card hub-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Thông báo</p>
          <h2>Thông báo từ Admin</h2>
        </div>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <article className="hub-card hub-announcements">
        {isAdmin ? (
          <div className="form-grid">
            <label>
              <span>Tiêu đề</span>
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            </label>
            <label className="full-span">
              <span>Nội dung</span>
              <input value={newContent} onChange={(event) => setNewContent(event.target.value)} />
            </label>
            <button className="primary-button" disabled={loading} onClick={postAnnouncement} type="button">Đăng thông báo</button>
          </div>
        ) : null}

        <div className="announcement-list">
          {announcements.length === 0 ? <div className="empty-state">Chưa có thông báo nào.</div> : null}
          {announcements.map((item) => (
            <article key={item.id} className="announcement-item">
              <strong>{item.title}</strong>
              <p>{item.content}</p>
              <div className="announcement-foot">
                <span className="muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.createdBy}</span>
                {isAdmin ? <button className="mini-action" type="button" onClick={() => removeAnnouncement(item.id)}>Xóa</button> : null}
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
