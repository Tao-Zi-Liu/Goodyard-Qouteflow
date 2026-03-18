// Currency conversion utilities
export const USD_TO_RMB_RATE = 7.25;

/**
 * Convert RMB to USD (Sales Cost Price USD)
 */
export function convertRMBToUSD(rmbAmount: number): number {
  return Math.round((rmbAmount / USD_TO_RMB_RATE) * 100) / 100;
}

/**
 * Calculate Customized Product Price in USD
 * Formula: (RMB ÷ 2.88 + 40) × 1.075 + 40
 */
export function calculateCustomizedPrice(rmbAmount: number): number {
  const result = (rmbAmount / 2.88 + 40) * 1.075 + 40;
  return Math.round(result * 100) / 100;
}

/**
 * Convert USD to RMB
 */
export function convertUSDToRMB(usdAmount: number): number {
  return Math.round((usdAmount * USD_TO_RMB_RATE) * 100) / 100;
}

/**
 * Format RMB amount with currency symbol
 */
export function formatRMB(amount: number): string {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format USD amount with currency symbol
 */
export function formatUSD(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}