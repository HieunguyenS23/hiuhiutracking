import { NextResponse } from 'next/server';
import { hashPassword, requireAdmin } from '@/lib/session';
import {
  createUser,
  deleteUserRecord,
  findUser,
  getMessages,
  getUserProfile,
  getUsers,
  renameUsername,
  updateUserProfile,
  updateUserRecord,
} from '@/lib/store';
import type { UserRole } from '@/lib/types';
import { isValidUsername } from '@/lib/validators';

function sanitizeUser(user: { username: string; role: UserRole; createdAt: string }) {
  return {
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function GET(request: Request) {
  const session = await requireAdmin();
  const { searchParams } = new URL(request.url);
  const username = String(searchParams.get('username') || '').trim().toLowerCase();

  try {
    if (!username) {
      const users = await getUsers();
      return NextResponse.json({ users: users.map((u) => sanitizeUser(u)) });
    }

    const user = await findUser(username);
    if (!user) return NextResponse.json({ error: 'Khong tim thay tai khoan.' }, { status: 404 });

    const profile = await getUserProfile(username);
    const messages = await getMessages({ username: session.username, role: 'admin', target: username });

    return NextResponse.json({ user: sanitizeUser(user), profile, messages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tai duoc du lieu tai khoan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();
  const roleRaw = String(body.role || 'customer').trim();
  const role = roleRaw === 'admin' ? 'admin' : 'customer';

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: 'Username phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.' }, { status: 400 });
  }
  if (password.length < 6) return NextResponse.json({ error: 'Mat khau phai tu 6 ky tu.' }, { status: 400 });
  if (await findUser(username)) return NextResponse.json({ error: 'Username da ton tai.' }, { status: 409 });

  try {
    const user = await createUser({
      username,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, user: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tao duoc tai khoan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();
  const username = String(body.username || '').trim().toLowerCase();
  const nextUsername = body.nextUsername === undefined ? undefined : String(body.nextUsername || '').trim().toLowerCase();
  const password = body.password === undefined ? undefined : String(body.password || '').trim();
  const roleRaw = body.role === undefined ? undefined : String(body.role || '').trim();

  const displayName = body.displayName === undefined ? undefined : String(body.displayName || '').trim();
  const phone = body.phone === undefined ? undefined : String(body.phone || '').trim();
  const address = body.address === undefined ? undefined : String(body.address || '').trim();
  const bio = body.bio === undefined ? undefined : String(body.bio || '').trim();
  const avatarImage = body.avatarImage === undefined ? undefined : String(body.avatarImage || '').trim();

  if (!username) return NextResponse.json({ error: 'Thieu username.' }, { status: 400 });

  if (nextUsername !== undefined && !isValidUsername(nextUsername)) {
    return NextResponse.json({ error: 'Username moi phai tu 5 ky tu, chi gom chu thuong khong dau, so hoac gach duoi.' }, { status: 400 });
  }

  if (password !== undefined && password.length > 0 && password.length < 6) {
    return NextResponse.json({ error: 'Mat khau moi phai tu 6 ky tu.' }, { status: 400 });
  }

  const payload: { passwordHash?: string; role?: UserRole } = {};
  if (password && password.length >= 6) payload.passwordHash = hashPassword(password);
  if (roleRaw !== undefined) payload.role = roleRaw === 'admin' ? 'admin' : 'customer';

  try {
    if (nextUsername && nextUsername !== username) {
      await renameUsername(username, nextUsername);
    }

    const targetUsername = nextUsername && nextUsername !== username ? nextUsername : username;

    if (payload.passwordHash || payload.role) {
      await updateUserRecord(targetUsername, payload);
    }

    if (displayName !== undefined || phone !== undefined || address !== undefined || bio !== undefined || avatarImage !== undefined) {
      await updateUserProfile(targetUsername, { displayName, phone, address, bio, avatarImage });
    }

    const user = await findUser(targetUsername);
    const profile = await getUserProfile(targetUsername);
    if (!user) throw new Error('Khong tim thay tai khoan sau cap nhat.');

    return NextResponse.json({ ok: true, user: sanitizeUser(user), profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong cap nhat duoc tai khoan.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const username = String(searchParams.get('username') || '').trim().toLowerCase();
  if (!username) return NextResponse.json({ error: 'Thieu username.' }, { status: 400 });

  try {
    await deleteUserRecord(username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong xoa duoc tai khoan.' }, { status: 500 });
  }
}
