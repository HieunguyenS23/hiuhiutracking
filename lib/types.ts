export type UserRole = 'admin' | 'customer';

export type UserRecord = {
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type VoucherType = '100k' | '80k' | '60k';
export type OrderStatus = 'pending' | 'confirmed' | 'ordered';

export type OrderRecord = {
  id: string;
  username: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  voucherType: VoucherType;
  productLink: string;
  variant: string;
  quantity: number;
  status: OrderStatus;
  orderCode: string;
  orderAmount: string;
  deliveryStatus: string;
  deliveryCheckedAt: string;
  deliveryTracking: string;
  productImage: string;
  processingCookie: string;
  processingAccount: string;
  createdAt: string;
};

export type StoreData = {
  users: UserRecord[];
  orders: OrderRecord[];
};

