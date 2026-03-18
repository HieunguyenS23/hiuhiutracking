import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { OrderRecord, StoreData, UserRecord } from '@/lib/types';
import { getAdminSeed } from '@/lib/session';

const storeFile = path.join(process.cwd(), 'data', 'store.json');
const memoryStore = globalThis as typeof globalThis & { __portalStore?: StoreData };

function defaultStore(): StoreData {
  return { users: [getAdminSeed()], orders: [] };
}

async function readFileStore() {
  try {
    const raw = await fs.readFile(storeFile, 'utf8');
    const parsed = JSON.parse(raw) as StoreData;
    if (!parsed.users.some((item) => item.username === getAdminSeed().username)) {
      parsed.users.unshift(getAdminSeed());
    }
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

export async function readStore() {
  if (process.env.NODE_ENV === 'development') return readFileStore();
  if (!memoryStore.__portalStore) memoryStore.__portalStore = defaultStore();
  return memoryStore.__portalStore;
}

export async function writeStore(data: StoreData) {
  if (process.env.NODE_ENV === 'development') {
    await writeFileStore(data);
    return;
  }
  memoryStore.__portalStore = data;
}

export async function findUser(username: string) {
  const store = await readStore();
  return store.users.find((item) => item.username === username) || null;
}

export async function createUser(user: UserRecord) {
  const store = await readStore();
  if (store.users.some((item) => item.username === user.username)) {
    throw new Error('Tên đăng nhập đã tồn tại.');
  }
  store.users.push(user);
  await writeStore(store);
  return user;
}

export async function createOrder(order: OrderRecord) {
  const store = await readStore();
  store.orders.unshift(order);
  await writeStore(store);
  return order;
}

export async function getOrders() {
  const store = await readStore();
  return store.orders;
}

export async function getOrdersByUsername(username: string) {
  const store = await readStore();
  return store.orders.filter((item) => item.username === username);
}
