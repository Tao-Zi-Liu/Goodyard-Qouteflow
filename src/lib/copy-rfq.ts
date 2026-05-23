import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { RFQ, ProductSeries, CustomerGroup } from './types';

// 与 product-row.tsx / rfq/new/page.tsx 保持一致的 WLID 前缀映射
// 第一维:产品系列;第二维:客户分组
// Class B 客户对部分产品系列使用独立前缀,序号空间也独立
const wlidPrefixMap: Record<ProductSeries, Record<CustomerGroup, string>> = {
  Wig:                 { standard: 'FTCV',  classB: 'FWCVS' },
  'Hair Extension':    { standard: 'FTCE',  classB: 'FTCE'  },
  Topper:              { standard: 'FTCP',  classB: 'FTCPS' },
  Toupee:              { standard: 'FTCU',  classB: 'FTCU'  },
  'Synthetic Product': { standard: 'FTCS',  classB: 'FTCS'  },
  'Hair Patch':        { standard: 'FTCP',  classB: 'FTCPS' },  // 跟 Topper 共用号段
};

// 与 product-row.tsx 保持一致的 WLID 起始值
// 含义:lastUsed,下一个新单 = +1
// 例如 Wig standard 起始 937 表示下一个新单是 FTCV0938
const wlidStartMap: Record<ProductSeries, Partial<Record<CustomerGroup, number>>> = {
  Wig:                 { standard: 937,  classB: 0    },   // standard: FTCV0938 起;classB: FWCVS0001 起
  'Hair Extension':    {},
  Topper:              { standard: 1770, classB: 217  },   // standard: FTCP1771 起;classB: FTCPS0218 起
  Toupee:              {},
  'Synthetic Product': {},
  'Hair Patch':        { standard: 1770, classB: 217  },   // 跟 Topper 共用
};

/**
 * Copies an existing RFQ, resetting status/quotes/assignments,
 * and returns the new document ID.
 *
 * WLID 生成规则:
 *   - 按 (productSeries, customerGroup) 二维查前缀
 *   - 复制后的 RFQ 继承原 RFQ 的 customerGroup
 *   - 扫描时严格匹配 "前缀 + 纯数字",避免 FTCP 误吃 FTCPS 号段
 */
export async function copyRfq(
  original: RFQ,
  creatorId: string
): Promise<string> {
  // 1. Generate new RFQ code based on current total count
  const snapshot = await getDocs(collection(db, 'rfqs'));
  const newCode = `RFQ-${String(snapshot.size + 1).padStart(4, '0')}`;

  // 决定新 RFQ 走哪套客户分组(继承原 RFQ,缺省 standard)
  const targetCustomerGroup: CustomerGroup = original.customerGroup ?? 'standard';

  // 2. 预先扫描所有 RFQ,计算每个 WLID 前缀的最大 suffix
  // 关键:把所有可能用到的前缀去重收集,按长度从长到短排序(避免短前缀误匹配长前缀)
  const allPrefixesByLength = [
    ...new Set(
      Object.values(wlidPrefixMap).flatMap(group => Object.values(group))
    ),
  ].sort((a, b) => b.length - a.length);

  const maxSuffixByPrefix: Record<string, number> = {};
  snapshot.forEach((docSnap) => {
    const rfqData = docSnap.data() as RFQ;
    if (!rfqData.products) return;
    rfqData.products.forEach((product) => {
      if (!product.wlid) return;
      for (const prefix of allPrefixesByLength) {
        if (product.wlid.startsWith(prefix)) {
          const after = product.wlid.substring(prefix.length);
          // 严格:prefix 后必须是纯数字。避免 FTCP 匹配上 FTCPS0218 (after='S0218')
          if (!/^\d+$/.test(after)) continue;
          const suffix = parseInt(after, 10);
          if (!isNaN(suffix)) {
            if (!maxSuffixByPrefix[prefix] || suffix > maxSuffixByPrefix[prefix]) {
              maxSuffixByPrefix[prefix] = suffix;
            }
          }
          break; // 一个 WLID 只匹配最长那个前缀
        }
      }
    });
  });

  // 3. Deep-copy products:
  //    - 分配新的 product id(避免冲突)
  //    - 根据 productSeries + customerGroup 重新生成 WLID
  const newProducts = original.products.map((p) => {
    let newWlid = p.wlid; // 默认保留(兜底:老数据缺 productSeries 时)

    const series = p.productSeries as ProductSeries | undefined;
    if (series && wlidPrefixMap[series]) {
      const prefix = wlidPrefixMap[series][targetCustomerGroup];
      const minSuffix = wlidStartMap[series]?.[targetCustomerGroup] ?? 0;
      const currentMax = maxSuffixByPrefix[prefix] ?? 0;
      const nextSuffix = Math.max(currentMax, minSuffix) + 1;

      newWlid = `${prefix}${String(nextSuffix).padStart(4, '0')}`;
      // 更新本地计数器,保证同一次复制的多个同系列产品不会拿到同样的 suffix
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
    customerGroup: targetCustomerGroup,  // 显式继承原 RFQ 的分组
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
