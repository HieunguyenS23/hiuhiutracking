import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/session';
import { createUser, findUser } from '@/lib/store';
import { isValidUsername } from '@/lib/validators';

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: 'Username phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.' }, { status: 400 });
  }
  if (password.length < 6) return NextResponse.json({ error: 'Mat khau phai tu 6 ky tu.' }, { status: 400 });
  if (await findUser(username)) return NextResponse.json({ error: 'Username da ton tai.' }, { status: 409 });

  try {
    const user = await createUser({ username, passwordHash: hashPassword(password), role: 'customer', createdAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, message: 'Dang ky thanh cong. Vui long dang nhap.', user: { username: user.username, role: user.role } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong the dang ky tai khoan.' }, { status: 500 });
  }
}
