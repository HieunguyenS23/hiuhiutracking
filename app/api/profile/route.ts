import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getUserProfile, updateUserProfile } from '@/lib/store';
import { isValidVietnamPhone } from '@/lib/validators';

export async function GET() {
  const session = await requireSession();

  try {
    const profile = await getUserProfile(session.username);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được hồ sơ.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const displayName = String(body.displayName ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const address = String(body.address ?? '').trim();
  const bio = String(body.bio ?? '').trim();
  const avatarColor = String(body.avatarColor ?? '').trim();

  if (displayName && displayName.length > 60) {
    return NextResponse.json({ error: 'Tên hiển thị tối đa 60 ký tự.' }, { status: 400 });
  }
  if (phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json({ error: 'Số điện thoại phải đúng 10 chữ số hoặc để trống.' }, { status: 400 });
  }
  if (bio.length > 300) {
    return NextResponse.json({ error: 'Giới thiệu tối đa 300 ký tự.' }, { status: 400 });
  }

  try {
    const profile = await updateUserProfile(session.username, { displayName, phone, address, bio, avatarColor });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.' }, { status: 500 });
  }
}
