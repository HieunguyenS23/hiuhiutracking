'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Profile = {
  username: string;
  displayName: string;
  phone: string;
  address: string;
  bio: string;
  avatarColor: string;
  updatedAt: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

type Message = {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  username: string;
  userOptions: string[];
};

const MESSAGE_POLL_MS = 4000;
const ANNOUNCEMENT_POLL_MS = 15000;

export function UserHub({ isAdmin, username, userOptions }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedUser, setSelectedUser] = useState(userOptions[0] || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const targetQuery = isAdmin && selectedUser ? `?target=${encodeURIComponent(selectedUser)}` : '';
  const chatTitle = isAdmin ? `Đoạn chat với @${selectedUser || 'khách hàng'}` : 'Đoạn chat với Admin';
  const canSendMessage = isAdmin ? Boolean(selectedUser) : true;

  const initials = useMemo(() => {
    if (!profile?.displayName) return 'U';
    const tokens = profile.displayName.trim().split(/\s+/).filter(Boolean);
    return (tokens[0]?.[0] || profile.displayName[0] || 'U').toUpperCase();
  }, [profile?.displayName]);

  async function loadProfile(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/profile', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được hồ sơ.');
      setProfile(data.profile || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được hồ sơ.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadAnnouncements(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/announcements', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được thông báo.');
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được thông báo.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadMessages(silent = false) {
    if (!silent) setLoading(true);
    try {
      const query = targetQuery ? `${targetQuery}&markRead=1` : '?markRead=1';
      const response = await fetch(`/api/messages${query}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được tin nhắn.');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được tin nhắn.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([loadProfile(true), loadAnnouncements(true), loadMessages(true)]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [selectedUser]);

  useEffect(() => {
    const messageTimer = window.setInterval(() => {
      loadMessages(true);
    }, MESSAGE_POLL_MS);

    const announcementTimer = window.setInterval(() => {
      loadAnnouncements(true);
    }, ANNOUNCEMENT_POLL_MS);

    return () => {
      window.clearInterval(messageTimer);
      window.clearInterval(announcementTimer);
    };
  }, [targetQuery]);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedUser]);

  async function saveProfile() {
    if (!profile) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          phone: profile.phone,
          address: profile.address,
          bio: profile.bio,
          avatarColor: profile.avatarColor,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được hồ sơ.');
      setProfile(data.profile || profile);
      setMessage('Đã cập nhật hồ sơ.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không cập nhật được hồ sơ.');
    } finally {
      setLoading(false);
    }
  }

  async function postAnnouncement() {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newAnnouncementTitle, content: newAnnouncementContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không đăng được thông báo.');
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      setMessage('Đã đăng thông báo mới.');
      await loadAnnouncements(true);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Không đăng được thông báo.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!canSendMessage) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedUser, content: chatInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không gửi được tin nhắn.');
      setChatInput('');
      setMessage('Đã gửi tin nhắn.');
      await loadMessages(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Không gửi được tin nhắn.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card hub-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Trung tâm</p>
          <h2>Hồ sơ, thông báo và chat</h2>
        </div>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="hub-grid">
        <article className="hub-card hub-profile">
          <div className="hub-card-head">
            <h3>Hồ sơ cá nhân</h3>
          </div>
          {profile ? (
            <>
              <div className="profile-editor-head">
                <div className="profile-avatar" style={{ background: profile.avatarColor || '#0e8f7a' }}>{initials}</div>
                <div className="profile-meta">
                  <p className="eyebrow">Tài khoản</p>
                  <strong>@{profile.username}</strong>
                </div>
              </div>
              <div className="form-grid">
                <label><span>Tên hiển thị</span><input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
                <label><span>Số điện thoại</span><input value={profile.phone} placeholder="09xxxxxxxx" onChange={(event) => setProfile({ ...profile, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
                <label className="full-span"><span>Địa chỉ</span><input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
                <label className="full-span"><span>Giới thiệu ngắn</span><input value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
                <label><span>Màu avatar</span><input value={profile.avatarColor} onChange={(event) => setProfile({ ...profile, avatarColor: event.target.value })} /></label>
              </div>
              <button className="primary-button" disabled={loading} onClick={saveProfile} type="button">Lưu hồ sơ</button>
            </>
          ) : (
            <div className="empty-state">{loading ? 'Đang tải hồ sơ...' : 'Chưa có dữ liệu hồ sơ.'}</div>
          )}
        </article>

        <article className="hub-card hub-announcements">
          <div className="hub-card-head">
            <h3>Thông báo từ admin</h3>
          </div>
          {isAdmin ? (
            <div className="form-grid">
              <label><span>Tiêu đề</span><input value={newAnnouncementTitle} onChange={(event) => setNewAnnouncementTitle(event.target.value)} /></label>
              <label className="full-span"><span>Nội dung</span><input value={newAnnouncementContent} onChange={(event) => setNewAnnouncementContent(event.target.value)} /></label>
              <button className="primary-button" disabled={loading} onClick={postAnnouncement} type="button">Đăng thông báo</button>
            </div>
          ) : null}
          <div className="announcement-list">
            {announcements.length === 0 ? <div className="empty-state">Chưa có thông báo nào.</div> : null}
            {announcements.map((item) => (
              <article key={item.id} className="announcement-item">
                <strong>{item.title}</strong>
                <p>{item.content}</p>
                <span className="muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.createdBy}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="hub-card hub-chat">
          <div className="hub-card-head">
            <h3>{chatTitle}</h3>
            {isAdmin ? (
              <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
                {userOptions.length === 0 ? <option value="">Chưa có khách hàng</option> : null}
                {userOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            ) : null}
          </div>
          <div className="chat-list" ref={chatListRef}>
            {messages.length === 0 ? <div className="empty-state">Chưa có cuộc trò chuyện nào.</div> : null}
            {messages.map((item) => {
              const own = item.from === username;
              return (
                <div className={`chat-item ${own ? 'chat-own' : 'chat-other'}`} key={item.id}>
                  <p>{item.content}</p>
                  <span>{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.from}</span>
                </div>
              );
            })}
          </div>
          <div className="chat-compose">
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Nhập tin nhắn..." />
            <button className="primary-button" type="button" disabled={loading || !canSendMessage || !chatInput.trim()} onClick={sendMessage}>Gửi</button>
          </div>
        </article>
      </div>
    </section>
  );
}
