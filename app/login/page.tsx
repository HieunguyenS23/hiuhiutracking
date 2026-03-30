'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    setMessage('');
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.');

      if (mode === 'register') {
        setMessage(data.message || 'Đăng ký thành công. Vui lòng đăng nhập.');
        setMode('login');
        return;
      }

      setMessage('Đăng nhập thành công. Đang chuyển trang...');
      router.replace('/orders/new');
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Đã có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-badge">A</div>
        <div className="auth-heading">
          <p className="eyebrow">Khách hàng</p>
          <h1>Lên đơn Shopee</h1>
          <p>Web mới hoàn toàn, ưu tiên điện thoại, sạch và đủ chỗ để phát triển tiếp những bước sau.</p>
        </div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Đăng nhập</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Đăng ký</button>
        </div>
        <div className="form-grid">
          <label>
            <span>Username duy nhất</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="vd: haclamansd" />
          </label>
          <label>
            <span>Mật khẩu</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" />
          </label>
        </div>
        {message ? <div className="inline-success">{message}</div> : null}
        {error ? <div className="inline-error">{error}</div> : null}
        <button className="primary-button" disabled={loading} onClick={submit} type="button">
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Vào hệ thống' : 'Tạo tài khoản'}
        </button>
        <p className="auth-footnote">Tài khoản admin lấy từ biến môi trường `APP_USERNAME` và `APP_PASSWORD`.</p>
      </section>
    </main>
  );
}
