export type UserRole = 'admin' | 'customer';

export type UserRecord = {
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
};

export type UserProfileRecord = {
  username: string;
  displayName: string;
  phone: string;
  address: string;
  bio: string;
  avatarColor: string;
  avatarImage: string;
  lastSeenAnnouncementsAt: string;
  updatedAt: string;
};

export type AnnouncementRecord = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  from: string;
  to: string;
  content: string;
  createdAt: string;
  readAt: string;
};

export type VoucherType = '100k' | '80k' | '60k';
export type OrderStatus = 'pending' | 'confirmed' | 'ordered' | 'canceled';

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
  productName?: string;
  processingCookie: string;
  processingAccount: string;
  createdAt: string;
};

export type StoreData = {
  users: UserRecord[];
  orders: OrderRecord[];
  profiles: UserProfileRecord[];
  announcements: AnnouncementRecord[];
  messages: MessageRecord[];
};



