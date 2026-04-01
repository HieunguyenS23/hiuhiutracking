import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { createInternalVoucherLink, deleteInternalVoucherLink, getInternalVoucherLinks } from '@/lib/internal-voucher-links';

export async function GET() {
  await requireAdmin();
  try {
    const links = await getInternalVoucherLinks();
    return NextResponse.json({ links });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được link nội bộ.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdmin();
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const url = String(body.url || '').trim();
    if (!title || !url) return NextResponse.json({ error: 'Thiếu tiêu đề hoặc link.' }, { status: 400 });
    const link = await createInternalVoucherLink({ title, url });
    return NextResponse.json({ ok: true, link });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tạo được link nội bộ.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();
  try {
    const { searchParams } = new URL(request.url);
    const id = String(searchParams.get('id') || '').trim();
    if (!id) return NextResponse.json({ error: 'Thiếu id link.' }, { status: 400 });
    await deleteInternalVoucherLink(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không xóa được link.' }, { status: 500 });
  }
}
