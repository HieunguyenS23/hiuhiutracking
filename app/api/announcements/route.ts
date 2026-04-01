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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tai duoc thong bao.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') return NextResponse.json({ error: 'Chi admin moi duoc dang thong bao.' }, { status: 403 });

  const body = await request.json();
  const title = String(body.title || '').trim();
  const content = String(body.content || '').trim();
  if (!title || !content) return NextResponse.json({ error: 'Tieu de va noi dung khong duoc de trong.' }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: 'Tieu de toi da 120 ky tu.' }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: 'Noi dung toi da 1000 ky tu.' }, { status: 400 });

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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tao duoc thong bao.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') return NextResponse.json({ error: 'Chi admin moi duoc xoa thong bao.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = String(searchParams.get('id') || '').trim();
  if (!id) return NextResponse.json({ error: 'Thieu id thong bao.' }, { status: 400 });

  try {
    await deleteAnnouncement(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong xoa duoc thong bao.' }, { status: 500 });
  }
}
