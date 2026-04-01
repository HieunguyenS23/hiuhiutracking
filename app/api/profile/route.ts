import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { findUser, getUserProfile, updateUserProfile } from '@/lib/store';
import { isValidVietnamPhone } from '@/lib/validators';

export async function GET() {
  const session = await requireSession();

  try {
    const user = await findUser(session.username);
    if (!user) return NextResponse.json({ error: 'Không tìm thấy tài khoản.' }, { status: 404 });
    const profile = await getUserProfile(session.username);
    return NextResponse.json({ profile, user: { username: user.username, role: user.role } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được hồ sơ.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  const phone = body.phone === undefined ? undefined : String(body.phone || '').trim();
  const email = body.email === undefined ? undefined : String(body.email || '').trim();
  const zaloNumber = body.zaloNumber === undefined ? undefined : String(body.zaloNumber || '').trim();
  const bankAccount = body.bankAccount === undefined ? undefined : String(body.bankAccount || '').trim();
  const bankName = body.bankName === undefined ? undefined : String(body.bankName || '').trim();
  const bio = body.bio === undefined ? undefined : String(body.bio || '').trim();
  const avatarImage = body.avatarImage === undefined ? undefined : String(body.avatarImage || '').trim();

  if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Email không hợp lệ.' }, { status: 400 });
  }
  if (phone !== undefined && phone && !isValidVietnamPhone(phone)) {
    return NextResponse.json({ error: 'Số điện thoại phải đúng 10 chữ số hoặc để trống.' }, { status: 400 });
  }
  if (zaloNumber !== undefined && zaloNumber && !/^\d{8,15}$/.test(zaloNumber)) {
    return NextResponse.json({ error: 'Số Zalo chỉ gồm số, từ 8 đến 15 ký tự.' }, { status: 400 });
  }
  if (bankAccount !== undefined && bankAccount.length > 40) {
    return NextResponse.json({ error: 'Số tài khoản tối đa 40 ký tự.' }, { status: 400 });
  }
  if (bankName !== undefined && bankName.length > 80) {
    return NextResponse.json({ error: 'Tên ngân hàng tối đa 80 ký tự.' }, { status: 400 });
  }
  if (bio !== undefined && bio.length > 300) {
    return NextResponse.json({ error: 'Giới thiệu tối đa 300 ký tự.' }, { status: 400 });
  }
  if (avatarImage !== undefined && avatarImage.length > 6_500_000) {
    return NextResponse.json({ error: 'Ảnh đại diện quá lớn. Vui lòng chọn ảnh nhỏ hơn 6MB.' }, { status: 400 });
  }

  try {
    const profile = await updateUserProfile(session.username, { phone, email, zaloNumber, bankAccount, bankName, bio, avatarImage });
    return NextResponse.json({ ok: true, profile, username: session.username });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.' }, { status: 500 });
  }
}
