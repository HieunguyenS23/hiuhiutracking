import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { createAnnouncement, deleteAnnouncement, getAnnouncements, markAnnouncementsSeen } from '@/lib/store';

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const markSeen = String(searchParams.get('markSeen') || '0') === '1';

  try {
    if (markSeen) await markAnnouncementsSeen(session.username);
    const announcements = await getAnnouncements();
    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được thông báo.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') return NextResponse.json({ error: 'Chỉ admin mới được đăng thông báo.' }, { status: 403 });

  const body = await request.json();
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) return NextResponse.json({ error: 'Tiêu đề và nội dung không được để trống.' }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: 'Tiêu đề tối đa 120 ký tự.' }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: 'Nội dung tối đa 1000 ký tự.' }, { status: 400 });

  try {
    const announcement = await createAnnouncement({
      id: crypto.randomUUID(),
      title,
      content,
      createdAt: new Date().toISOString(),
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tạo được thông báo.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') return NextResponse.json({ error: 'Chỉ admin mới được xóa thông báo.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get('id') || '').trim();
  if (!id) return NextResponse.json({ error: 'Thiếu id thông báo.' }, { status: 400 });

  try {
    await deleteAnnouncement(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không xóa được thông báo.' }, { status: 500 });
  }
}
