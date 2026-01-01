import { Decimal } from '@prisma/client/runtime/library';

/**
 * Calculate transaction cost, sale, and profit
 * 
 * Formulas:
 * - Cost = USD used × Buy Rate (USD→MVR)
 * - Sale = USDT received × Sell Rate (USDT→MVR)
 * - Profit = Sale - Cost
 */
export interface CalculationInput {
  usdUsed: number;
  usdtReceived: number;
  buyRate: number;
  sellRate: number;
}

export interface CalculationResult {
  cost: Decimal;
  sale: Decimal;
  profit: Decimal;
}

export function calculateTransaction(input: CalculationInput): CalculationResult {
  const { usdUsed, usdtReceived, buyRate, sellRate } = input;
  
  // Cost = USD used × Buy Rate
  const cost = new Decimal(usdUsed).mul(buyRate);
  
  // Sale = USDT received × Sell Rate
  const sale = new Decimal(usdtReceived).mul(sellRate);
  
  // Profit = Sale - Cost
  const profit = sale.sub(cost);
  
  return {
    cost: cost.toDecimalPlaces(2),
    sale: sale.toDecimalPlaces(2),
    profit: profit.toDecimalPlaces(2),
  };
}

/**
 * Calculate partner profit share
 */
export function calculatePartnerShare(totalProfit: number, profitSplitPercent: number): number {
  return Number(new Decimal(totalProfit).mul(profitSplitPercent).div(100).toDecimalPlaces(2));
}

/**
 * Get start and end of month
 */
export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Get start and end of year
 */
export function getYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1);
  const end = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Format date for grouping
 */
export function formatMonthYear(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Parse decimal safely
 */
export function toNumber(value: Decimal | number | string): number {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  return Number(value);
}
