import { assertFiniteNonNegative, assertFinitePositive } from './engine/statistics.js';

export type VendorTier = 'PREFERRED' | 'ACCEPTABLE' | 'NEEDS_IMPROVEMENT';

export const VENDOR_SCORE_WEIGHTS = {
  otif: 0.3,
  priceCompetitiveness: 0.25,
  leadTimeReliability: 0.2,
  quality: 0.15,
  responsiveness: 0.1,
} as const;

export interface VendorPerformanceInput {
  vendorCode: string;
  vendorName: string;
  totalPurchaseOrders: number;
  onTimeInFullPurchaseOrders: number;
  averageLeadTimeDays: number;
  leadTimeStandardDeviationDays: number;
  qualityScore: number;
  responsivenessScore: number;
  priceCompetitiveness: number;
}

export interface VendorScorecard {
  vendorCode: string;
  vendorName: string;
  otifPercent: number;
  leadTimeReliability: number;
  quality: number;
  responsiveness: number;
  priceCompetitiveness: number;
  overallScore: number;
  tier: VendorTier;
}

function assertUnitInterval(value: number, name: string): void {
  assertFiniteNonNegative(value, name);
  if (value > 1) {
    throw new Error(`${name} must be a decimal score between 0 and 1.`);
  }
}

function assertPercentage(value: number, name: string): void {
  assertFiniteNonNegative(value, name);
  if (value > 100) {
    throw new Error(`${name} must be a percentage between 0 and 100.`);
  }
}

export function calculateOtifPercent(
  onTimeInFullPurchaseOrders: number,
  totalPurchaseOrders: number,
): number {
  assertFiniteNonNegative(onTimeInFullPurchaseOrders, 'onTimeInFullPurchaseOrders');
  assertFinitePositive(totalPurchaseOrders, 'totalPurchaseOrders');
  if (onTimeInFullPurchaseOrders > totalPurchaseOrders) {
    throw new Error('onTimeInFullPurchaseOrders cannot exceed totalPurchaseOrders.');
  }
  return (onTimeInFullPurchaseOrders / totalPurchaseOrders) * 100;
}

export function calculateLeadTimeReliability(
  averageLeadTimeDays: number,
  leadTimeStandardDeviationDays: number,
): number {
  assertFinitePositive(averageLeadTimeDays, 'averageLeadTimeDays');
  assertFiniteNonNegative(leadTimeStandardDeviationDays, 'leadTimeStandardDeviationDays');
  const reliability = 1 - leadTimeStandardDeviationDays / averageLeadTimeDays;
  return Math.min(Math.max(reliability, 0), 1);
}

export function classifyVendorTier(overallScore: number): VendorTier {
  assertFiniteNonNegative(overallScore, 'overallScore');
  if (overallScore >= 85) {
    return 'PREFERRED';
  }
  return overallScore >= 70 ? 'ACCEPTABLE' : 'NEEDS_IMPROVEMENT';
}

export function scoreVendor(input: VendorPerformanceInput): VendorScorecard {
  if (input.vendorCode.trim() === '' || input.vendorName.trim() === '') {
    throw new Error('vendorCode and vendorName must not be empty.');
  }
  const otifPercent = calculateOtifPercent(
    input.onTimeInFullPurchaseOrders,
    input.totalPurchaseOrders,
  );
  const leadTimeReliability = calculateLeadTimeReliability(
    input.averageLeadTimeDays,
    input.leadTimeStandardDeviationDays,
  );
  assertUnitInterval(input.qualityScore, 'qualityScore');
  assertUnitInterval(input.responsivenessScore, 'responsivenessScore');
  assertPercentage(input.priceCompetitiveness, 'priceCompetitiveness');

  const overallScore =
    VENDOR_SCORE_WEIGHTS.otif * otifPercent +
    VENDOR_SCORE_WEIGHTS.priceCompetitiveness * input.priceCompetitiveness +
    VENDOR_SCORE_WEIGHTS.leadTimeReliability * leadTimeReliability * 100 +
    VENDOR_SCORE_WEIGHTS.quality * input.qualityScore * 100 +
    VENDOR_SCORE_WEIGHTS.responsiveness * input.responsivenessScore * 100;

  return {
    vendorCode: input.vendorCode,
    vendorName: input.vendorName,
    otifPercent,
    leadTimeReliability,
    quality: input.qualityScore,
    responsiveness: input.responsivenessScore,
    priceCompetitiveness: input.priceCompetitiveness,
    overallScore,
    tier: classifyVendorTier(overallScore),
  };
}

export function rankVendors(
  inputs: readonly VendorPerformanceInput[],
): readonly VendorScorecard[] {
  return inputs.map(scoreVendor).sort((a, b) => b.overallScore - a.overallScore);
}
