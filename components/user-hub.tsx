'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type Profile = {
  username: string;
  displayName: string;
  phone: string;
  address: string;
  bio: string;
  avatarColor: string;
  avatarImage: string;
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
};

const MESSAGE_POLL_MS = 4000;
const ANNOUNCEMENT_POLL_MS = 15000;

export function UserHub({ isAdmin, username }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const chatListRef = useRef<HTMLDivElement | null>(null);

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
      if (!response.ok) throw new Error(data.error || 'Khong tai duoc ho so.');
      setProfile(data.profile || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Khong tai duoc ho so.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadAnnouncements(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/announcements?markSeen=1', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong tai duoc thong bao.');
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Khong tai duoc thong bao.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadMessages(silent = false) {
    if (isAdmin) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/messages?markRead=1', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong tai duoc tin nhan.');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Khong tai duoc tin nhan.');
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
  }, []);

  useEffect(() => {
    if (isAdmin) return;
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
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isAdmin]);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui long chon file anh hop le.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setProfile({ ...profile, avatarImage: dataUrl });
    };
    reader.readAsDataURL(file);
  }

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
          username: profile.username,
          password: nextPassword,
          displayName: profile.displayName,
          phone: profile.phone,
          address: profile.address,
          bio: profile.bio,
          avatarImage: profile.avatarImage,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong cap nhat duoc ho so.');
      setProfile(data.profile || profile);
      setNextPassword('');
      setMessage('Da cap nhat ho so. Neu doi username, hay dung username moi o lan dang nhap sau.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Khong cap nhat duoc ho so.');
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
      if (!response.ok) throw new Error(data.error || 'Khong dang duoc thong bao.');
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      setMessage('Da dang thong bao moi.');
      await loadAnnouncements(true);
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : 'Khong dang duoc thong bao.');
    } finally {
      setLoading(false);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!confirm('Xoa thong bao nay?')) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong xoa duoc thong bao.');
      setMessage('Da xoa thong bao.');
      await loadAnnouncements(true);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Khong xoa duoc thong bao.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (isAdmin) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong gui duoc tin nhan.');
      setChatInput('');
      setMessage('Da gui tin nhan.');
      await loadMessages(true);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Khong gui duoc tin nhan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card hub-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Trung tam</p>
          <h2>Ho so va thong bao</h2>
        </div>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="hub-grid">
        <article className="hub-card hub-profile">
          <div className="hub-card-head">
            <h3>Ho so ca nhan</h3>
          </div>
          {profile ? (
            <>
              <div className="profile-editor-head">
                <div className="profile-avatar profile-avatar-lg">
                  {profile.avatarImage ? <img src={profile.avatarImage} alt="avatar" className="profile-avatar-image" /> : initials}
                </div>
                <div className="profile-meta">
                  <p className="eyebrow">Tai khoan</p>
                  <strong>@{profile.username}</strong>
                </div>
              </div>
              <div className="form-grid">
                <label><span>Ten dang ki</span><input value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value.toLowerCase() })} /></label>
                <label><span>Mat khau moi</span><input type="password" value={nextPassword} placeholder="Toi thieu 6 ky tu" onChange={(event) => setNextPassword(event.target.value)} /></label>
                <label><span>Ten hien thi</span><input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} /></label>
                <label><span>So dien thoai</span><input value={profile.phone} placeholder="09xxxxxxxx" onChange={(event) => setProfile({ ...profile, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} /></label>
                <label className="full-span"><span>Dia chi</span><input value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
                <label className="full-span"><span>Gioi thieu ngan</span><input value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} /></label>
                <label className="full-span"><span>Anh dai dien</span><input type="file" accept="image/*" onChange={handleAvatarUpload} /></label>
              </div>
              <button className="primary-button" disabled={loading} onClick={saveProfile} type="button">Luu ho so</button>
            </>
          ) : (
            <div className="empty-state">{loading ? 'Dang tai ho so...' : 'Chua co du lieu ho so.'}</div>
          )}
        </article>

        <article className="hub-card hub-announcements">
          <div className="hub-card-head">
            <h3>Thong bao tu admin</h3>
          </div>
          {isAdmin ? (
            <div className="form-grid">
              <label><span>Tieu de</span><input value={newAnnouncementTitle} onChange={(event) => setNewAnnouncementTitle(event.target.value)} /></label>
              <label className="full-span"><span>Noi dung</span><input value={newAnnouncementContent} onChange={(event) => setNewAnnouncementContent(event.target.value)} /></label>
              <button className="primary-button" disabled={loading} onClick={postAnnouncement} type="button">Dang thong bao</button>
            </div>
          ) : null}
          <div className="announcement-list">
            {announcements.length === 0 ? <div className="empty-state">Chua co thong bao nao.</div> : null}
            {announcements.map((item) => (
              <article key={item.id} className="announcement-item">
                <strong>{item.title}</strong>
                <p>{item.content}</p>
                <div className="announcement-foot">
                  <span className="muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.createdBy}</span>
                  {isAdmin ? <button className="mini-action" type="button" onClick={() => removeAnnouncement(item.id)}>Xoa</button> : null}
                </div>
              </article>
            ))}
          </div>
        </article>

        {!isAdmin ? (
          <article className="hub-card hub-chat">
            <div className="hub-card-head">
              <h3>Chat voi Admin</h3>
            </div>
            <div className="chat-list" ref={chatListRef}>
              {messages.length === 0 ? <div className="empty-state">Chua co cuoc tro chuyen nao.</div> : null}
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
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Nhap tin nhan..." />
              <button className="primary-button" type="button" disabled={loading || !chatInput.trim()} onClick={sendMessage}>Gui</button>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
