'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { imageFileToDataUrl } from '@/lib/client-image';
import { showToast } from '@/lib/client-toast';

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

type Props = {
  isAdmin: boolean;
};

export function ProfileCenter({ isAdmin }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!silent) showToast('Đã tải hồ sơ.', 'info');
    } catch (loadError) {
      showToast(loadError instanceof Error ? loadError.message : 'Không tải được hồ sơ.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile(true);
  }, []);

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file ảnh hợp lệ.', 'error');
      return;
    }

    try {
      const dataUrl = await imageFileToDataUrl(file, 1600, 0.84);
      setProfile({ ...profile, avatarImage: dataUrl });
      showToast('Đã chọn ảnh đại diện. Nhấn Lưu hồ sơ để cập nhật.', 'info');
    } catch {
      showToast('Không xử lí được ảnh đại diện.', 'error');
    }
  }

  async function saveProfile() {
    if (!profile) return;
    setLoading(true);
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
      showToast('Đã cập nhật hồ sơ.', 'success');
    } catch (saveError) {
      showToast(saveError instanceof Error ? saveError.message : 'Không cập nhật được hồ sơ.', 'error');
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

      <div className={`profile-page-grid ${isAdmin ? 'profile-page-grid-single' : ''}`}>
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
      </div>
    </section>
  );
}
