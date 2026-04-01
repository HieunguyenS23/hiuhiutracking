import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUnreadMessageCount } from '@/lib/store';

export async function GET() {
  const session = await requireSession();
  try {
    const unread = await getUnreadMessageCount(session.username);
    return NextResponse.json({ unread });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được số tin chưa đọc.' }, { status: 500 });
  }
}
