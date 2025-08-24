// Currency conversion utilities
export const USD_TO_RMB_RATE = 7.25;

/**
 * Convert RMB to USD
 * @param rmbAmount Amount in RMB
 * @returns Amount in USD rounded to 2 decimal places
 */
export function convertRMBToUSD(rmbAmount: number): number {
  return Math.round((rmbAmount / USD_TO_RMB_RATE) * 100) / 100;
}

/**
 * Convert USD to RMB
 * @param usdAmount Amount in USD
 * @returns Amount in RMB rounded to 2 decimal places
 */
export function convertUSDToRMB(usdAmount: number): number {
  return Math.round((usdAmount * USD_TO_RMB_RATE) * 100) / 100;
}

/**
 * Format RMB amount with currency symbol
 * @param amount Amount in RMB
 * @returns Formatted string like "¥1,234.56"
 */
export function formatRMB(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format USD amount with currency symbol
 * @param amount Amount in USD
 * @returns Formatted string like "$1,234.56"
 */
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}