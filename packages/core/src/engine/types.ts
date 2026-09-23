export interface DailySalesPoint {
  date: string;
  unitsSold: number;
}

export interface DrrWeights {
  trailing7Days: number;
  trailing14Days: number;
  trailing30Days: number;
}

export interface RollingDrrMetrics {
  trailing7Days: number;
  trailing14Days: number;
  trailing30Days: number;
  weightedBaseDrr: number;
  eventMultiplier: number;
  dynamicDrr: number;
  trendPercent: number | null;
}

export interface LeadTimeMetrics {
  actualAverageLeadTimeDays: number;
  leadTimeStandardDeviationDays: number;
}

export type EvmActionStatus = 'REORDER NOW' | 'OK';
export type InventoryRiskFlag = 'STOCKOUT_RISK' | 'BALANCED' | 'CAPITAL_SURPLUS';
export type MslChangeAction = 'INCREASE' | 'DECREASE' | 'KEEP';

export interface StaticMslResult {
  minimumStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  actionStatus: EvmActionStatus;
}

export interface DynamicMslInput {
  sku: string;
  dailySales: readonly DailySalesPoint[];
  asOfDate: string;
  eventMultiplier: number;
  leadTimeSamples: readonly number[];
  serviceLevelZ?: number;
  weights?: DrrWeights;
  currentStock: number;
  openPurchaseOrders: number;
  inTransitStock: number;
  minimumOrderQuantity: number;
  currentMinimumStockLevel: number;
  provenance: {
    planningFields: 'observed' | 'imported';
    salesHistory: 'simulated' | 'imported';
    leadTimeHistory: 'simulated' | 'imported';
  };
}

export interface DynamicMslRecommendation {
  sku: string;
  recommendedMinimumStockLevel: number;
  reorderLevel: number;
  netStockPosition: number;
  action: MslChangeAction;
  riskFlag: InventoryRiskFlag;
  rationale: string;
  drr: RollingDrrMetrics;
  safetyStock: number;
  demandStandardDeviation: number;
  leadTime: LeadTimeMetrics;
  provenance: DynamicMslInput['provenance'];
}
