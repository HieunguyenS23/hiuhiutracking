import { promises as fs } from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';
import type { OrderRecord, OrderStatus, StoreData, UserRecord } from '@/lib/types';
import { getAdminSeed, getCustomerSeed, getCustomerSeed2 } from '@/lib/session';

const storeFile = path.join(process.cwd(), 'data', 'store.json');
const memoryStore = globalThis as typeof globalThis & { __portalStore?: StoreData; __portalDbReady?: boolean };
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const hasDatabase = Boolean(databaseUrl);
const sql = hasDatabase ? neon(databaseUrl) : null;

const allowedStatuses: OrderStatus[] = ['pending', 'confirmed', 'ordered'];

function normalizeStatus(value: unknown): OrderStatus {
  const raw = String(value || '').toLowerCase() as OrderStatus;
  return allowedStatuses.includes(raw) ? raw : 'pending';
}

function ensureSeedUsers(data: StoreData) {
  const admin = getAdminSeed();
  const customer = getCustomerSeed();
  const customer2 = getCustomerSeed2();

  if (!data.users.some((item) => item.username === admin.username)) data.users.unshift(admin);
  if (!data.users.some((item) => item.username === customer.username)) data.users.push(customer);
  if (!data.users.some((item) => item.username === customer2.username)) data.users.push(customer2);
}

function defaultStore(): StoreData {
  const base: StoreData = { users: [], orders: [] };
  ensureSeedUsers(base);
  return base;
}

function ensurePersistentOrderStore() {
  if (!sql && process.env.NODE_ENV === 'production') {
    throw new Error('Hệ thống chưa cấu hình DATABASE_URL nên chưa thể lưu đơn ổn định giữa khách và admin.');
  }
}

async function ensureDatabaseReady() {
  if (!sql) return;
  if (memoryStore.__portalDbReady) return;

  await sql`CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    ward TEXT NOT NULL,
    district TEXT NOT NULL,
    province TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    product_link TEXT NOT NULL,
    variant TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL,
    processing_cookie TEXT NOT NULL DEFAULT '',
    processing_account TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_cookie TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_account TEXT NOT NULL DEFAULT ''`;

  const admin = getAdminSeed();
  const customer = getCustomerSeed();
  const customer2 = getCustomerSeed2();

  await sql`
    INSERT INTO users (username, password_hash, role, created_at)
    VALUES (${admin.username}, ${admin.passwordHash}, ${admin.role}, ${admin.createdAt})
    ON CONFLICT (username) DO NOTHING
  `;

  await sql`
    INSERT INTO users (username, password_hash, role, created_at)
    VALUES (${customer.username}, ${customer.passwordHash}, ${customer.role}, ${customer.createdAt})
    ON CONFLICT (username) DO NOTHING
  `;

  await sql`
    INSERT INTO users (username, password_hash, role, created_at)
    VALUES (${customer2.username}, ${customer2.passwordHash}, ${customer2.role}, ${customer2.createdAt})
    ON CONFLICT (username) DO NOTHING
  `;

  memoryStore.__portalDbReady = true;
}

async function readFileStore() {
  try {
    const raw = await fs.readFile(storeFile, 'utf8');
    const parsed = JSON.parse(raw) as StoreData;
    ensureSeedUsers(parsed);
    parsed.orders = (parsed.orders || []).map((order) => ({
      ...order,
      status: normalizeStatus(order.status),
      processingCookie: String(order.processingCookie || ''),
      processingAccount: String(order.processingAccount || ''),
    }));
    return parsed;
  } catch {
    const fresh = defaultStore();
    await fs.mkdir(path.dirname(storeFile), { recursive: true });
    await fs.writeFile(storeFile, JSON.stringify(fresh, null, 2), 'utf8');
    return fresh;
  }
}

async function writeFileStore(data: StoreData) {
  await fs.mkdir(path.dirname(storeFile), { recursive: true });
  await fs.writeFile(storeFile, JSON.stringify(data, null, 2), 'utf8');
}

async function readMemoryStore() {
  if (!memoryStore.__portalStore) memoryStore.__portalStore = defaultStore();
  ensureSeedUsers(memoryStore.__portalStore);
  return memoryStore.__portalStore;
}

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    username: String(row.username),
    passwordHash: String(row.password_hash),
    role: (row.role === 'admin' ? 'admin' : 'customer'),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapOrder(row: Record<string, unknown>): OrderRecord {
  return {
    id: String(row.id),
    username: String(row.username),
    recipientName: String(row.recipient_name),
    phone: String(row.phone),
    addressLine: String(row.address_line),
    ward: String(row.ward),
    district: String(row.district),
    province: String(row.province),
    voucherType: String(row.voucher_type) as OrderRecord['voucherType'],
    productLink: String(row.product_link),
    variant: String(row.variant),
    quantity: Number(row.quantity),
    status: normalizeStatus(row.status),
    processingCookie: String(row.processing_cookie || ''),
    processingAccount: String(row.processing_account || ''),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function findUser(username: string) {
  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`SELECT username, password_hash, role, created_at FROM users WHERE username = ${username} LIMIT 1`;
    if (rows.length === 0) return null;
    return mapUser(rows[0] as Record<string, unknown>);
  }

  if (process.env.NODE_ENV === 'development') {
    const store = await readFileStore();
    return store.users.find((item) => item.username === username) || null;
  }

  const store = await readMemoryStore();
  return store.users.find((item) => item.username === username) || null;
}

export async function createUser(user: UserRecord) {
  if (sql) {
    await ensureDatabaseReady();
    const existing = await sql`SELECT username FROM users WHERE username = ${user.username} LIMIT 1`;
    if (existing.length > 0) throw new Error('Tên đăng nhập đã tồn tại.');
    await sql`
      INSERT INTO users (username, password_hash, role, created_at)
      VALUES (${user.username}, ${user.passwordHash}, ${user.role}, ${user.createdAt})
    `;
    return user;
  }

  const store = process.env.NODE_ENV === 'development' ? await readFileStore() : await readMemoryStore();
  if (store.users.some((item) => item.username === user.username)) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }
  store.users.push(user);
  if (process.env.NODE_ENV === 'development') await writeFileStore(store);
  else memoryStore.__portalStore = store;
  return user;
}

export async function createOrder(order: OrderRecord) {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    await sql`
      INSERT INTO orders (
        id, username, recipient_name, phone, address_line, ward, district, province,
        voucher_type, product_link, variant, quantity, status, processing_cookie, processing_account, created_at
      ) VALUES (
        ${order.id}, ${order.username}, ${order.recipientName}, ${order.phone}, ${order.addressLine}, ${order.ward},
        ${order.district}, ${order.province}, ${order.voucherType}, ${order.productLink}, ${order.variant},
        ${order.quantity}, ${order.status}, ${order.processingCookie}, ${order.processingAccount}, ${order.createdAt}
      )
    `;
    return order;
  }

  const store = await readFileStore();
  store.orders.unshift(order);
  await writeFileStore(store);
  return order;
}

export async function updateOrder(orderId: string, payload: Partial<Pick<OrderRecord, 'status' | 'processingCookie' | 'processingAccount'>>) {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`
      SELECT id, username, recipient_name, phone, address_line, ward, district, province,
             voucher_type, product_link, variant, quantity, status, processing_cookie, processing_account, created_at
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error('Không tìm thấy đơn hàng.');

    const current = mapOrder(rows[0] as Record<string, unknown>);
    const nextStatus = payload.status ? normalizeStatus(payload.status) : current.status;
    const nextCookie = payload.processingCookie ?? current.processingCookie;
    const nextAccount = payload.processingAccount ?? current.processingAccount;

    await sql`
      UPDATE orders
      SET status = ${nextStatus},
          processing_cookie = ${nextCookie},
          processing_account = ${nextAccount}
      WHERE id = ${orderId}
    `;

    return { ...current, status: nextStatus, processingCookie: nextCookie, processingAccount: nextAccount };
  }

  const store = await readFileStore();
  const index = store.orders.findIndex((item) => item.id === orderId);
  if (index < 0) throw new Error('Không tìm thấy đơn hàng.');

  const current = store.orders[index];
  store.orders[index] = {
    ...current,
    status: payload.status ? normalizeStatus(payload.status) : current.status,
    processingCookie: payload.processingCookie ?? current.processingCookie,
    processingAccount: payload.processingAccount ?? current.processingAccount,
  };
  await writeFileStore(store);
  return store.orders[index];
}

export async function getOrders() {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`
      SELECT id, username, recipient_name, phone, address_line, ward, district, province,
             voucher_type, product_link, variant, quantity, status, processing_cookie, processing_account, created_at
      FROM orders
      ORDER BY created_at DESC
    `;
    return rows.map((row) => mapOrder(row as Record<string, unknown>));
  }

  const store = await readFileStore();
  return store.orders;
}

export async function getOrdersByUsername(username: string) {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`
      SELECT id, username, recipient_name, phone, address_line, ward, district, province,
             voucher_type, product_link, variant, quantity, status, processing_cookie, processing_account, created_at
      FROM orders
      WHERE username = ${username}
      ORDER BY created_at DESC
    `;
    return rows.map((row) => mapOrder(row as Record<string, unknown>));
  }

  const store = await readFileStore();
  return store.orders.filter((item) => item.username === username);
}
