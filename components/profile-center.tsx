'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type Profile = {
  username: string;
  displayName: string;
  phone: string;
  email: string;
  zaloNumber: string;
  bankAccount: string;
  bankName: string;
  bio: string;
  avatarImage: string;
  updatedAt: string;
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

export function ProfileCenter({ isAdmin, username }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const initials = useMemo(() => {
    if (!profile?.username) return 'U';
    return (profile.username[0] || 'U').toUpperCase();
  }, [profile?.username]);

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

  async function loadMessages(silent = false) {
    if (isAdmin) return;
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/messages?markRead=1', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được tin nhắn.');
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được tin nhắn.');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        await Promise.all([loadProfile(true), loadMessages(true)]);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    const timer = window.setInterval(() => {
      loadMessages(true);
    }, MESSAGE_POLL_MS);

    return () => window.clearInterval(timer);
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
      setError('Vui lòng chọn file ảnh hợp lệ.');
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
          phone: profile.phone,
          email: profile.email,
          zaloNumber: profile.zaloNumber,
          bankAccount: profile.bankAccount,
          bankName: profile.bankName,
          bio: profile.bio,
          avatarImage: profile.avatarImage,
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

  async function sendMessage() {
    if (isAdmin || !chatInput.trim()) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput.trim() }),
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
          <p className="eyebrow">Hồ sơ</p>
          <h2>Thông tin tài khoản</h2>
        </div>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="profile-page-grid">
        <article className="hub-card hub-profile">
          <div className="hub-card-head">
            <h3>Hồ sơ cá nhân</h3>
          </div>
          {profile ? (
            <>
              <div className="profile-editor-head">
                <div className="profile-avatar profile-avatar-lg">
                  {profile.avatarImage ? <img src={profile.avatarImage} alt="avatar" className="profile-avatar-image" /> : initials}
                </div>
                <div className="profile-meta">
                  <p className="eyebrow">Tài khoản</p>
                  <strong>@{profile.username}</strong>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  <span>Tên đăng ký</span>
                  <input value={profile.username} disabled className="readonly-input" />
                </label>
                <label>
                  <span>Số điện thoại</span>
                  <input value={profile.phone} placeholder="09xxxxxxxx" onChange={(event) => setProfile({ ...profile, phone: event.target.value.replace(/\D/g, '').slice(0, 10) })} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={profile.email} placeholder="email@domain.com" onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                </label>
                <label>
                  <span>Số Zalo</span>
                  <input value={profile.zaloNumber} placeholder="09xxxxxxxx" onChange={(event) => setProfile({ ...profile, zaloNumber: event.target.value.replace(/\D/g, '').slice(0, 15) })} />
                </label>
                <label>
                  <span>Số tài khoản</span>
                  <input value={profile.bankAccount} placeholder="VD: 123456789" onChange={(event) => setProfile({ ...profile, bankAccount: event.target.value })} />
                </label>
                <label>
                  <span>Tên ngân hàng</span>
                  <input value={profile.bankName} placeholder="VD: Vietcombank" onChange={(event) => setProfile({ ...profile, bankName: event.target.value })} />
                </label>
                <label className="full-span">
                  <span>Giới thiệu ngắn</span>
                  <input value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} placeholder="Mô tả ngắn về bạn" />
                </label>
                <label className="full-span">
                  <span>Ảnh đại diện</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              </div>

              <button className="primary-button" disabled={loading} onClick={saveProfile} type="button">Lưu hồ sơ</button>
            </>
          ) : (
            <div className="empty-state">{loading ? 'Đang tải hồ sơ...' : 'Chưa có dữ liệu hồ sơ.'}</div>
          )}
        </article>

        {!isAdmin ? (
          <article className="hub-card hub-chat">
            <div className="hub-card-head">
              <h3>Chat với Admin</h3>
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
              <button className="primary-button" type="button" disabled={loading || !chatInput.trim()} onClick={sendMessage}>Gửi</button>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
