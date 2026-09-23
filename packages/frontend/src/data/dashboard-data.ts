import {
  EVM_SKU_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  WORKING_CAPITAL_SEEDS,
  calculateDemandProfile,
  calculateStaticMsl,
  detectSurplusStock,
  generateDynamicMslRecommendation,
  generateSimulatedSalesHistory,
  getSimulatedLeadTimeSamples,
} from '@inventoryiq/core';
import type { InventoryRiskFlag, MslChangeAction } from '@inventoryiq/core';

export type HealthBand = 'HEALTHY' | 'WATCH' | 'CRITICAL';

export interface DrrPoint {
  date: string;
  units: number;
}

export interface DashboardRow {
  sku: string;
  subcategory: string;
  currentStock: number;
  openPurchaseOrders: number;
  inTransitStock: number;
  monthlySellingPlan: number;
  procurementTimeDays: number;
  staticMsl: number;
  staticReorderLevel: number;
  dynamicMsl: number;
  deltaUnits: number;
  action: MslChangeAction;
  riskFlag: InventoryRiskFlag;
  band: HealthBand;
  drr30: number;
  trendPercent: number | null;
  safetyStock: number;
  averageProcurementPrice: number;
  surplusUnits: number;
  surplusCapital: number;
  rationale: string;
  sales: readonly DrrPoint[];
}

export function toHealthBand(riskFlag: InventoryRiskFlag): HealthBand {
  if (riskFlag === 'STOCKOUT_RISK') {
    return 'CRITICAL';
  }
  if (riskFlag === 'CAPITAL_SURPLUS') {
    return 'WATCH';
  }
  return 'HEALTHY';
}

export const DASHBOARD_ROWS: readonly DashboardRow[] = EVM_SKU_SEEDS.map((seed) => {
  const sales = generateSimulatedSalesHistory(seed);
  const staticResult = calculateStaticMsl({
    monthlySellingPlan: seed.monthlySellingPlan,
    procurementTimeDays: seed.procurementTimeDays,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
  });
  const recommendation = generateDynamicMslRecommendation({
    sku: seed.sku,
    dailySales: sales,
    asOfDate: PROTOTYPE_AS_OF_DATE,
    eventMultiplier: 1,
    leadTimeSamples: getSimulatedLeadTimeSamples(seed),
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentMinimumStockLevel: seed.observedMinimumStockLevel,
    provenance: {
      planningFields: 'observed',
      salesHistory: 'simulated',
      leadTimeHistory: 'simulated',
    },
  });
  const profile = calculateDemandProfile(sales, PROTOTYPE_AS_OF_DATE);
  const assumptions = WORKING_CAPITAL_SEEDS.find((entry) => entry.sku === seed.sku);
  const averageProcurementPrice = assumptions?.averageProcurementPrice ?? 0;
  const surplus = detectSurplusStock({
    sku: seed.sku,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    reorderLevel: staticResult.reorderLevel,
    drr30: profile.drr30,
  });

  return {
    sku: seed.sku,
    subcategory: seed.subcategory,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    monthlySellingPlan: seed.monthlySellingPlan,
    procurementTimeDays: seed.procurementTimeDays,
    staticMsl: staticResult.minimumStockLevel,
    staticReorderLevel: staticResult.reorderLevel,
    dynamicMsl: recommendation.recommendedMinimumStockLevel,
    deltaUnits: recommendation.recommendedMinimumStockLevel - staticResult.minimumStockLevel,
    action: recommendation.action,
    riskFlag: recommendation.riskFlag,
    band: toHealthBand(recommendation.riskFlag),
    drr30: profile.drr30,
    trendPercent: profile.trendPercent,
    safetyStock: recommendation.safetyStock,
    averageProcurementPrice,
    surplusUnits: surplus.surplusUnits,
    surplusCapital: surplus.surplusUnits * averageProcurementPrice,
    rationale: recommendation.rationale,
    sales: sales.map((point) => ({ date: point.date, units: point.unitsSold })),
  };
});

export interface PortfolioSummary {
  healthy: number;
  watch: number;
  critical: number;
  capitalInInventory: number;
  capitalInSurplus: number;
  pendingActions: number;
}

export const PORTFOLIO_SUMMARY: PortfolioSummary = {
  healthy: DASHBOARD_ROWS.filter((row) => row.band === 'HEALTHY').length,
  watch: DASHBOARD_ROWS.filter((row) => row.band === 'WATCH').length,
  critical: DASHBOARD_ROWS.filter((row) => row.band === 'CRITICAL').length,
  capitalInInventory: DASHBOARD_ROWS.reduce(
    (sum, row) => sum + row.currentStock * row.averageProcurementPrice,
    0,
  ),
  capitalInSurplus: DASHBOARD_ROWS.reduce((sum, row) => sum + row.surplusCapital, 0),
  pendingActions: DASHBOARD_ROWS.filter((row) => row.action !== 'KEEP').length,
};
