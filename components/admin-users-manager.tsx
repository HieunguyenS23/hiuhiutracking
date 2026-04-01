'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';

type UserRow = {
  username: string;
  role: 'admin' | 'customer';
  createdAt: string;
};

type Profile = {
  username: string;
  displayName: string;
  phone: string;
  address: string;
  bio: string;
  avatarImage: string;
};

type Message = {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt: string;
};

type DetailPayload = {
  user: UserRow;
  profile: Profile;
  messages: Message[];
};

type Props = {
  initialUsers: UserRow[];
};

function isValidUsername(value: string) {
  return /^[a-z0-9_]{5,}$/.test(String(value || '').trim());
}

export function AdminUsersManager({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [selectedUsername, setSelectedUsername] = useState(initialUsers.find((item) => item.role === 'customer')?.username || initialUsers[0]?.username || '');

  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [chatInput, setChatInput] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');

  const total = useMemo(() => users.length, [users.length]);

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    if (!selectedUsername) {
      setDetail(null);
      return;
    }

    let stopped = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/users?username=${encodeURIComponent(selectedUsername)}`, { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Khong tai duoc ho so tai khoan.');
        if (!stopped) setDetail({ user: data.user, profile: data.profile, messages: Array.isArray(data.messages) ? data.messages : [] });

        await fetch('/api/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: selectedUsername }),
        });
      } catch (loadError) {
        if (!stopped) setError(loadError instanceof Error ? loadError.message : 'Khong tai duoc ho so tai khoan.');
      }
    };

    load();
    const timer = window.setInterval(load, 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [selectedUsername]);

  async function refreshUsers(nextSelected?: string) {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Khong tai duoc danh sach tai khoan.');
    const list = Array.isArray(data.users) ? data.users : [];
    setUsers(list);

    const target = nextSelected || selectedUsername;
    if (target && list.some((item: UserRow) => item.username === target)) {
      setSelectedUsername(target);
      return;
    }

    const fallback = list.find((item: UserRow) => item.role === 'customer')?.username || list[0]?.username || '';
    setSelectedUsername(fallback);
  }

  async function addUser() {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      if (!isValidUsername(newUsername)) throw new Error('Username phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.');
      if (newPassword.length < 6) throw new Error('Mat khau phai tu 6 ky tu.');

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong tao duoc tai khoan.');
      setMessage('Da tao tai khoan thanh cong.');
      setNewUsername('');
      setNewPassword('');
      setNewRole('customer');
      await refreshUsers(data?.user?.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong tao duoc tai khoan.');
    } finally {
      setLoading(false);
    }
  }

  async function saveDetail() {
    if (!detail) return;
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (!isValidUsername(detail.user.username)) throw new Error('Username phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.');

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          nextUsername: detail.user.username,
          role: detail.user.role,
          displayName: detail.profile.displayName,
          phone: detail.profile.phone,
          address: detail.profile.address,
          bio: detail.profile.bio,
          avatarImage: detail.profile.avatarImage,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong cap nhat duoc tai khoan.');

      setMessage('Da cap nhat ho so tai khoan.');
      await refreshUsers(data?.user?.username || detail.user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc tai khoan.');
    } finally {
      setLoading(false);
    }
  }

  async function setPasswordForDetail() {
    if (!detail) return;
    const pass = prompt('Nhap mat khau moi (>= 6 ky tu):', '');
    if (pass === null) return;

    setLoading(true);
    setMessage('');
    setError('');
    try {
      if (pass.trim().length < 6) throw new Error('Mat khau phai tu 6 ky tu.');

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: selectedUsername,
          nextUsername: detail.user.username,
          password: pass.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong cap nhat duoc mat khau.');
      setMessage('Da doi mat khau.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong cap nhat duoc mat khau.');
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(username: string) {
    if (!confirm(`Xoa tai khoan @${username}?`)) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong xoa duoc tai khoan.');
      setMessage('Da xoa tai khoan thanh cong.');
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong xoa duoc tai khoan.');
    } finally {
      setLoading(false);
    }
  }

  async function sendMessageToUser() {
    if (!detail || !chatInput.trim()) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: detail.user.username, content: chatInput.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Khong gui duoc tin nhan.');
      setChatInput('');
      setMessage('Da gui tin nhan cho khach hang.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong gui duoc tin nhan.');
    } finally {
      setLoading(false);
    }
  }

  function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !detail) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui long chon file anh hop le.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setDetail({ ...detail, profile: { ...detail.profile, avatarImage: dataUrl } });
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="phone-card users-manager-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Quan li tai khoan</h2>
        </div>
        <span className="chip">{total} tai khoan</span>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="users-manager-grid">
        <aside className="users-sidebar">
          <div className="hub-card">
            <h3>Tao tai khoan moi</h3>
            <div className="form-grid">
              <label><span>Username</span><input value={newUsername} onChange={(e) => setNewUsername(e.target.value.toLowerCase())} placeholder="vd: khach_hang1" /></label>
              <label><span>Mat khau</span><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="toi thieu 6 ky tu" /></label>
              <label>
                <span>Role</span>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'customer')}>
                  <option value="customer">customer</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <button className="primary-button" disabled={loading} onClick={addUser} type="button">Them tai khoan</button>
            </div>
          </div>

          <div className="hub-card">
            <h3>Danh sach tai khoan</h3>
            <div className="account-list">
              {users.map((user) => (
                <button
                  key={user.username}
                  className={`account-item ${selectedUsername === user.username ? 'active' : ''}`}
                  type="button"
                  onClick={() => setSelectedUsername(user.username)}
                >
                  <strong>@{user.username}</strong>
                  <span>{user.role} · {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="users-detail">
          {!detail ? (
            <div className="empty-state">Chon mot tai khoan de xem ho so.</div>
          ) : (
            <>
              <article className="hub-card">
                <div className="hub-card-head">
                  <h3>Ho so tai khoan @{selectedUsername}</h3>
                  <div className="modal-actions">
                    <button className="mini-action" type="button" onClick={setPasswordForDetail} disabled={loading}>Doi mat khau</button>
                    <button className="mini-action" type="button" onClick={() => removeUser(selectedUsername)} disabled={loading || detail.user.role === 'admin'}>Xoa tai khoan</button>
                  </div>
                </div>

                <div className="profile-editor-head">
                  <div className="profile-avatar profile-avatar-lg">
                    {detail.profile.avatarImage ? <img src={detail.profile.avatarImage} alt="avatar" className="profile-avatar-image" /> : (detail.user.username[0] || 'U').toUpperCase()}
                  </div>
                  <div className="profile-meta">
                    <p className="eyebrow">Tai khoan dang chon</p>
                    <strong>@{detail.user.username}</strong>
                  </div>
                </div>

                <div className="form-grid compact">
                  <label><span>Ten dang ki</span><input value={detail.user.username} onChange={(e) => setDetail({ ...detail, user: { ...detail.user, username: e.target.value.toLowerCase() } })} /></label>
                  <label>
                    <span>Role</span>
                    <select value={detail.user.role} onChange={(e) => setDetail({ ...detail, user: { ...detail.user, role: e.target.value === 'admin' ? 'admin' : 'customer' } })}>
                      <option value="customer">customer</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label><span>Ten hien thi</span><input value={detail.profile.displayName} onChange={(e) => setDetail({ ...detail, profile: { ...detail.profile, displayName: e.target.value } })} /></label>
                  <label><span>So dien thoai</span><input value={detail.profile.phone} onChange={(e) => setDetail({ ...detail, profile: { ...detail.profile, phone: e.target.value.replace(/\D/g, '').slice(0, 10) } })} /></label>
                  <label className="full-span"><span>Dia chi</span><input value={detail.profile.address} onChange={(e) => setDetail({ ...detail, profile: { ...detail.profile, address: e.target.value } })} /></label>
                  <label className="full-span"><span>Gioi thieu</span><input value={detail.profile.bio} onChange={(e) => setDetail({ ...detail, profile: { ...detail.profile, bio: e.target.value } })} /></label>
                  <label className="full-span"><span>Anh dai dien</span><input type="file" accept="image/*" onChange={uploadAvatar} /></label>
                </div>

                <button className="primary-button" type="button" disabled={loading} onClick={saveDetail}>Luu ho so tai khoan</button>
              </article>

              <article className="hub-card">
                <div className="hub-card-head">
                  <h3>Chat voi @{detail.user.username}</h3>
                </div>
                <div className="chat-list account-chat-list">
                  {detail.messages.length === 0 ? <div className="empty-state">Chua co cuoc tro chuyen nao.</div> : null}
                  {detail.messages.map((item) => {
                    const own = item.from !== detail.user.username;
                    return (
                      <div className={`chat-item ${own ? 'chat-own' : 'chat-other'}`} key={item.id}>
                        <p>{item.content}</p>
                        <span>{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.from}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="chat-compose">
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Nhap tin nhan cho khach hang..." />
                  <button className="primary-button" type="button" disabled={loading || !chatInput.trim()} onClick={sendMessageToUser}>Gui</button>
                </div>
              </article>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
