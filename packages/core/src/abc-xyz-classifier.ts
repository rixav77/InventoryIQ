import {
  assertFiniteNonNegative,
  mean,
  populationStandardDeviation,
} from './engine/statistics.js';
import {
  XYZ_MODERATE_MAX_CV,
  XYZ_PREDICTABLE_MAX_CV,
} from './demand-intelligence/demand-profile.js';
import type {
  AbcClassification,
  AbcClass,
  AbcXyzClassification,
  CombinedClass,
  RevenuePortfolioItem,
  ServiceLevelPolicy,
  XyzClass,
} from './demand-intelligence/types.js';

export const ABC_TOP_REVENUE_SHARE = 0.8;
export const ABC_MID_REVENUE_SHARE = 0.95;

const SERVICE_POLICIES: Readonly<Record<CombinedClass, ServiceLevelPolicy>> = {
  AX: { serviceLevelTarget: 0.99, zScore: 2.33 },
  AY: { serviceLevelTarget: 0.97, zScore: 1.88 },
  AZ: { serviceLevelTarget: 0.95, zScore: 1.65 },
  BX: { serviceLevelTarget: 0.95, zScore: 1.65 },
  BY: { serviceLevelTarget: 0.95, zScore: 1.65 },
  BZ: { serviceLevelTarget: 0.95, zScore: 1.65 },
  CX: { serviceLevelTarget: 0.9, zScore: 1.28 },
  CY: { serviceLevelTarget: 0.9, zScore: 1.28 },
  CZ: { serviceLevelTarget: 0.9, zScore: 1.28 },
};

function validatePortfolio(items: readonly RevenuePortfolioItem[]): void {
  if (items.length === 0) {
    throw new Error('At least one portfolio item is required.');
  }
  const skus = new Set<string>();
  for (const item of items) {
    if (item.sku.trim().length === 0) {
      throw new Error('Portfolio SKU must not be empty.');
    }
    if (skus.has(item.sku)) {
      throw new Error(`Duplicate portfolio SKU: ${item.sku}`);
    }
    skus.add(item.sku);
    assertFiniteNonNegative(item.revenue, `revenue for ${item.sku}`);
    if (item.dailyDemand.length === 0) {
      throw new Error(`Daily demand is required for ${item.sku}.`);
    }
    item.dailyDemand.forEach((value, index) =>
      assertFiniteNonNegative(value, `dailyDemand[${index}] for ${item.sku}`),
    );
  }
}

function abcClassForCumulativeShare(cumulativeShare: number): AbcClass {
  if (cumulativeShare <= ABC_TOP_REVENUE_SHARE) {
    return 'A';
  }
  return cumulativeShare <= ABC_MID_REVENUE_SHARE ? 'B' : 'C';
}

export function classifyAbcPortfolio(
  items: readonly RevenuePortfolioItem[],
): AbcClassification[] {
  validatePortfolio(items);
  const totalRevenue = items.reduce((sum, item) => sum + item.revenue, 0);
  if (totalRevenue === 0) {
    throw new Error('Portfolio total revenue must be greater than zero.');
  }

  const sorted = [...items].sort(
    (left, right) => right.revenue - left.revenue || left.sku.localeCompare(right.sku),
  );
  let cumulativeRevenue = 0;

  return sorted.map((item) => {
    cumulativeRevenue += item.revenue;
    const revenueShare = item.revenue / totalRevenue;
    const cumulativeRevenueShare = cumulativeRevenue / totalRevenue;
    return {
      sku: item.sku,
      abcClass: abcClassForCumulativeShare(cumulativeRevenueShare),
      revenue: item.revenue,
      revenueShare,
      cumulativeRevenueShare,
    };
  });
}

export function calculateDemandCoefficientOfVariation(
  dailyDemand: readonly number[],
): number | null {
  if (dailyDemand.length === 0) {
    throw new Error('At least one daily demand value is required.');
  }
  const demandMean = mean(dailyDemand);
  return demandMean === 0 ? null : populationStandardDeviation(dailyDemand) / demandMean;
}

export function classifyXyz(coefficientOfVariation: number | null): XyzClass {
  if (coefficientOfVariation === null) {
    return 'Z';
  }
  assertFiniteNonNegative(coefficientOfVariation, 'coefficientOfVariation');
  if (coefficientOfVariation <= XYZ_PREDICTABLE_MAX_CV) {
    return 'X';
  }
  return coefficientOfVariation <= XYZ_MODERATE_MAX_CV ? 'Y' : 'Z';
}

export function getClassServicePolicy(combinedClass: CombinedClass): ServiceLevelPolicy {
  return SERVICE_POLICIES[combinedClass];
}

export function classifyAbcXyzPortfolio(
  items: readonly RevenuePortfolioItem[],
): AbcXyzClassification[] {
  const abcBySku = new Map(
    classifyAbcPortfolio(items).map((classification) => [classification.sku, classification]),
  );

  return items
    .map((item) => {
      const abc = abcBySku.get(item.sku);
      if (abc === undefined) {
        throw new Error(`Missing ABC classification for ${item.sku}.`);
      }
      const demandMean = mean(item.dailyDemand);
      const demandStandardDeviation = populationStandardDeviation(item.dailyDemand);
      const demandCoefficientOfVariation =
        demandMean === 0 ? null : demandStandardDeviation / demandMean;
      const xyzClass = classifyXyz(demandCoefficientOfVariation);
      const combinedClass = `${abc.abcClass}${xyzClass}` as CombinedClass;
      const policy = getClassServicePolicy(combinedClass);

      return {
        ...abc,
        xyzClass,
        combinedClass,
        demandMean,
        demandStandardDeviation,
        demandCoefficientOfVariation,
        ...policy,
      };
    })
    .sort((left, right) => right.revenue - left.revenue || left.sku.localeCompare(right.sku));
}
