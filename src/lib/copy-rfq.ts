import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { RFQ } from './types';

/**
 * Copies an existing RFQ, resetting status/quotes/assignments,
 * and returns the new document ID.
 */
export async function copyRfq(
  original: RFQ,
  creatorId: string
): Promise<string> {
  // 1. Generate new RFQ code based on current total count
  const snapshot = await getDocs(collection(db, 'rfqs'));
  const newCode = `RFQ-${String(snapshot.size + 1).padStart(4, '0')}`;

  // 2. Deep-copy products, give each a fresh id to avoid collisions
  const newProducts = original.products.map((p) => ({
    ...p,
    id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }));

  // 3. Build new RFQ payload — copy customer info & products, reset everything else
  const newRfqData = {
    rfqCode: newCode,
    customerType: original.customerType,
    customerEmail: original.customerEmail,
    products: newProducts,
    // ── reset fields ──
    status: 'Waiting for Quote',
    assignedPurchaserIds: [],
    quotes: [],
    actionHistory: [],
    // ── meta ──
    creatorId,
    inquiryTime: serverTimestamp(),
    lastUpdatedTime: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'rfqs'), newRfqData);
  return docRef.id;
}
