import * as XLSX from 'xlsx';
import type { RFQ, User } from './types';
import { formatRMB, formatUSD } from './currency';

/**
 * 把已完成 RFQ 列表展开为「每条已接受报价一行」的扁平结构,
 * 供财务对账用。
 */
export function exportFinanceReport(
  rfqs: RFQ[],
  users: User[],
  filename = `finance-report-${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const userMap = new Map(users.map(u => [u.id, u]));

  const rows: Record<string, string | number>[] = [];

  rfqs.forEach(rfq => {
    const creator = userMap.get(rfq.creatorId);
    rfq.products?.forEach(product => {
      const productQuotes = (rfq.quotes || []).filter(q => q.productId === product.id);
      const accepted = productQuotes.find(q => q.status === 'Accepted') || productQuotes[0];
      if (!accepted) return;
      const purchaser = userMap.get(accepted.purchaserId);
      rows.push({
        'RFQ Code': rfq.code || '',
        'Status': rfq.status || '',
        'Inquiry Time': typeof rfq.inquiryTime === 'string' ? rfq.inquiryTime : '',
        'Customer Email': rfq.customerEmail || '',
        'Customer Type': rfq.customerType || '',
        'Sales': creator?.name || '',
        'WLID': product.wlid || '',
        'SKU': product.sku || '',
        'Product Series': product.productSeries || '',
        'Quantity': product.quantity || 0,
        'Color': product.color || '',
        'Length': product.length || '',
        'Purchaser': purchaser?.name || '',
        'RMB Cost (¥)': accepted.salesCostPriceRMB ?? accepted.price ?? 0,
        'Cost USD ($)': accepted.salesCostPriceUSD ?? accepted.priceUSD ?? 0,
        'Sale Price USD ($)': accepted.customizedProductPriceUSD ?? 0,
        'Delivery Date': accepted.deliveryDate || '',
        'Quote Status': accepted.status || '',
        'Quote Time': accepted.quoteTime || '',
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-fit column width
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, 14),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Finance Report');
  XLSX.writeFile(wb, filename);
}