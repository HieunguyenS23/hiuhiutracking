import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { createOrder, getOrders, getOrdersByUsername } from '@/lib/store';
import { hasAtLeastTwoWords, isValidVietnamPhone } from '@/lib/validators';

export async function GET() {
  const session = await requireSession();
  try {
    const orders = session.role === 'admin' ? await getOrders() : await getOrdersByUsername(session.username);
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được danh sách đơn.' }, { status: 503 });
  }
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
  if (!hasAtLeastTwoWords(recipientName)) {
    return NextResponse.json({ error: 'Tên người nhận phải có ít nhất 2 từ.' }, { status: 400 });
  }
  if (!isValidVietnamPhone(phone)) {
    return NextResponse.json({ error: 'Số điện thoại phải đúng 10 chữ số.' }, { status: 400 });
  }
  if (!/^https?:\/\//.test(productLink)) {
    return NextResponse.json({ error: 'Link sản phẩm phải bắt đầu bằng http hoặc https.' }, { status: 400 });
  }

  try {
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
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không gửi được đơn.' }, { status: 503 });
  }
}


