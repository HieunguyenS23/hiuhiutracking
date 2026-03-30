import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/session';
import { createUser, findUser } from '@/lib/store';

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  if (username.length < 4) return NextResponse.json({ error: 'Username phải từ 4 ký tự.' }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: 'Mật khẩu phải từ 4 ký tự.' }, { status: 400 });
  if (await findUser(username)) return NextResponse.json({ error: 'Username đã tồn tại.' }, { status: 409 });

  try {
    const user = await createUser({ username, passwordHash: hashPassword(password), role: 'customer', createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, message: 'Đăng ký thành công. Vui lòng đăng nhập.', user: { username: user.username, role: user.role } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đăng ký tài khoản.' }, { status: 500 });
  }
}
