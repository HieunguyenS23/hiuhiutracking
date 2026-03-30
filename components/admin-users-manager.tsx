'use client';

import { useEffect, useMemo, useState } from 'react';

type UserRow = {
  username: string;
  role: 'admin' | 'customer';
  createdAt: string;
};

type Props = {
  initialUsers: UserRow[];
};

export function AdminUsersManager({ initialUsers }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'customer'>('customer');

  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => {
      setMessage('');
      setError('');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [message, error]);

  async function refreshUsers() {
    const response = await fetch('/api/admin/users', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không tải được danh sách tài khoản.');
    setUsers(Array.isArray(data.users) ? data.users : []);
  }

  async function addUser() {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tạo được tài khoản.');
      setMessage('Đã tạo tài khoản thành công.');
      setNewUsername('');
      setNewPassword('');
      setNewRole('customer');
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(username: string, payload: { role?: 'admin' | 'customer'; password?: string }) {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ...payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không cập nhật được tài khoản.');
      setMessage('Đã cập nhật tài khoản thành công.');
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không cập nhật được tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(username: string) {
    if (!confirm(`Xóa tài khoản @${username}?`)) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/users?username=${encodeURIComponent(username)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được tài khoản.');
      setMessage('Đã xóa tài khoản thành công.');
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được tài khoản.');
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(() => users.length, [users.length]);

  return (
    <section className="phone-card">
      <div className="section-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h2>Quản lí tài khoản</h2>
        </div>
        <span className="chip">{total} tài khoản</span>
      </div>

      {message ? <div className="inline-success">{message}</div> : null}
      {error ? <div className="inline-error">{error}</div> : null}

      <div className="form-grid compact">
        <label><span>Username mới</span><input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" /></label>
        <label><span>Mật khẩu</span><input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="từ 4 ký tự" /></label>
        <label>
          <span>Role</span>
          <select value={newRole} onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'customer')}>
            <option value="customer">customer</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <div className="submit-bar"><button className="primary-button" disabled={loading} onClick={addUser} type="button">Thêm tài khoản</button></div>
      </div>

      <div className="sheet-wrap" style={{ marginTop: 14 }}>
        <table className="sheet-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Mật khẩu mới</th>
              <th>Tạo lúc</th>
              <th>Tác vụ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserRowItem key={user.username} user={user} onUpdate={updateUser} onDelete={removeUser} loading={loading} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRowItem({
  user,
  onUpdate,
  onDelete,
  loading,
}: {
  user: UserRow;
  loading: boolean;
  onUpdate: (username: string, payload: { role?: 'admin' | 'customer'; password?: string }) => Promise<void>;
  onDelete: (username: string) => Promise<void>;
}) {
  const [role, setRole] = useState<'admin' | 'customer'>(user.role);
  const [password, setPassword] = useState('');

  return (
    <tr>
      <td>@{user.username}</td>
      <td>
        <select value={role} onChange={(e) => setRole(e.target.value === 'admin' ? 'admin' : 'customer')}>
          <option value="customer">customer</option>
          <option value="admin">admin</option>
        </select>
      </td>
      <td>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="để trống nếu giữ nguyên" />
      </td>
      <td>{new Date(user.createdAt).toLocaleString('vi-VN')}</td>
      <td>
        <div className="icon-actions">
          <button className="mini-action" disabled={loading} onClick={() => onUpdate(user.username, { role, ...(password ? { password } : {}) })} type="button">Lưu</button>
          <button className="mini-action" disabled={loading || user.role === 'admin'} onClick={() => onDelete(user.username)} type="button">Xóa</button>
        </div>
      </td>
    </tr>
  );
}
