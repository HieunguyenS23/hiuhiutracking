import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';

type ResultItem = {
  source: string;
  ok: boolean;
  message: string;
  data?: unknown;
};

function parseRows(input: string) {
  return String(input || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const body = await request.json();
    const endpoint = String(body.endpoint || 'https://otistx.com/add-email').trim();
    const method = String(body.method || 'POST').toUpperCase();
    const apiKey = String(body.apiKey || process.env.OTISTX_API_KEY || 'otis_9lGRopDaIopztPXQ4C8glIj2Xp717AIK').trim();
    const rows = parseRows(String(body.rows || ''));

    if (!/^https?:\/\//i.test(endpoint)) {
      return NextResponse.json({ error: 'Endpoint phải bắt đầu bằng http/https.' }, { status: 400 });
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Chưa có dữ liệu mail để gửi.' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
      headers['api-key'] = apiKey;
    }

    const response = await fetch(endpoint, {
      method: method === 'PUT' ? 'PUT' : 'POST',
      headers,
      body: JSON.stringify({
        apiKey,
        key: apiKey,
        token: apiKey,
        rows,
        emails: rows,
        data: rows,
        raw: rows.join('\n'),
      }),
      cache: 'no-store',
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: String(data?.error || data?.message || 'API thêm mail trả lỗi.'), data },
        { status: response.status }
      );
    }

    const okCount = Number(data?.okCount || data?.success || data?.successCount || 0) || rows.length;
    const failCount = Number(data?.failCount || data?.failed || data?.errorCount || 0);

    const results: ResultItem[] = rows.map((line, index) => ({
      source: line,
      ok: index < okCount,
      message: index < okCount ? 'Đã gửi' : 'Lỗi',
    }));

    return NextResponse.json({
      ok: true,
      summary: {
        total: rows.length,
        ok: okCount,
        failed: Math.max(0, failCount),
      },
      results,
      data,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thêm được mail.' }, { status: 500 });
  }
}
