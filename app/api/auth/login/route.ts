import { NextResponse } from 'next/server';
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/session';
import { findUser } from '@/lib/store';

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const user = await findUser(username);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return NextResponse.json({ error: 'Sai username hoặc mật khẩu.' }, { status: 401 });
  }
  await setSessionCookie(createSessionToken(user.username, user.role));
  return NextResponse.json({ ok: true, user: { username: user.username, role: user.role } });
}
