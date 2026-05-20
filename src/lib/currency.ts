// Currency conversion utilities
import type { CustomerGroup } from './types';

export const USD_TO_RMB_RATE = 7.25;

/**
 * Convert RMB to USD (Sales Cost Price USD)
 */
export function convertRMBToUSD(rmbAmount: number): number {
  return Math.round((rmbAmount / USD_TO_RMB_RATE) * 100) / 100;
}

/**
 * Sale price formulas keyed by customer group.
 * Add new groups here without touching any caller of calculateCustomizedPrice.
 */
type PriceFormula = (rmbAmount: number) => number;

const PRICE_FORMULAS: Record<CustomerGroup, PriceFormula> = {
  // Standard customer: (RMB ÷ 2.88 + 40) × 1.075 + 40
  standard: (rmb) => (rmb / 2.88 + 40) * 1.075 + 40,

  // Class B customer (VIP / wholesale / long-term partner):
  //   RMB ÷ 0.6 ÷ 6 + 40  (equivalent to RMB ÷ 3.6 + 40)
  classB: (rmb) => rmb / 0.6 / 6 + 40,
};

/**
 * Calculate Customized Product Price in USD.
 *
 * @param rmbAmount Raw RMB cost from purchasing.
 * @param customerGroup Optional customer group; defaults to 'standard'
 *                      for backward compatibility with legacy RFQs that
 *                      do not have this field set.
 */
export function calculateCustomizedPrice(
  rmbAmount: number,
  customerGroup?: CustomerGroup
): number {
  const formula = PRICE_FORMULAS[customerGroup ?? 'standard'];
  const result = formula(rmbAmount);
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
