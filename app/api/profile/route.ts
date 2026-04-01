import { NextResponse } from 'next/server';
import { createSessionToken, hashPassword, requireSession, setSessionCookie } from '@/lib/session';
import { findUser, getUserProfile, renameUsername, updateUserProfile, updateUserRecord } from '@/lib/store';
import { isValidUsername, isValidVietnamPhone } from '@/lib/validators';

export async function GET() {
  const session = await requireSession();

  try {
    const user = await findUser(session.username);
    if (!user) return NextResponse.json({ error: 'Khong tim thay tai khoan.' }, { status: 404 });
    const profile = await getUserProfile(session.username);
    return NextResponse.json({ profile, user: { username: user.username, role: user.role } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tai duoc ho so.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  const nextUsername = body.username === undefined ? undefined : String(body.username || '').trim().toLowerCase();
  const nextPassword = body.password === undefined ? undefined : String(body.password || '').trim();
  const displayName = body.displayName === undefined ? undefined : String(body.displayName || '').trim();
  const phone = body.phone === undefined ? undefined : String(body.phone || '').trim();
  const address = body.address === undefined ? undefined : String(body.address || '').trim();
  const bio = body.bio === undefined ? undefined : String(body.bio || '').trim();
  const avatarImage = body.avatarImage === undefined ? undefined : String(body.avatarImage || '').trim();

  if (nextUsername !== undefined && !isValidUsername(nextUsername)) {
    return NextResponse.json({ error: 'Username phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.' }, { status: 400 });
  }
  if (nextPassword !== undefined && nextPassword.length > 0 && nextPassword.length < 6) {
    return NextResponse.json({ error: 'Mat khau phai tu 6 ky tu.' }, { status: 400 });
  }

  if (displayName !== undefined && displayName.length > 60) {
    return NextResponse.json({ error: 'Ten hien thi toi da 60 ky tu.' }, { status: 400 });
  }
  if (phone !== undefined && phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json({ error: 'So dien thoai phai dung 10 chu so hoac de trong.' }, { status: 400 });
  }
  if (bio !== undefined && bio.length > 300) {
    return NextResponse.json({ error: 'Gioi thieu toi da 300 ky tu.' }, { status: 400 });
  }
  if (avatarImage !== undefined && avatarImage.length > 1_500_000) {
    return NextResponse.json({ error: 'Anh dai dien qua lon. Vui long chon anh nho hon 1MB.' }, { status: 400 });
  }

  try {
    let activeUsername = session.username;
    if (nextUsername && nextUsername !== session.username) {
      await renameUsername(session.username, nextUsername);
      activeUsername = nextUsername;
    }

    if (nextPassword && nextPassword.length >= 6) {
      await updateUserRecord(activeUsername, { passwordHash: hashPassword(nextPassword) });
    }

    const profile = await updateUserProfile(activeUsername, { displayName, phone, address, bio, avatarImage });

    if (activeUsername !== session.username) {
      await setSessionCookie(createSessionToken(activeUsername, session.role));
    }

    return NextResponse.json({ ok: true, profile, username: activeUsername });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong cap nhat duoc ho so.' }, { status: 500 });
  }
}
