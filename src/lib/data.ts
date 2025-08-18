// src/lib/data.ts
import type { User, RFQ } from './types';

// Production: Empty test data - real data comes from Firestore
export const MOCK_USERS: User[] = [];
export const MOCK_RFQS: RFQ[] = [];

// If you need any reference data for development, you can add it here:
// export const REFERENCE_DATA = {
//   productSeries: ['Wig', 'Hair Extension', 'Topper', 'Toupee', 'Synthetic Product'],
//   wlidPrefixes: {
//     'Wig': 'FTCV',
//     'Hair Extension': 'FTCE', 
//     'Topper': 'FTCP',
//     'Toupee': 'FTCU',
//     'Synthetic Product': 'FTCS',
//   }
// };