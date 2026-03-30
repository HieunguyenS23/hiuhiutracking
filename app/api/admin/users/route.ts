import { NextResponse } from 'next/server';
import { hashPassword, requireAdmin } from '@/lib/session';
import { createUser, deleteUserRecord, findUser, getUsers, updateUserRecord } from '@/lib/store';
import type { UserRole } from '@/lib/types';

function sanitizeUser(user: { username: string; role: UserRole; createdAt: string }) {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function GET() {
  await requireAdmin();
  try {
    const users = await getUsers();
    return NextResponse.json({ users: users.map((u) => sanitizeUser(u)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được danh sách tài khoản.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const roleRaw = String(body.role || 'customer').trim();
  const role = roleRaw === 'admin' ? 'admin' : 'customer';

  if (username.length < 4) return NextResponse.json({ error: 'Username phải từ 4 ký tự.' }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ error: 'Mật khẩu phải từ 4 ký tự.' }, { status: 400 });
  if (await findUser(username)) return NextResponse.json({ error: 'Username đã tồn tại.' }, { status: 409 });

  try {
    const user = await createUser({
      username,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tạo được tài khoản.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = body.password === undefined ? undefined : String(body.password || '').trim();
  const roleRaw = body.role === undefined ? undefined : String(body.role || '').trim();

  if (!username) return NextResponse.json({ error: 'Thiếu username.' }, { status: 400 });
  if (password !== undefined && password.length > 0 && password.length < 4) {
    return NextResponse.json({ error: 'Mật khẩu mới phải từ 4 ký tự.' }, { status: 400 });
  }

  const payload: { passwordHash?: string; role?: UserRole } = {};
  if (password && password.length >= 4) payload.passwordHash = hashPassword(password);
  if (roleRaw !== undefined) payload.role = roleRaw === 'admin' ? 'admin' : 'customer';

  if (!payload.passwordHash && !payload.role) {
    return NextResponse.json({ error: 'Không có dữ liệu cần cập nhật.' }, { status: 400 });
  }

  try {
    const user = await updateUserRecord(username, payload);
    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được tài khoản.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const username = String(searchParams.get('username') || '').trim().toLowerCase();
  if (!username) return NextResponse.json({ error: 'Thiếu username.' }, { status: 400 });

  try {
    await deleteUserRecord(username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không xóa được tài khoản.' }, { status: 500 });
  }
}
