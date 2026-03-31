import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getOrdersByUsername, updateOrder } from '@/lib/store';

const TRACK_API_BASE = 'https://dodanhvu.dpdns.org';

function pickCurrentStatus(result: any) {
  const value = String(result?.status || result?.latest?.desc || '').trim();
  if (value) return value;

  const records = Array.isArray(result?.records) ? result.records : [];
  const first = records[0];
  const fallback = String(first?.desc || first?.status || '').trim();
  return fallback;
}

export async function GET(request: Request) {
  const session = await requireSession();

  const { searchParams } = new URL(request.url);
  const tracking = String(searchParams.get('tracking') || '').trim();
  const orderId = String(searchParams.get('orderId') || '').trim();

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

    const currentStatus = pickCurrentStatus(result);

    if (orderId && currentStatus) {
      let allowed = session.role === 'admin';
      if (!allowed) {
        const mine = await getOrdersByUsername(session.username);
        allowed = mine.some((item) => item.id === orderId);
      }

      if (allowed) {
        await updateOrder(orderId, {
          deliveryStatus: currentStatus,
          deliveryCheckedAt: new Date().toISOString(),
          deliveryTracking: tracking,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      tracking,
      result: result || null,
      currentStatus,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không kết nối được API tra vận đơn.' }, { status: 500 });
  }
}
