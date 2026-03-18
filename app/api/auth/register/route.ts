import { NextResponse } from 'next/server';
import { createSessionToken, hashPassword, setSessionCookie } from '@/lib/session';
import { createUser, findUser } from '@/lib/store';

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  if (username.length < 4) return NextResponse.json({ error: 'Username phải từ 4 ký tự.' }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: 'Mật khẩu phải từ 4 ký tự.' }, { status: 400 });
  if (await findUser(username)) return NextResponse.json({ error: 'Username đã tồn tại.' }, { status: 409 });

  const user = await createUser({ username, passwordHash: hashPassword(password), role: 'customer', createdAt: new Date().toISOString() });
  await setSessionCookie(createSessionToken(user.username, user.role));
  return NextResponse.json({ ok: true, user: { username: user.username, role: user.role } });
}
