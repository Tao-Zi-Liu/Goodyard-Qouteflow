
import type { User, RFQ } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'admin@quoteflow.com',
    name: 'Admin User',
    role: 'Admin',
    registrationDate: '2023-01-01T10:00:00Z',
    lastLoginTime: '2024-07-30T10:00:00Z',
    status: 'Active',
    language: 'en',
    avatar: 'https://placehold.co/100x100'
  },
  {
    id: '2',
    email: 'sales@quoteflow.com',
    name: 'Sales Person',
    role: 'Sales',
    registrationDate: '2023-02-15T11:00:00Z',
    lastLoginTime: '2024-07-30T11:00:00Z',
    status: 'Active',
    language: 'de',
    avatar: 'https://placehold.co/100x100'
  },
  {
    id: '3',
    email: 'purchasing@quoteflow.com',
    name: 'Purchasing Agent',
    role: 'Purchasing',
    registrationDate: '2023-03-20T12:00:00Z',
    lastLoginTime: '2024-07-30T12:00:00Z',
    status: 'Active',
    language: 'zh',
    avatar: 'https://placehold.co/100x100'
  },
   {
    id: '4',
    email: 'purchasing2@quoteflow.com',
    name: '采购专员',
    role: 'Purchasing',
    registrationDate: '2023-04-10T14:00:00Z',
    lastLoginTime: '2024-07-29T14:00:00Z',
    status: 'Active',
    language: 'zh',
    avatar: 'https://placehold.co/100x100'
  }
];

export const MOCK_RFQS: RFQ[] = [
  {
    id: 'rfq-001',
    code: '240730103000',
    status: 'Waiting for Quote',
    inquiryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    creatorId: '2',
    assignedPurchaserIds: ['3'],
    customerType: 'New',
    customerEmail: 'customer@example.com',
    products: [
      {
        id: 'prod-001',
        wlid: 'FTCV0001',
        productSeries: 'Wig',
        sku: 'W-123',
        hairFiber: 'Remy Human Hair',
        cap: 'Lace Front',
        capSize: 'Medium',
        length: '18 inches',
        density: '150%',
        color: 'Natural Black',
        curlStyle: 'Body Wave',
        images: [],
        imagePreviews: ['https://placehold.co/600x400', 'https://placehold.co/600x400'],
      },
    ],
    quotes: [],
  },
  {
    id: 'rfq-002',
    code: '240729150000',
    status: 'Quotation Completed',
    inquiryTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    creatorId: '2',
    assignedPurchaserIds: ['3'],
    customerType: 'Returning',
    customerEmail: 'returning@example.com',
    products: [
       {
        id: 'prod-002',
        wlid: 'FTCE0001',
        productSeries: 'Hair Extension',
        sku: 'HE-456',
        hairFiber: 'Synthetic',
        cap: 'N/A',
        capSize: 'N/A',
        length: '22 inches',
        density: 'N/A',
        color: 'Blonde #613',
        curlStyle: 'Straight',
        images: [],
        imagePreviews: ['https://placehold.co/600x400'],
      },
    ],
    quotes: [
      {
        rfqId: 'rfq-002',
        productId: 'prod-002',
        purchaserId: '3',
        price: 150.0,
        deliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        quoteTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];
