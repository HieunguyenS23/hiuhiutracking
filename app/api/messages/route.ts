import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminSeed, requireSession } from '@/lib/session';
import { createMessage, findUser, getMessages, markMessagesRead } from '@/lib/store';

export async function GET(request: Request) {
  const session = await requireSession();
  const { searchParams } = new URL(request.url);
  const target = String(searchParams.get('target') || '').trim().toLowerCase();
  const markRead = String(searchParams.get('markRead') || '1') !== '0';

  try {
    const resolvedTarget = session.role === 'admin' ? target || undefined : undefined;

    if (markRead) {
      if (session.role === 'admin' && resolvedTarget) await markMessagesRead({ username: session.username, from: resolvedTarget });
      if (session.role !== 'admin') await markMessagesRead({ username: session.username, from: getAdminSeed().username });
    }

    const messages = await getMessages({
      username: session.username,
      role: session.role,
      target: resolvedTarget,
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong tai duoc tin nhan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const content = String(body.content || '').trim();
  let to = String(body.to || '').trim().toLowerCase();

  if (!content) return NextResponse.json({ error: 'Noi dung tin nhan khong duoc de trong.' }, { status: 400 });
  if (content.length > 1000) return NextResponse.json({ error: 'Noi dung toi da 1000 ky tu.' }, { status: 400 });

  if (session.role !== 'admin') {
    to = getAdminSeed().username;
  }

  if (!to || to === session.username) return NextResponse.json({ error: 'Nguoi nhan khong hop le.' }, { status: 400 });
  const targetUser = await findUser(to);
  if (!targetUser) return NextResponse.json({ error: 'Khong tim thay nguoi nhan.' }, { status: 404 });

  try {
    const message = await createMessage({
      id: crypto.randomUUID(),
      from: session.username,
      to,
      content,
      createdAt: new Date().toISOString(),
      readAt: '',
    });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong gui duoc tin nhan.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const from = String(body.from || '').trim().toLowerCase();

  try {
    if (session.role === 'admin' && from) {
      await markMessagesRead({ username: session.username, from });
    } else if (session.role !== 'admin') {
      await markMessagesRead({ username: session.username, from: getAdminSeed().username });
    } else {
      await markMessagesRead({ username: session.username });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Khong danh dau da doc duoc.' }, { status: 500 });
  }
}
