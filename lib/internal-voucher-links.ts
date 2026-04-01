import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

export type InternalVoucherLink = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

const filePath = path.join(process.cwd(), 'data', 'internal-voucher-links.json');
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const sql = dbUrl ? neon(dbUrl) : null;

async function ensureDb() {
  if (!sql) return;
  await sql`CREATE TABLE IF NOT EXISTS internal_voucher_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
}

function mapDbRow(row: Record<string, unknown>): InternalVoucherLink {
  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    url: String(row.url || ''),
    createdAt: new Date(String(row.created_at || Date.now())).toISOString(),
    updatedAt: new Date(String(row.updated_at || Date.now())).toISOString(),
  };
}

async function readFileLinks(): Promise<InternalVoucherLink[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id || ''),
        title: String(item?.title || ''),
        url: String(item?.url || ''),
        createdAt: String(item?.createdAt || new Date().toISOString()),
        updatedAt: String(item?.updatedAt || new Date().toISOString()),
      }))
      .filter((item) => item.id && item.title && item.url);
  } catch {
    return [];
  }
}

async function writeFileLinks(data: InternalVoucherLink[]) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function getInternalVoucherLinks() {
  if (sql) {
    await ensureDb();
    const rows = await sql`
      SELECT id, title, url, created_at, updated_at
      FROM internal_voucher_links
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 500
    `;
    return rows.map((row) => mapDbRow(row as Record<string, unknown>));
  }

  const items = await readFileLinks();
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createInternalVoucherLink(input: { title: string; url: string }) {
  const title = String(input.title || '').trim();
  const url = String(input.url || '').trim();
  if (!title || !url) throw new Error('Thiếu tiêu đề hoặc link.');
  const now = new Date().toISOString();
  const record: InternalVoucherLink = {
    id: crypto.randomUUID(),
    title,
    url,
    createdAt: now,
    updatedAt: now,
  };

  if (sql) {
    await ensureDb();
    await sql`
      INSERT INTO internal_voucher_links (id, title, url, created_at, updated_at)
      VALUES (${record.id}, ${record.title}, ${record.url}, ${record.createdAt}, ${record.updatedAt})
    `;
    return record;
  }

  const list = await readFileLinks();
  list.unshift(record);
  await writeFileLinks(list);
  return record;
}

export async function deleteInternalVoucherLink(id: string) {
  const linkId = String(id || '').trim();
  if (!linkId) throw new Error('Thiếu id link.');

  if (sql) {
    await ensureDb();
    await sql`DELETE FROM internal_voucher_links WHERE id = ${linkId}`;
    return { ok: true };
  }

  const list = await readFileLinks();
  const next = list.filter((item) => item.id !== linkId);
  await writeFileLinks(next);
  return { ok: true };
}
