import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { RFQ, ProductSeries } from './types';

// 与 product-row.tsx / rfq/new/page.tsx 保持一致的 WLID 前缀映射
const wlidPrefixMap: Record<ProductSeries, string> = {
  Wig: 'FTCV',
  'Hair Extension': 'FTCE',
  Topper: 'FTCP',
  Toupee: 'FTCU',
  'Synthetic Product': 'FTCS',
  'Hair Patch': 'FTCP',
};

// 与 product-row.tsx 保持一致的 WLID 起始值
const wlidStartMap: Partial<Record<ProductSeries, number>> = {
  Wig: 937,     // 新单从 FTCV0938 开始
  Topper: 1770, // 新单从 FTCP1771 开始
};

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

  // 2. 预先扫描所有 RFQ，计算每个 WLID 前缀的最大 suffix
  const maxSuffixByPrefix: Record<string, number> = {};
  snapshot.forEach((docSnap) => {
    const rfqData = docSnap.data() as RFQ;
    if (!rfqData.products) return;
    rfqData.products.forEach((product) => {
      if (!product.wlid) return;
      for (const prefix of Object.values(wlidPrefixMap)) {
        if (product.wlid.startsWith(prefix)) {
          const suffix = parseInt(product.wlid.substring(prefix.length), 10);
          if (!isNaN(suffix)) {
            if (!maxSuffixByPrefix[prefix] || suffix > maxSuffixByPrefix[prefix]) {
              maxSuffixByPrefix[prefix] = suffix;
            }
          }
          break; // 一个 WLID 只匹配一个前缀
        }
      }
    });
  });

  // 3. Deep-copy products:
  //    - 分配新的 product id（避免冲突）
  //    - 根据 productSeries 重新生成 WLID（自增，不复用原 WLID）
  const newProducts = original.products.map((p) => {
    let newWlid = p.wlid; // 默认保留（兜底：老数据缺 productSeries 时）

    if (p.productSeries && wlidPrefixMap[p.productSeries as ProductSeries]) {
      const prefix = wlidPrefixMap[p.productSeries as ProductSeries];
      const minSuffix = wlidStartMap[p.productSeries as ProductSeries] ?? 0;
      const currentMax = maxSuffixByPrefix[prefix] ?? 0;
      const nextSuffix = Math.max(currentMax, minSuffix) + 1;

      newWlid = `${prefix}${String(nextSuffix).padStart(4, '0')}`;
      // 更新本地计数器，保证同一次复制的多个同系列产品不会拿到同样的 suffix
      maxSuffixByPrefix[prefix] = nextSuffix;
    }

    return {
      ...p,
      id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      wlid: newWlid,
    };
  });

  // 4. Build new RFQ payload — copy customer info & products, reset everything else
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