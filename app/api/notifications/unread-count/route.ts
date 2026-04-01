import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUnreadAnnouncementsCount, getUnreadMessageCount } from '@/lib/store';

export async function GET() {
  const session = await requireSession();
  try {
    const [unreadMessages, unreadAnnouncements] = await Promise.all([
      getUnreadMessageCount(session.username),
      getUnreadAnnouncementsCount(session.username),
    ]);

    return NextResponse.json({
      unreadMessages,
      unreadAnnouncements,
      total: unreadMessages + unreadAnnouncements,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được thông báo chưa đọc.' }, { status: 500 });
  }
}
