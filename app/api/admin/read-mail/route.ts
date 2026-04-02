import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';

const URL_REGEX = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;

function extractLinks(input: unknown): string[] {
  const found = new Set<string>();

  const walk = (value: unknown) => {
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      const matches = value.match(URL_REGEX) || [];
      for (const item of matches) {
        found.add(item.trim());
      }
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }

    if (typeof value === 'object') {
      for (const item of Object.values(value as Record<string, unknown>)) walk(item);
    }
  };

  walk(input);

  return Array.from(found);
}

export async function POST(request: Request) {
  await requireAdmin();

  try {
    const body = await request.json();
    const endpoint = String(body.endpoint || 'https://mail.botmmo.xyz').trim();
    const method = String(body.method || 'GET').toUpperCase();
    const apiKey = String(body.apiKey || '').trim();
    const query = String(body.query || '').trim();

    if (!/^https?:\/\//i.test(endpoint)) {
      return NextResponse.json({ error: 'Endpoint phải bắt đầu bằng http/https.' }, { status: 400 });
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
    };

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
      headers['api-key'] = apiKey;
    }

    const url = new URL(endpoint);
    let init: RequestInit = { method: method === 'POST' ? 'POST' : 'GET', headers, cache: 'no-store' };

    if (init.method === 'GET') {
      if (query) url.searchParams.set('q', query);
    } else {
      headers['Content-Type'] = 'application/json';
      init = {
        ...init,
        body: JSON.stringify({ q: query, query, mailbox: query, keyword: query }),
      };
    }

    const response = await fetch(url.toString(), init);
    const text = await response.text();

    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json({ error: 'API đọc mail trả lỗi.', detail: data }, { status: response.status });
    }

    const links = extractLinks(data);

    return NextResponse.json({
      ok: true,
      links,
      totalLinks: links.length,
      payload: data,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không đọc được mail.' }, { status: 500 });
  }
}
