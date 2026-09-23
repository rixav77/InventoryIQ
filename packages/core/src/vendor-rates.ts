import { assertFiniteNonNegative, assertFinitePositive } from './engine/statistics.js';

export type ConcentrationRisk = 'LOW' | 'MODERATE' | 'HIGH';
export type AllocationRecommendation = 'RECOMMENDED' | 'ALTERNATIVE' | 'RISK_MITIGATION';

export interface ProcurementPricePoint {
  sku: string;
  vendorCode: string;
  vendorName: string;
  poDate: string;
  unitPrice: number;
  quantity: number;
}

export interface VendorRateSummary {
  vendorCode: string;
  vendorName: string;
  latestUnitPrice: number;
  latestPoDate: string;
  averageUnitPrice: number;
  totalQuantity: number;
  priceTrendPercent: number | null;
}

export interface VendorRateComparison {
  sku: string;
  bestVendorCode: string;
  lowestUnitPrice: number;
  highestUnitPrice: number;
  averageUnitPrice: number;
  spreadPercent: number;
  vendors: readonly VendorRateSummary[];
  alerts: readonly string[];
}

export interface VendorAllocation {
  vendorCode: string;
  quantity: number;
}

export interface VendorShareSummary {
  vendorCode: string;
  quantity: number;
  sharePercent: number;
}

export interface ConcentrationAnalysis {
  sku: string;
  totalQuantity: number;
  shares: readonly VendorShareSummary[];
  primaryVendorCode: string;
  primarySharePercent: number;
  riskLevel: ConcentrationRisk;
}

export interface VendorQuote {
  vendorCode: string;
  vendorName: string;
  unitPrice: number;
  leadTimeDays: number;
  otifPercent: number;
}

export interface VendorAllocationOption {
  label: string;
  vendorCode: string | null;
  quantity: number;
  averageUnitPrice: number;
  totalCost: number;
  leadTimeDays: number | null;
  recommendation: AllocationRecommendation;
}

export const PRICE_SPREAD_ALERT_PERCENT = 10;
export const PRICE_INCREASE_ALERT_PERCENT = 5;

function assertPricePoint(point: ProcurementPricePoint): void {
  if (point.sku.trim() === '') {
    throw new Error('Procurement price point sku must not be empty.');
  }
  if (point.vendorCode.trim() === '') {
    throw new Error('Procurement price point vendorCode must not be empty.');
  }
  assertFinitePositive(point.unitPrice, 'unitPrice');
  assertFiniteNonNegative(point.quantity, 'quantity');
}

function summarizeVendor(
  vendorCode: string,
  entries: readonly ProcurementPricePoint[],
): VendorRateSummary {
  const sorted = [...entries].sort((a, b) => a.poDate.localeCompare(b.poDate));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first === undefined || last === undefined) {
    throw new Error(`No price points for vendor ${vendorCode}.`);
  }
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const averageUnitPrice =
    totalQuantity === 0
      ? last.unitPrice
      : entries.reduce((sum, entry) => sum + entry.unitPrice * entry.quantity, 0) / totalQuantity;

  return {
    vendorCode,
    vendorName: last.vendorName,
    latestUnitPrice: last.unitPrice,
    latestPoDate: last.poDate,
    averageUnitPrice,
    totalQuantity,
    priceTrendPercent:
      sorted.length < 2 ? null : ((last.unitPrice - first.unitPrice) / first.unitPrice) * 100,
  };
}

export function compareVendorRates(
  sku: string,
  points: readonly ProcurementPricePoint[],
): VendorRateComparison {
  const relevant = points.filter((point) => point.sku === sku);
  if (relevant.length === 0) {
    throw new Error(`No procurement price points for ${sku}.`);
  }
  relevant.forEach(assertPricePoint);

  const byVendor = new Map<string, ProcurementPricePoint[]>();
  for (const point of relevant) {
    const bucket = byVendor.get(point.vendorCode);
    if (bucket === undefined) {
      byVendor.set(point.vendorCode, [point]);
    } else {
      bucket.push(point);
    }
  }

  const vendors = [...byVendor.entries()]
    .map(([vendorCode, entries]) => summarizeVendor(vendorCode, entries))
    .sort((a, b) => a.latestUnitPrice - b.latestUnitPrice);

  const prices = relevant.map((point) => point.unitPrice);
  const lowestUnitPrice = Math.min(...prices);
  const highestUnitPrice = Math.max(...prices);
  const totalQuantity = relevant.reduce((sum, point) => sum + point.quantity, 0);
  const averageUnitPrice =
    totalQuantity === 0
      ? lowestUnitPrice
      : relevant.reduce((sum, point) => sum + point.unitPrice * point.quantity, 0) / totalQuantity;
  const spreadPercent = ((highestUnitPrice - lowestUnitPrice) / lowestUnitPrice) * 100;
  const best = relevant.find((point) => point.unitPrice === lowestUnitPrice);
  const alerts: string[] = [];

  if (spreadPercent > PRICE_SPREAD_ALERT_PERCENT) {
    alerts.push(
      `Price disparity ${spreadPercent.toFixed(1)}% across vendors for ${sku} — investigate.`,
    );
  }
  for (const vendor of vendors) {
    if (vendor.priceTrendPercent !== null && vendor.priceTrendPercent > PRICE_INCREASE_ALERT_PERCENT) {
      alerts.push(
        `Price increase ${vendor.priceTrendPercent.toFixed(1)}% for ${vendor.vendorName}.`,
      );
    }
  }

  return {
    sku,
    bestVendorCode: best?.vendorCode ?? vendors[0]?.vendorCode ?? '',
    lowestUnitPrice,
    highestUnitPrice,
    averageUnitPrice,
    spreadPercent,
    vendors,
    alerts,
  };
}

export function analyzeVendorConcentration(
  sku: string,
  allocations: readonly VendorAllocation[],
): ConcentrationAnalysis {
  if (allocations.length === 0) {
    throw new Error(`No allocations supplied for ${sku}.`);
  }
  const byVendor = new Map<string, number>();
  let totalQuantity = 0;
  for (const allocation of allocations) {
    if (allocation.vendorCode.trim() === '') {
      throw new Error('Vendor allocation vendorCode must not be empty.');
    }
    assertFiniteNonNegative(allocation.quantity, 'quantity');
    byVendor.set(allocation.vendorCode, (byVendor.get(allocation.vendorCode) ?? 0) + allocation.quantity);
    totalQuantity += allocation.quantity;
  }
  if (totalQuantity <= 0) {
    throw new Error(`Total allocation quantity for ${sku} must be positive.`);
  }

  const shares = [...byVendor.entries()]
    .map(([vendorCode, quantity]) => ({
      vendorCode,
      quantity,
      sharePercent: (quantity / totalQuantity) * 100,
    }))
    .sort((a, b) => b.sharePercent - a.sharePercent);
  const primary = shares[0];
  if (primary === undefined) {
    throw new Error(`Unable to determine primary vendor for ${sku}.`);
  }
  const riskLevel: ConcentrationRisk =
    primary.sharePercent > 80 ? 'HIGH' : primary.sharePercent >= 60 ? 'MODERATE' : 'LOW';

  return {
    sku,
    totalQuantity,
    shares,
    primaryVendorCode: primary.vendorCode,
    primarySharePercent: primary.sharePercent,
    riskLevel,
  };
}

export function suggestVendorAllocation(
  sku: string,
  quantity: number,
  quotes: readonly VendorQuote[],
): readonly VendorAllocationOption[] {
  if (quotes.length === 0) {
    throw new Error(`No vendor quotes supplied for ${sku}.`);
  }
  assertFinitePositive(quantity, 'quantity');
  for (const quote of quotes) {
    assertFinitePositive(quote.unitPrice, 'quote.unitPrice');
    assertFiniteNonNegative(quote.leadTimeDays, 'quote.leadTimeDays');
    assertFiniteNonNegative(quote.otifPercent, 'quote.otifPercent');
  }

  const ranked = [...quotes].sort((a, b) => a.unitPrice - b.unitPrice);
  const options: VendorAllocationOption[] = ranked.map((quote, index) => ({
    label: quote.vendorName,
    vendorCode: quote.vendorCode,
    quantity,
    averageUnitPrice: quote.unitPrice,
    totalCost: quote.unitPrice * quantity,
    leadTimeDays: quote.leadTimeDays,
    recommendation: index === 0 ? 'RECOMMENDED' : 'ALTERNATIVE',
  }));

  if (ranked.length >= 2) {
    const cheapest = ranked[0];
    const dearest = ranked[ranked.length - 1];
    if (cheapest !== undefined && dearest !== undefined) {
      const firstHalf = Math.floor(quantity / 2);
      const secondHalf = quantity - firstHalf;
      const averageUnitPrice =
        (cheapest.unitPrice * firstHalf + dearest.unitPrice * secondHalf) / quantity;
      options.push({
        label: `Split ${cheapest.vendorName} / ${dearest.vendorName}`,
        vendorCode: null,
        quantity,
        averageUnitPrice,
        totalCost: averageUnitPrice * quantity,
        leadTimeDays: null,
        recommendation: 'RISK_MITIGATION',
      });
    }
  }

  return options;
}
