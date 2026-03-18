import { NextResponse } from 'next/server';
import { searchAddressOptions } from '@/lib/google-maps';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const query = searchParams.get('query') || '';
  const province = searchParams.get('province') || '';
  const district = searchParams.get('district') || '';

  if (level !== 'province' && level !== 'district' && level !== 'ward') {
    return NextResponse.json({ error: 'Level không hợp lệ.' }, { status: 400 });
  }

  try {
    const options = await searchAddressOptions({ level, query, province, district });
    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được danh sách địa chỉ.' }, { status: 500 });
  }
}
