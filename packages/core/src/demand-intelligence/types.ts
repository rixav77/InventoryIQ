export type DataProvenance = 'observed' | 'imported' | 'simulated';
export type SalesChannel = 'amazon' | 'flipkart' | 'd2c';
export type DemandTrend = 'RISING' | 'FALLING' | 'STABLE';
export type DemandVolatility = 'PREDICTABLE' | 'MODERATE' | 'ERRATIC';
export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z';
export type CombinedClass = `${AbcClass}${XyzClass}`;

export interface ChannelDailySalesPoint {
  date: string;
  unitsSold: number;
  unitsReturned: number;
  grossRevenue: number;
}

export interface DemandProfileMetrics {
  drr7: number;
  drr14: number;
  drr30: number;
  drr90: number;
  trendPercent: number | null;
  trend: DemandTrend;
  demandCoefficientOfVariation: number | null;
  volatility: DemandVolatility;
}

export interface RevenuePortfolioItem {
  sku: string;
  revenue: number;
  dailyDemand: readonly number[];
}

export interface AbcClassification {
  sku: string;
  abcClass: AbcClass;
  revenue: number;
  revenueShare: number;
  cumulativeRevenueShare: number;
}

export interface ServiceLevelPolicy {
  serviceLevelTarget: number;
  zScore: number;
}

export interface AbcXyzClassification extends AbcClassification, ServiceLevelPolicy {
  xyzClass: XyzClass;
  combinedClass: CombinedClass;
  demandMean: number;
  demandStandardDeviation: number;
  demandCoefficientOfVariation: number | null;
}

export interface NetDemandMetrics {
  grossDrr: number;
  returnRate7: number;
  returnRate30: number;
  returnRateTrendPercent: number | null;
  netDrr: number;
  anomaly: boolean;
}

export interface MonthlyDemandPoint {
  year: number;
  month: number;
  units: number;
}

export interface SeasonalIndex {
  month: number;
  index: number;
  averageUnits: number;
}

export interface SeasonalityResult {
  indices: readonly SeasonalIndex[];
  strongestMonth: number;
  weakestMonth: number;
  provenance: DataProvenance;
}
