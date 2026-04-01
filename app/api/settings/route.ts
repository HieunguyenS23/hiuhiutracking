import { NextResponse } from 'next/server';
import { requireAdmin, requireSession } from '@/lib/session';
import { getAppSettings, updateAppSettings } from '@/lib/store';

export async function GET() {
  await requireSession();
  try {
    const settings = await getAppSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được cài đặt.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  await requireAdmin();
  const body = await request.json();

  const orderFormEnabled = body.orderFormEnabled === undefined ? undefined : Boolean(body.orderFormEnabled);

  try {
    const settings = await updateAppSettings({ orderFormEnabled });
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được cài đặt.' }, { status: 500 });
  }
}
