import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { createOrder, deleteOrder, getOrders, getOrdersByUsername, updateOrder } from '@/lib/store';
import type { OrderStatus, VoucherType } from '@/lib/types';
import { hasAtLeastTwoWords, isValidVietnamPhone } from '@/lib/validators';

const allowedStatuses: OrderStatus[] = ['pending', 'confirmed', 'ordered'];
const allowedVoucherTypes: VoucherType[] = ['100k', '80k', '60k'];
const TRACK_API_BASE = 'https://dodanhvu.dpdns.org';

function normalizeCookie(raw: string) {
  const value = raw.trim();
  if (!value) return '';
  return value.startsWith('SPC_ST=') ? value : `SPC_ST=${value}`;
}

function pickFirstOrder(data: any) {
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  return orders.length > 0 ? orders[0] : null;
}

function pickDeliveryStatusFromCheckResponse(data: any) {
  const first = pickFirstOrder(data);
  if (typeof first?.statusText === 'string' && first.statusText.trim()) return first.statusText.trim();
  if (typeof first?.status === 'string' && first.status.trim()) return first.status.trim();
  if (typeof data?.warning === 'string' && data.warning.trim()) return data.warning.trim();
  return 'Chưa có dữ liệu giao hàng';
}

function pickTrackingCodeFromCheckResponse(data: any) {
  const first = pickFirstOrder(data);
  const tracking = first?.trackingCode || first?.tracking_code || first?.trackingNumber || first?.tracking_number || first?.tracking;
  if (typeof tracking === 'string' && tracking.trim()) return tracking.trim();
  return '';
}

function pickOrderCodeFromCheckResponse(data: any) {
  const first = pickFirstOrder(data);
  const code = first?.orderId || first?.order_id || first?.id || first?.orderSN || first?.order_sn;
  if (typeof code === 'number') return String(code);
  if (typeof code === 'string' && code.trim()) return code.trim();
  return '';
}

function pickOrderAmountFromCheckResponse(data: any) {
  const first = pickFirstOrder(data);
  const raw = first?.total || first?.totalText || first?.amount || first?.orderTotal || first?.payAmount;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return `${raw.toLocaleString('vi-VN')}đ`;
  }
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return '';
}

function pickProductNameFromCheckResponse(data: any) {
  const first = pickFirstOrder(data);
  const direct =
    first?.productName ||
    first?.product_name ||
    first?.itemName ||
    first?.item_name ||
    first?.title ||
    first?.name ||
    first?.productTitle ||
    first?.product_title;

  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const item = Array.isArray(first?.items) ? first.items[0] : null;
  const nested = item?.name || item?.title || item?.productName || item?.product_name;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();

  return '';
}

async function enrichProductNameByCookie(order: any) {
  const cookie = normalizeCookie(String(order?.processingCookie || ''));
  if (!cookie) return order;

  try {
    const response = await fetch(`${TRACK_API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie }),
      cache: 'no-store',
    });
    if (!response.ok) return order;

    const data = await response.json().catch(() => ({}));
    const productName = pickProductNameFromCheckResponse(data);
    if (!productName) return order;

    return { ...order, productName };
  } catch {
    return order;
  }
}

async function fetchDeliveryStatusByCookie(cookieInput: string) {
  const cookie = normalizeCookie(cookieInput);
  if (!cookie) throw new Error('Thiếu cookie để kiểm tra trạng thái giao hàng.');

  const response = await fetch(`${TRACK_API_BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookie }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'Không lấy được trạng thái giao hàng từ API.'));
  }

  return {
    status: pickDeliveryStatusFromCheckResponse(data),
    tracking: pickTrackingCodeFromCheckResponse(data),
    orderCode: pickOrderCodeFromCheckResponse(data),
    orderAmount: pickOrderAmountFromCheckResponse(data),
    normalizedCookie: String(data?.cookie || cookie),
  };
}

async function refreshCookieByAccount(accountInput: string) {
  const input = String(accountInput || '').trim();
  if (!input) throw new Error('Thiếu thông tin account để cập nhật cookie.');

  const response = await fetch(`${TRACK_API_BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(data?.error || 'Không cập nhật được cookie mới từ account.'));
  }

  const cookie = normalizeCookie(String(data?.cookie || ''));
  if (!cookie) throw new Error('API không trả về cookie hợp lệ.');
  return cookie;
}

export async function GET() {
  const session = await requireSession();
  try {
    const orders = session.role === 'admin' ? await getOrders() : await getOrdersByUsername(session.username);
    const enrichedOrders = await Promise.all(orders.map((order) => enrichProductNameByCookie(order)));
    return NextResponse.json({ orders: enrichedOrders });
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

  if (!recipientName || !addressLine || !ward || !district || !province || !voucherType || !productLink || !variant || quantity < 1) {
    return NextResponse.json({ error: 'Vui lòng điền đủ thông tin đơn hàng.' }, { status: 400 });
  }
  if (!hasAtLeastTwoWords(recipientName)) {
    return NextResponse.json({ error: 'Tên người nhận phải có ít nhất 2 từ.' }, { status: 400 });
  }
  if (phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json({ error: 'Số điện thoại phải đúng 10 chữ số hoặc để trống.' }, { status: 400 });
  }
  if (!allowedVoucherTypes.includes(voucherType as VoucherType)) {
    return NextResponse.json({ error: 'Loại mã không hợp lệ.' }, { status: 400 });
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
      voucherType: voucherType as VoucherType,
      productLink,
      variant,
      quantity,
      status: 'pending',
      orderCode: '',
      orderAmount: '',
      deliveryStatus: 'Chưa kiểm tra',
      deliveryCheckedAt: '',
      deliveryTracking: '',
      processingCookie: '',
      processingAccount: '',
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không gửi được đơn.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ admin mới được cập nhật đơn.' }, { status: 403 });
  }

  const body = await request.json();
  const orderId = String(body.orderId || '').trim();
  const statusRaw = String(body.status || '').trim();

  const recipientName = body.recipientName === undefined ? undefined : String(body.recipientName || '').trim();
  const phone = body.phone === undefined ? undefined : String(body.phone || '').trim();
  const addressLine = body.addressLine === undefined ? undefined : String(body.addressLine || '').trim();
  const ward = body.ward === undefined ? undefined : String(body.ward || '').trim();
  const district = body.district === undefined ? undefined : String(body.district || '').trim();
  const province = body.province === undefined ? undefined : String(body.province || '').trim();
  const voucherType = body.voucherType === undefined ? undefined : String(body.voucherType || '').trim();
  const productLink = body.productLink === undefined ? undefined : String(body.productLink || '').trim();
  const variant = body.variant === undefined ? undefined : String(body.variant || '').trim();
  const quantity = body.quantity === undefined ? undefined : Number(body.quantity || 0);

  const processingCookie = body.processingCookie === undefined ? undefined : String(body.processingCookie || '').trim();
  const processingAccount = body.processingAccount === undefined ? undefined : String(body.processingAccount || '').trim();
  const refreshDelivery = Boolean(body.refreshDeliveryStatus);
  const refreshCookie = Boolean(body.refreshCookieFromAccount);

  if (!orderId) {
    return NextResponse.json({ error: 'Thiếu mã đơn hàng.' }, { status: 400 });
  }

  const payload: {
    status?: OrderStatus;
    recipientName?: string;
    phone?: string;
    addressLine?: string;
    ward?: string;
    district?: string;
    province?: string;
    voucherType?: VoucherType;
    productLink?: string;
    variant?: string;
    quantity?: number;
    orderCode?: string;
    orderAmount?: string;
    deliveryStatus?: string;
    deliveryCheckedAt?: string;
    deliveryTracking?: string;
    processingCookie?: string;
    processingAccount?: string;
  } = {};

  if (statusRaw) {
    if (!allowedStatuses.includes(statusRaw as OrderStatus)) {
      return NextResponse.json({ error: 'Trạng thái không hợp lệ.' }, { status: 400 });
    }
    payload.status = statusRaw as OrderStatus;
  }

  if (recipientName !== undefined) {
    if (!recipientName || !hasAtLeastTwoWords(recipientName)) {
      return NextResponse.json({ error: 'Tên người nhận phải có ít nhất 2 từ.' }, { status: 400 });
    }
    payload.recipientName = recipientName;
  }

  if (phone !== undefined) {
    if (phone && !isValidVietnamPhone(phone)) {
      return NextResponse.json({ error: 'Số điện thoại phải đúng 10 chữ số hoặc để trống.' }, { status: 400 });
    }
    payload.phone = phone;
  }

  if (addressLine !== undefined) {
    if (!addressLine) return NextResponse.json({ error: 'Địa chỉ cụ thể không được để trống.' }, { status: 400 });
    payload.addressLine = addressLine;
  }
  if (ward !== undefined) {
    if (!ward) return NextResponse.json({ error: 'Phường/Xã không được để trống.' }, { status: 400 });
    payload.ward = ward;
  }
  if (district !== undefined) {
    if (!district) return NextResponse.json({ error: 'Quận/Huyện không được để trống.' }, { status: 400 });
    payload.district = district;
  }
  if (province !== undefined) {
    if (!province) return NextResponse.json({ error: 'Tỉnh/Thành không được để trống.' }, { status: 400 });
    payload.province = province;
  }

  if (voucherType !== undefined) {
    if (!allowedVoucherTypes.includes(voucherType as VoucherType)) {
      return NextResponse.json({ error: 'Loại mã không hợp lệ.' }, { status: 400 });
    }
    payload.voucherType = voucherType as VoucherType;
  }

  if (productLink !== undefined) {
    if (!/^https?:\/\//.test(productLink)) {
      return NextResponse.json({ error: 'Link sản phẩm phải bắt đầu bằng http hoặc https.' }, { status: 400 });
    }
    payload.productLink = productLink;
  }

  if (variant !== undefined) {
    if (!variant) return NextResponse.json({ error: 'Phân loại sản phẩm không được để trống.' }, { status: 400 });
    payload.variant = variant;
  }

  if (quantity !== undefined) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return NextResponse.json({ error: 'Số lượng phải là số nguyên >= 1.' }, { status: 400 });
    }
    payload.quantity = quantity;
  }

  if (processingCookie !== undefined) payload.processingCookie = normalizeCookie(processingCookie);
  if (processingAccount !== undefined) payload.processingAccount = processingAccount;

  try {
    if (refreshCookie) {
      const account = payload.processingAccount ?? processingAccount ?? '';
      const newCookie = await refreshCookieByAccount(account);
      payload.processingCookie = newCookie;
    }

    if (refreshDelivery) {
      const cookieForCheck = payload.processingCookie ?? processingCookie ?? '';
      const delivery = await fetchDeliveryStatusByCookie(cookieForCheck);
      payload.deliveryStatus = delivery.status;
      payload.deliveryTracking = delivery.tracking;
      payload.orderCode = delivery.orderCode;
      payload.orderAmount = delivery.orderAmount;
      payload.deliveryCheckedAt = new Date().toISOString();
      payload.processingCookie = delivery.normalizedCookie;
    }

    if (
      !payload.status &&
      payload.recipientName === undefined &&
      payload.phone === undefined &&
      payload.addressLine === undefined &&
      payload.ward === undefined &&
      payload.district === undefined &&
      payload.province === undefined &&
      payload.voucherType === undefined &&
      payload.productLink === undefined &&
      payload.variant === undefined &&
      payload.quantity === undefined &&
      payload.processingCookie === undefined &&
      payload.processingAccount === undefined &&
      payload.deliveryStatus === undefined &&
      payload.deliveryCheckedAt === undefined &&
      payload.deliveryTracking === undefined &&
      payload.orderCode === undefined &&
      payload.orderAmount === undefined
    ) {
      return NextResponse.json({ error: 'Không có dữ liệu cần cập nhật.' }, { status: 400 });
    }

    const order = await updateOrder(orderId, payload);
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể cập nhật đơn.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Chỉ admin mới được xóa đơn.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const orderId = String(searchParams.get('orderId') || '').trim();
  if (!orderId) {
    return NextResponse.json({ error: 'Thiếu mã đơn hàng.' }, { status: 400 });
  }

  try {
    await deleteOrder(orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không xóa được đơn.' }, { status: 500 });
  }
}
