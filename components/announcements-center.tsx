'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { imageFileToDataUrl } from '@/lib/client-image';
import { showToast } from '@/lib/client-toast';

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
  imageData: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  username: string;
};

const ANNOUNCEMENT_POLL_MS = 15000;
const MESSAGE_POLL_MS = 4000;

export function AnnouncementsCenter({ isAdmin, username }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);

  async function loadAnnouncements(silent = false) {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/announcements?markSeen=1', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không tải được thông báo.');
      setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
    } catch (loadError) {
      showToast(loadError instanceof Error ? loadError.message : 'Không tải được thông báo.', 'error');
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
      showToast(loadError instanceof Error ? loadError.message : 'Không tải được tin nhắn.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      try {
        await Promise.all([loadAnnouncements(true), loadMessages(true)]);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadAnnouncements(true);
    }, ANNOUNCEMENT_POLL_MS);
    return () => window.clearInterval(timer);
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

  async function postAnnouncement() {
    if (!isAdmin) return;
    setLoading(true);

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
      showToast('Đã đăng thông báo mới.', 'success');
      await loadAnnouncements(true);
    } catch (postError) {
      showToast(postError instanceof Error ? postError.message : 'Không đăng được thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function removeAnnouncement(id: string) {
    if (!isAdmin) return;
    if (!confirm('Xóa thông báo này?')) {
      showToast('Đã hủy thao tác xóa thông báo.', 'info');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/announcements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không xóa được thông báo.');
      showToast('Đã xóa thông báo.', 'success');
      await loadAnnouncements(true);
    } catch (deleteError) {
      showToast(deleteError instanceof Error ? deleteError.message : 'Không xóa được thông báo.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function chooseChatImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn ảnh hợp lệ để gửi chat.', 'error');
      return;
    }

    try {
      const dataUrl = await imageFileToDataUrl(file, 1700, 0.85);
      setChatImage(dataUrl);
      showToast('Đã thêm ảnh vào tin nhắn.', 'info');
    } catch {
      showToast('Không xử lí được ảnh chat.', 'error');
    }
  }

  async function sendMessage() {
    if (isAdmin) return;
    if (!chatInput.trim() && !chatImage) {
      showToast('Tin nhắn không được để trống.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chatInput.trim(), imageData: chatImage }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không gửi được tin nhắn.');
      setChatInput('');
      setChatImage('');
      showToast('Đã gửi tin nhắn cho admin.', 'success');
      await loadMessages(true);
    } catch (sendError) {
      showToast(sendError instanceof Error ? sendError.message : 'Không gửi được tin nhắn.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="phone-card hub-wrap">
      <div className="section-head">
        <div>
          <p className="eyebrow">Thông báo</p>
          <h2>Thông báo</h2>
        </div>
      </div>

      {isAdmin ? (
        <article className="hub-card hub-announcements">
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

          <div className="announcement-list">
            {announcements.length === 0 ? <div className="empty-state">Chưa có thông báo nào.</div> : null}
            {announcements.map((item) => (
              <article key={item.id} className="announcement-item">
                <strong>{item.title}</strong>
                <p>{item.content}</p>
                <div className="announcement-foot">
                  <span className="muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.createdBy}</span>
                  <button className="mini-action" type="button" onClick={() => removeAnnouncement(item.id)}>Xóa</button>
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : (
        <div className="announcements-customer-stack">
          <article className="hub-card hub-announcements announcements-notice-card">
            <div className="hub-card-head">
              <h3>Thông báo chung từ Admin</h3>
            </div>
            <div className="announcement-list customer-announcement-list">
              {announcements.length === 0 ? <div className="empty-state">Hiện chưa có thông báo chung nào từ Admin.</div> : null}
              {announcements.map((item) => (
                <article key={item.id} className="announcement-item">
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                  <div className="announcement-foot">
                    <span className="muted">{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.createdBy}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="hub-card announcements-chat-card customer-chat-card">
            <div className="hub-card-head">
              <h3>Chat với Admin</h3>
            </div>
            <div className="chat-list customer-chat-list" ref={chatListRef}>
              {messages.length === 0 ? <div className="empty-state">Chưa có cuộc trò chuyện nào.</div> : null}
              {messages.map((item) => {
                const own = item.from === username;
                return (
                  <div className={`chat-item ${own ? 'chat-own' : 'chat-other'}`} key={item.id}>
                    {item.content ? <p>{item.content}</p> : null}
                    {item.imageData ? <img className="chat-image" src={item.imageData} alt="chat" /> : null}
                    <span>{new Date(item.createdAt).toLocaleString('vi-VN')} · @{item.from}</span>
                  </div>
                );
              })}
            </div>
            {chatImage ? <img className="chat-image-preview" src={chatImage} alt="preview" /> : null}
            <div className="chat-compose">
              <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Nhập tin nhắn..." />
              <label className="mini-action chat-upload-btn" htmlFor="chat-image-input">Ảnh</label>
              <input id="chat-image-input" type="file" accept="image/*" onChange={chooseChatImage} className="chat-file-input" />
              <button className="primary-button" type="button" disabled={loading} onClick={sendMessage}>Gửi</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
