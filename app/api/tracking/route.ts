import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';

const TRACK_API_BASE = 'https://dodanhvu.dpdns.org';

export async function GET(request: Request) {
  await requireSession();

  const { searchParams } = new URL(request.url);
  const tracking = String(searchParams.get('tracking') || '').trim();

  if (!tracking) {
    return NextResponse.json({ error: 'Thiếu mã vận đơn.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${TRACK_API_BASE}/api/spx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackings: [tracking] }),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: String(data?.error || 'Không tra được hành trình đơn.') }, { status: response.status });
    }

    const result = Array.isArray(data?.results)
      ? data.results.find((item: any) => String(item?.tracking || '').trim() === tracking) || data.results[0]
      : null;

    return NextResponse.json({
      ok: true,
      tracking,
      result: result || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không kết nối được API tra vận đơn.' }, { status: 500 });
  }
}
