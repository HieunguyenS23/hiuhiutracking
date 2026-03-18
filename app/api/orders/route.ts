import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { createOrder, getOrders, getOrdersByUsername } from '@/lib/store';

export async function GET() {
  const session = await requireSession();
  const orders = session.role === 'admin' ? await getOrders() : await getOrdersByUsername(session.username);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();
  const recipientName = String(body.recipientName || '').trim();
  const phone = String(body.phone || '').trim();
  const addressLine = String(body.addressLine || '').trim();
  const ward = String(body.ward || '').trim();
  const district = String(body.district || '').trim();
  const province = String(body.province || '').trim();
  const voucherType = String(body.voucherType || '').trim();
  const productLink = String(body.productLink || '').trim();
  const variant = String(body.variant || '').trim();
  const quantity = Number(body.quantity || 0);

  if (!recipientName || !phone || !addressLine || !ward || !district || !province || !voucherType || !productLink || !variant || quantity < 1) {
    return NextResponse.json({ error: 'Vui lòng điền đủ thông tin đơn hàng.' }, { status: 400 });
  }

  const order = await createOrder({
    id: crypto.randomUUID(),
    username: session.username,
    recipientName,
    phone,
    addressLine,
    ward,
    district,
    province,
    voucherType: voucherType as '100k' | '80k' | '60k',
    productLink,
    variant,
    quantity,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, order });
}
