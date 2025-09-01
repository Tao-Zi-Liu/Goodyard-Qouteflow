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

export type RFQStatus = 'Waiting for Quote' | 'Locked' | 'Quotation in Progress' | 'Quotation Completed' | 'Archived';

export type ProductSeries = 'Synthetic Product' | 'Wig' | 'Hair Extension' | 'Topper' | 'Toupee';

export type RFQStatus = 'Waiting for Quote' | 'Locked' | 'Quotation in Progress' | 'Quotation Completed' | 'Abandoned' | 'Archived';

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
  quantity: number;
  images: File[];
  imagePreviews?: string[];
}

export type QuoteStatus = 'Pending Acceptance' | 'Accepted';

export interface Quote {
  id?: string;
  rfqId: string;
  productId: string;
  purchaserId: string;
  price: number;
  priceUSD?: number;
  deliveryDate: string;
  quoteTime: string;
  status: 'Pending Acceptance' | 'Accepted' | 'Rejected' | 'Abandoned';
  notes?: string;
  abandonmentReason?: string;
  abandonedAt?: string;

}

/* Action History Types */
export type ActionType = 
  | 'rfq_created' 
  | 'rfq_locked' 
  | 'rfq_unlocked' 
  | 'quote_submitted' 
  | 'quote_updated' 
  | 'quote_accepted' 
  | 'quote_rejected'
  | 'status_changed';

  export interface ActionHistory {
    id: string;
    rfqId: string;
    actionType: ActionType;
    performedBy: string; // User ID
    performedByName: string; // User name for display
    timestamp: string;
    details?: {
      previousStatus?: RFQStatus;
      newStatus?: RFQStatus;
      productId?: string;
      quoteId?: string;
      notes?: string;
    };
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
  lockedBy?: string; // User ID who locked it
  lockedAt?: string; // When it was locked
  actionHistory?: ActionHistory[];
  lastUpdatedTime?: string; // NEW FIELD: Track last update for quotes, locks, and edits
  rfqCode?: string; // Optional RFQ code field
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