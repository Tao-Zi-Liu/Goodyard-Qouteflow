
export type UserRole = 'Admin' | 'Sales' | 'Purchasing';
export type Language = 'en' | 'de' | 'zh';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  registrationDate: string;
  lastLoginTime: string | null; // Changed from string to allow null
  status: 'Active' | 'Inactive';
  language: Language;
  avatar: string;
  // Add these new fields:
  mustChangePassword?: boolean; // For forcing password changes
  createdBy?: string; // Track who created this user
  createdAt?: string; // When the user was created
  updatedBy?: string; // Track who last updated this user
  updatedAt?: string; // When the user was last updated
}

export type RFQStatus = 'Waiting for Quote' | 'Quotation in Progress' | 'Quotation Completed' | 'Archived';

export type ProductSeries = 'Synthetic Product' | 'Wig' | 'Hair Extension' | 'Topper' | 'Toupee';

export interface Product {
  id: string;
  wlid: string;
  productSeries: ProductSeries;
  sku: string;
  hairFiber: string;
  cap: string;
  capSize: string;
  length: string;
  density: string;
  color: string;
  curlStyle: string;
  images: File[];
  imagePreviews?: string[];
}

export type QuoteStatus = 'Pending Acceptance' | 'Accepted';

export interface Quote {
  rfqId: string;
  productId: string;
  purchaserId: string;
  price: number;
  deliveryDate: string; // ISO date string
  quoteTime: string; // ISO date string
  status: QuoteStatus;
}

export interface RFQ {
  id: string;
  code: string;
  status: RFQStatus;
  inquiryTime: string; // ISO date string
  creatorId: string; // Sales user ID
  assignedPurchaserIds: string[];
  customerType: string;
  customerEmail: string;
  products: Product[];
  quotes: Quote[];
  archiveReason?: string;
}

export interface AppNotification {
  id: string;
  titleKey: string;
  bodyKey: string;
  bodyParams?: Record<string, string>;
  createdAt: number;
  read: boolean;
  recipientId: string;
  href?: string;
}
