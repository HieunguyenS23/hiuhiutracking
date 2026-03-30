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
    order_code TEXT NOT NULL DEFAULT '',
    order_amount TEXT NOT NULL DEFAULT '',
    delivery_status TEXT NOT NULL DEFAULT '',
    delivery_checked_at TEXT NOT NULL DEFAULT '',
    delivery_tracking TEXT NOT NULL DEFAULT '',
    processing_cookie TEXT NOT NULL DEFAULT '',
    processing_account TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_code TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_amount TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_checked_at TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_tracking TEXT NOT NULL DEFAULT ''`;
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
      orderCode: String(order.orderCode || ''),
      orderAmount: String(order.orderAmount || ''),
      deliveryStatus: String(order.deliveryStatus || ''),
      deliveryCheckedAt: String(order.deliveryCheckedAt || ''),
      deliveryTracking: String(order.deliveryTracking || ''),
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
    role: row.role === 'admin' ? 'admin' : 'customer',
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
    orderCode: String(row.order_code || ''),
    orderAmount: String(row.order_amount || ''),
    deliveryStatus: String(row.delivery_status || ''),
    deliveryCheckedAt: String(row.delivery_checked_at || ''),
    deliveryTracking: String(row.delivery_tracking || ''),
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
  if (store.users.some((item) => item.username === user.username)) throw new Error('Tên đăng nhập đã tồn tại.');
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
        voucher_type, product_link, variant, quantity, status, order_code, order_amount,
        delivery_status, delivery_checked_at, delivery_tracking, processing_cookie,
        processing_account, created_at
      ) VALUES (
        ${order.id}, ${order.username}, ${order.recipientName}, ${order.phone}, ${order.addressLine}, ${order.ward},
        ${order.district}, ${order.province}, ${order.voucherType}, ${order.productLink}, ${order.variant},
        ${order.quantity}, ${order.status}, ${order.orderCode}, ${order.orderAmount}, ${order.deliveryStatus},
        , , ,
        ${order.processingAccount}, ${order.createdAt}
      )
    `;
    return order;
  }

  const store = await readFileStore();
  store.orders.unshift(order);
  await writeFileStore(store);
  return order;
}

export async function updateOrder(
  orderId: string,
  payload: Partial<Pick<OrderRecord, 'status' | 'recipientName' | 'phone' | 'addressLine' | 'ward' | 'district' | 'province' | 'voucherType' | 'productLink' | 'variant' | 'quantity' | 'orderCode' | 'orderAmount' | 'deliveryStatus' | 'deliveryCheckedAt' | 'deliveryTracking' | 'processingCookie' | 'processingAccount'>>
) {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`
      SELECT id, username, recipient_name, phone, address_line, ward, district, province,
             voucher_type, product_link, variant, quantity, status, order_code, order_amount,
             delivery_status, delivery_checked_at, delivery_tracking, processing_cookie,
             processing_account, created_at
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error('Không tìm thấy đơn hàng.');

    const current = mapOrder(rows[0] as Record<string, unknown>);
    const nextStatus = payload.status ? normalizeStatus(payload.status) : current.status;
    const nextRecipientName = payload.recipientName ?? current.recipientName;
    const nextPhone = payload.phone ?? current.phone;
    const nextAddressLine = payload.addressLine ?? current.addressLine;
    const nextWard = payload.ward ?? current.ward;
    const nextDistrict = payload.district ?? current.district;
    const nextProvince = payload.province ?? current.province;
    const nextVoucherType = payload.voucherType ?? current.voucherType;
    const nextProductLink = payload.productLink ?? current.productLink;
    const nextVariant = payload.variant ?? current.variant;
    const nextQuantity = payload.quantity ?? current.quantity;
    const nextOrderCode = payload.orderCode ?? current.orderCode;
    const nextOrderAmount = payload.orderAmount ?? current.orderAmount;
    const nextDeliveryStatus = payload.deliveryStatus ?? current.deliveryStatus;
    const nextDeliveryCheckedAt = payload.deliveryCheckedAt ?? current.deliveryCheckedAt;
    const nextDeliveryTracking = payload.deliveryTracking ?? current.deliveryTracking;
    const nextCookie = payload.processingCookie ?? current.processingCookie;
    const nextAccount = payload.processingAccount ?? current.processingAccount;

    await sql`
      UPDATE orders
      SET recipient_name = ${nextRecipientName},
          phone = ${nextPhone},
          address_line = ${nextAddressLine},
          ward = ${nextWard},
          district = ${nextDistrict},
          province = ${nextProvince},
          voucher_type = ${nextVoucherType},
          product_link = ${nextProductLink},
          variant = ${nextVariant},
          quantity = ${nextQuantity},
          status = ${nextStatus},
          order_code = ${nextOrderCode},
          order_amount = ${nextOrderAmount},
          delivery_status = ${nextDeliveryStatus},
          delivery_checked_at = ${nextDeliveryCheckedAt},
          delivery_tracking = ${nextDeliveryTracking},
          processing_cookie = ${nextCookie},
          processing_account = ${nextAccount}
      WHERE id = ${orderId}
    `;

    return {
      ...current,
      recipientName: nextRecipientName,
      phone: nextPhone,
      addressLine: nextAddressLine,
      ward: nextWard,
      district: nextDistrict,
      province: nextProvince,
      voucherType: nextVoucherType,
      productLink: nextProductLink,
      variant: nextVariant,
      quantity: nextQuantity,
      status: nextStatus,
      orderCode: nextOrderCode,
      orderAmount: nextOrderAmount,
      deliveryStatus: nextDeliveryStatus,
      deliveryCheckedAt: nextDeliveryCheckedAt,
      deliveryTracking: nextDeliveryTracking,
      processingCookie: nextCookie,
      processingAccount: nextAccount,
    };
  }

  const store = await readFileStore();
  const index = store.orders.findIndex((item) => item.id === orderId);
  if (index < 0) throw new Error('Không tìm thấy đơn hàng.');

  const current = store.orders[index];
  store.orders[index] = {
    ...current,
    recipientName: payload.recipientName ?? current.recipientName,
    phone: payload.phone ?? current.phone,
    addressLine: payload.addressLine ?? current.addressLine,
    ward: payload.ward ?? current.ward,
    district: payload.district ?? current.district,
    province: payload.province ?? current.province,
    voucherType: payload.voucherType ?? current.voucherType,
    productLink: payload.productLink ?? current.productLink,
    variant: payload.variant ?? current.variant,
    quantity: payload.quantity ?? current.quantity,
    status: payload.status ? normalizeStatus(payload.status) : current.status,
    orderCode: payload.orderCode ?? current.orderCode,
    orderAmount: payload.orderAmount ?? current.orderAmount,
    deliveryStatus: payload.deliveryStatus ?? current.deliveryStatus,
    deliveryCheckedAt: payload.deliveryCheckedAt ?? current.deliveryCheckedAt,
    deliveryTracking: payload.deliveryTracking ?? current.deliveryTracking,
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
             voucher_type, product_link, variant, quantity, status, order_code, order_amount,
             delivery_status, delivery_checked_at, delivery_tracking, processing_cookie,
             processing_account, created_at
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
             voucher_type, product_link, variant, quantity, status, order_code, order_amount,
             delivery_status, delivery_checked_at, delivery_tracking, processing_cookie,
             processing_account, created_at
      FROM orders
      WHERE username = ${username}
      ORDER BY created_at DESC
    `;
    return rows.map((row) => mapOrder(row as Record<string, unknown>));
  }

  const store = await readFileStore();
  return store.orders.filter((item) => item.username === username);
}

export async function deleteOrder(orderId: string) {
  ensurePersistentOrderStore();

  if (sql) {
    await ensureDatabaseReady();
    const found = await sql`SELECT id FROM orders WHERE id = ${orderId} LIMIT 1`;
    if (found.length === 0) throw new Error('Không tìm thấy đơn hàng để xóa.');
    await sql`DELETE FROM orders WHERE id = ${orderId}`;
    return { ok: true };
  }

  const store = await readFileStore();
  const before = store.orders.length;
  store.orders = store.orders.filter((item) => item.id !== orderId);
  if (store.orders.length === before) throw new Error('Không tìm thấy đơn hàng để xóa.');
  await writeFileStore(store);
  return { ok: true };
}

export async function getUsers() {
  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`SELECT username, password_hash, role, created_at FROM users ORDER BY created_at DESC`;
    return rows.map((row) => mapUser(row as Record<string, unknown>));
  }

  const store = process.env.NODE_ENV === 'development' ? await readFileStore() : await readMemoryStore();
  return [...store.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateUserRecord(username: string, payload: { passwordHash?: string; role?: 'admin' | 'customer' }) {
  if (!username) throw new Error('Thiếu username.');

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`SELECT username, password_hash, role, created_at FROM users WHERE username = ${username} LIMIT 1`;
    if (rows.length === 0) throw new Error('Không tìm thấy tài khoản.');

    const current = mapUser(rows[0] as Record<string, unknown>);
    const nextRole = payload.role ?? current.role;
    const nextPasswordHash = payload.passwordHash ?? current.passwordHash;

    await sql`
      UPDATE users
      SET role = ${nextRole}, password_hash = ${nextPasswordHash}
      WHERE username = ${username}
    `;

    return { ...current, role: nextRole, passwordHash: nextPasswordHash };
  }

  const store = process.env.NODE_ENV === 'development' ? await readFileStore() : await readMemoryStore();
  const idx = store.users.findIndex((u) => u.username === username);
  if (idx < 0) throw new Error('Không tìm thấy tài khoản.');

  store.users[idx] = {
    ...store.users[idx],
    role: payload.role ?? store.users[idx].role,
    passwordHash: payload.passwordHash ?? store.users[idx].passwordHash,
  };

  if (process.env.NODE_ENV === 'development') await writeFileStore(store);
  else memoryStore.__portalStore = store;

  return store.users[idx];
}

export async function deleteUserRecord(username: string) {
  if (!username) throw new Error('Thiếu username.');

  const adminUsername = getAdminSeed().username;
  if (username === adminUsername) throw new Error('Không thể xóa tài khoản admin hệ thống.');

  if (sql) {
    await ensureDatabaseReady();
    const rows = await sql`SELECT username, role FROM users WHERE username = ${username} LIMIT 1`;
    if (rows.length === 0) throw new Error('Không tìm thấy tài khoản.');
    const role = String((rows[0] as any).role || 'customer');
    if (role === 'admin') throw new Error('Không thể xóa tài khoản admin.');

    await sql`DELETE FROM users WHERE username = ${username}`;
    return { ok: true };
  }

  const store = process.env.NODE_ENV === 'development' ? await readFileStore() : await readMemoryStore();
  const target = store.users.find((u) => u.username === username);
  if (!target) throw new Error('Không tìm thấy tài khoản.');
  if (target.role === 'admin') throw new Error('Không thể xóa tài khoản admin.');

  store.users = store.users.filter((u) => u.username !== username);

  if (process.env.NODE_ENV === 'development') await writeFileStore(store);
  else memoryStore.__portalStore = store;

  return { ok: true };
}









