import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireAdmin, requireSession } from '@/lib/session';
import { createVoucher, deleteVoucher, getVouchers, updateVoucher } from '@/lib/store';

function normalizeVoucherId(raw: string) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

export async function GET() {
  await requireSession();
  try {
    const vouchers = await getVouchers();
    return NextResponse.json({ vouchers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được voucher.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await requireAdmin();
  const body = await request.json();

  const id = normalizeVoucherId(String(body.id || '')) || `voucher-${crypto.randomUUID().slice(0, 8)}`;
  const label = String(body.label || '').trim();
  const price = Number(body.price || 0);
  const active = body.active === undefined ? true : Boolean(body.active);

  if (!id) return NextResponse.json({ error: 'Mã voucher không hợp lệ.' }, { status: 400 });
  if (!label) return NextResponse.json({ error: 'Tên voucher không được để trống.' }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Giá voucher không hợp lệ.' }, { status: 400 });

  try {
    const now = new Date().toISOString();
    const voucher = await createVoucher({ id, label, price: Math.round(price), active, createdAt: now, updatedAt: now });
    return NextResponse.json({ ok: true, voucher });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tạo được voucher.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();

  const id = normalizeVoucherId(String(body.id || ''));
  const label = body.label === undefined ? undefined : String(body.label || '').trim();
  const price = body.price === undefined ? undefined : Number(body.price || 0);
  const active = body.active === undefined ? undefined : Boolean(body.active);

  if (!id) return NextResponse.json({ error: 'Thiếu mã voucher.' }, { status: 400 });
  if (label !== undefined && !label) return NextResponse.json({ error: 'Tên voucher không được để trống.' }, { status: 400 });
  if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
    return NextResponse.json({ error: 'Giá voucher không hợp lệ.' }, { status: 400 });
  }

  try {
    const voucher = await updateVoucher(id, {
      label,
      price: price === undefined ? undefined : Math.round(price),
      active,
    });
    return NextResponse.json({ ok: true, voucher });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được voucher.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await requireAdmin();
  const { searchParams } = new URL(request.url);
  const id = normalizeVoucherId(String(searchParams.get('id') || ''));
  if (!id) return NextResponse.json({ error: 'Thiếu mã voucher.' }, { status: 400 });

  try {
    await deleteVoucher(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không xóa được voucher.' }, { status: 500 });
  }
}
