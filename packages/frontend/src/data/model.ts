/*
 * InventoryIQ dashboard model.
 *
 * Every number rendered in the UI is derived here from the shared engine in
 * @inventoryiq/core. Nothing is hand-written into a component, so the dashboard
 * cannot drift from the verified chunk implementations.
 */

import {
  CHANNEL_DEMAND_SEEDS,
  EVM_SKU_SEEDS,
  EVM_SSD_MONTHLY_DEMAND,
  PROCUREMENT_PRICE_SEEDS,
  PROTOTYPE_AS_OF_DATE,
  REORDER_VENDOR_QUOTES,
  SIMULATED_MOQ_TRAP,
  SIMULATED_POWER_BANK_TRANSFER,
  VENDOR_PERFORMANCE_SEEDS,
  VENDOR_SEED_PROVENANCE,
  WAREHOUSE_DEMAND_SHARES,
  WAREHOUSE_STOCK_SEEDS,
  WORKING_CAPITAL_SEEDS,
  analyzeDeadStock,
  analyzeMoqTrap,
  analyzeVendorConcentration,
  analyzeWarehouseSurplusDeficit,
  calculateClassDrivenSafetyStock,
  calculateCapitalRisk,
  calculateDemandProfile,
  calculateDrrStability,
  calculateInventoryHealthScore,
  calculateMslCapitalImpact,
  calculateNetDemandMetrics,
  calculatePoPipelineAdequacy,
  calculateSeasonalIndices,
  calculateStaticMsl,
  calculateStockMslAlignment,
  classifyAbcXyzPortfolio,
  compareVendorRates,
  detectSurplusStock,
  generateAgingScenarioHistory,
  generateDynamicMslRecommendation,
  generateSimulatedSalesHistory,
  generateTransferRecommendations,
  getSimulatedLeadTimeSamples,
  listWarehouses,
  rankVendors,
  suggestVendorAllocation,
} from '@inventoryiq/core';
import type {
  AbcXyzClassification,
  ChannelDailySalesPoint,
  ConcentrationAnalysis,
  DailySalesPoint,
  DeadStockAnalysis,
  InventoryHealthBand,
  InventoryHealthScore,
  InventoryRiskFlag,
  MslCapitalImpact,
  MslChangeAction,
  MoqTrapAnalysis,
  NetDemandMetrics,
  RevenuePortfolioItem,
  RollingDrrMetrics,
  SeasonalityResult,
  SkuWarehouseDistribution,
  TransferRecommendation,
  VendorAllocationOption,
  VendorRateComparison,
  VendorScorecard,
  Warehouse,
  WarehouseStockPosition,
} from '@inventoryiq/core';

export const AS_OF = PROTOTYPE_AS_OF_DATE;

const CATEGORY_AVERAGE_RETURN_RATE = 0.09;

/* --------------------------------------------------------- demand portfolio */

const PORTFOLIO_ITEMS: readonly RevenuePortfolioItem[] = EVM_SKU_SEEDS.map((seed) => {
  const channelSales = CHANNEL_DEMAND_SEEDS.filter((entry) => entry.sku === seed.sku);
  const revenue = channelSales.reduce(
    (sum, entry) => sum + entry.dailySales.reduce((total, point) => total + point.grossRevenue, 0),
    0,
  );
  const unitsByDate = new Map<string, number>();
  for (const entry of channelSales) {
    for (const point of entry.dailySales) {
      unitsByDate.set(point.date, (unitsByDate.get(point.date) ?? 0) + point.unitsSold);
    }
  }
  const dailyDemand = [...unitsByDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, units]) => units);
  return { sku: seed.sku, revenue, dailyDemand };
});

const CLASSIFICATION_BY_SKU = new Map<string, AbcXyzClassification>(
  classifyAbcXyzPortfolio([...PORTFOLIO_ITEMS]).map((entry) => [entry.sku, entry]),
);

function mergedChannelSales(sku: string): ChannelDailySalesPoint[] {
  const byDate = new Map<string, ChannelDailySalesPoint>();
  for (const entry of CHANNEL_DEMAND_SEEDS.filter((channel) => channel.sku === sku)) {
    for (const point of entry.dailySales) {
      const existing = byDate.get(point.date);
      if (existing === undefined) {
        byDate.set(point.date, { ...point });
      } else {
        existing.unitsSold += point.unitsSold;
        existing.unitsReturned += point.unitsReturned;
        existing.grossRevenue += point.grossRevenue;
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* --------------------------------------------------------------- SKU model */

export interface ChannelPoint {
  date: string;
  amazon: number;
  flipkart: number;
  returned: number;
}

export interface SkuModel {
  sku: string;
  subcategory: string;
  price: number;
  stock: number;
  openPo: number;
  inTransit: number;
  msp: number;
  pt: number;
  moq: number;
  /** CHUNK-1: dynamic MSL engine */
  staticMsl: number;
  staticReorderLevel: number;
  staticReorderQuantity: number;
  staticStatus: string;
  dynamicMsl: number;
  dynamicReorderLevel: number;
  dynamicAction: MslChangeAction;
  mslDelta: number;
  riskFlag: InventoryRiskFlag;
  rationale: string;
  drr: RollingDrrMetrics;
  leadTimeAverage: number;
  leadTimeStdDev: number;
  eventMultiplier: number;
  /** CHUNK-2: demand intelligence */
  classification: AbcXyzClassification;
  safetyStockCurrent: number;
  safetyStockRecommended: number;
  demandStdDev: number;
  volatility: string;
  trend: string;
  trendPercent: number | null;
  drr30: number;
  netDemand: NetDemandMetrics;
  returnRate30: number;
  returnAnomaly: boolean;
  /** CHUNK-3: working capital */
  surplusUnits: number;
  surplusDays: number | null;
  surplusAlert: string;
  capitalLocked: number;
  holdingCost: number;
  mslCapitalImpact: MslCapitalImpact;
  deadStock: DeadStockAnalysis;
  moqAnalysis: MoqTrapAnalysis;
  /** composite */
  health: InventoryHealthScore;
  /** series for charts */
  sales: readonly DailySalesPoint[];
  channelSeries: readonly ChannelPoint[];
}

function buildSkuModel(seed: (typeof EVM_SKU_SEEDS)[number]): SkuModel {
  const classification = CLASSIFICATION_BY_SKU.get(seed.sku);
  const workingCapital = WORKING_CAPITAL_SEEDS.find((entry) => entry.sku === seed.sku);
  if (classification === undefined || workingCapital === undefined) {
    throw new Error(`Missing dashboard assumptions for ${seed.sku}.`);
  }

  const sales = generateSimulatedSalesHistory(seed);
  const leadTimeSamples = getSimulatedLeadTimeSamples(seed);

  const staticResult = calculateStaticMsl({
    monthlySellingPlan: seed.monthlySellingPlan,
    procurementTimeDays: seed.procurementTimeDays,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
  });

  const dynamic = generateDynamicMslRecommendation({
    sku: seed.sku,
    dailySales: sales,
    asOfDate: AS_OF,
    eventMultiplier: 1,
    leadTimeSamples,
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

  const profile = calculateDemandProfile(sales, AS_OF);
  const safety = calculateClassDrivenSafetyStock({
    combinedClass: classification.combinedClass,
    currentSafetyStock: seed.evmSafetyStock,
    sales,
    asOfDate: AS_OF,
    averageDailyRunRate: profile.drr30,
    leadTimeSamples,
  });
  const netDemand = calculateNetDemandMetrics({
    sales: mergedChannelSales(seed.sku),
    asOfDate: AS_OF,
    grossDrr: profile.drr30,
    categoryAverageReturnRate: CATEGORY_AVERAGE_RETURN_RATE,
  });

  const surplus = detectSurplusStock({
    sku: seed.sku,
    currentStock: seed.currentPhysicalStock,
    openPurchaseOrders: seed.openPurchaseOrders,
    inTransitStock: seed.inTransitStock,
    reorderLevel: staticResult.reorderLevel,
    drr30: profile.drr30,
  });
  const expectedHoldDays = surplus.surplusDays ?? 90;
  const capitalRisk = calculateCapitalRisk({
    surplusUnits: surplus.surplusUnits,
    averageProcurementPrice: workingCapital.averageProcurementPrice,
    annualCostOfCapitalRate: workingCapital.annualCostOfCapitalRate,
    expectedHoldDays,
  });
  const mslCapitalImpact = calculateMslCapitalImpact({
    currentMinimumStockLevel: seed.observedMinimumStockLevel,
    recommendedMinimumStockLevel: dynamic.recommendedMinimumStockLevel,
    averageProcurementPrice: workingCapital.averageProcurementPrice,
    annualCostOfCapitalRate: workingCapital.annualCostOfCapitalRate,
    expectedHoldDays,
  });

  const deadStock = analyzeDeadStock({
    sku: seed.sku,
    sales: generateAgingScenarioHistory(workingCapital.agingScenario),
    asOfDate: AS_OF,
    currentStock: seed.currentPhysicalStock,
    averageProcurementPrice: workingCapital.averageProcurementPrice,
    monthlyDepreciationRate: workingCapital.monthlyDepreciationRate,
  });

  const moqAnalysis = analyzeMoqTrap({
    sku: seed.sku,
    minimumOrderQuantity: seed.minimumOrderQuantity,
    minimumStockLevel: dynamic.recommendedMinimumStockLevel,
    averageDailyDemand: profile.drr30,
    averageProcurementPrice: workingCapital.averageProcurementPrice,
  });

  const health = calculateInventoryHealthScore({
    drrStability: calculateDrrStability(profile.demandCoefficientOfVariation),
    stockMslAlignment: calculateStockMslAlignment(
      seed.currentPhysicalStock,
      dynamic.recommendedMinimumStockLevel,
    ),
    poPipelineAdequacy: calculatePoPipelineAdequacy(
      seed.currentPhysicalStock,
      seed.openPurchaseOrders,
      seed.inTransitStock,
      dynamic.reorderLevel,
    ),
    capitalEfficiency: workingCapital.capitalEfficiencyScore,
    vendorReliability: workingCapital.vendorReliabilityScore,
  });

  const amazon = new Map(
    CHANNEL_DEMAND_SEEDS.filter((entry) => entry.sku === seed.sku && entry.channel === 'amazon')
      .flatMap((entry) => entry.dailySales)
      .map((point) => [point.date, point]),
  );
  const flipkart = new Map(
    CHANNEL_DEMAND_SEEDS.filter((entry) => entry.sku === seed.sku && entry.channel === 'flipkart')
      .flatMap((entry) => entry.dailySales)
      .map((point) => [point.date, point]),
  );
  const channelSeries = sales.map((point) => {
    const amz = amazon.get(point.date);
    const fk = flipkart.get(point.date);
    return {
      date: point.date,
      amazon: amz?.unitsSold ?? 0,
      flipkart: fk?.unitsSold ?? 0,
      returned: (amz?.unitsReturned ?? 0) + (fk?.unitsReturned ?? 0),
    };
  });

  return {
    sku: seed.sku,
    subcategory: seed.subcategory,
    price: workingCapital.averageProcurementPrice,
    stock: seed.currentPhysicalStock,
    openPo: seed.openPurchaseOrders,
    inTransit: seed.inTransitStock,
    msp: seed.monthlySellingPlan,
    pt: seed.procurementTimeDays,
    moq: seed.minimumOrderQuantity,
    staticMsl: staticResult.minimumStockLevel,
    staticReorderLevel: staticResult.reorderLevel,
    staticReorderQuantity: staticResult.reorderQuantity,
    staticStatus: staticResult.actionStatus,
    dynamicMsl: dynamic.recommendedMinimumStockLevel,
    dynamicReorderLevel: dynamic.reorderLevel,
    dynamicAction: dynamic.action,
    mslDelta: dynamic.recommendedMinimumStockLevel - staticResult.minimumStockLevel,
    riskFlag: dynamic.riskFlag,
    rationale: dynamic.rationale,
    drr: dynamic.drr,
    leadTimeAverage: dynamic.leadTime.actualAverageLeadTimeDays,
    leadTimeStdDev: dynamic.leadTime.leadTimeStandardDeviationDays,
    eventMultiplier: dynamic.drr.eventMultiplier,
    classification,
    safetyStockCurrent: safety.currentSafetyStock,
    safetyStockRecommended: safety.recommendedSafetyStock,
    demandStdDev: safety.demandStandardDeviation,
    volatility: profile.volatility,
    trend: profile.trend,
    trendPercent: profile.trendPercent,
    drr30: profile.drr30,
    netDemand,
    returnRate30: netDemand.returnRate30,
    returnAnomaly: netDemand.anomaly,
    surplusUnits: surplus.surplusUnits,
    surplusDays: surplus.surplusDays,
    surplusAlert: surplus.alertLevel,
    capitalLocked: capitalRisk.capitalLocked,
    holdingCost: capitalRisk.expectedHoldingCost,
    mslCapitalImpact,
    deadStock,
    moqAnalysis,
    health,
    sales,
    channelSeries,
  };
}

/** The CHUNK-3 documented MOQ anchor (MSL 400 vs MOQ 1,000). */
function buildMoqAnchor(): MoqTrapAnalysis {
  return analyzeMoqTrap({
    sku: SIMULATED_MOQ_TRAP.sku,
    minimumOrderQuantity: SIMULATED_MOQ_TRAP.minimumOrderQuantity,
    minimumStockLevel: SIMULATED_MOQ_TRAP.minimumStockLevel,
    averageDailyDemand: SIMULATED_MOQ_TRAP.averageDailyDemand,
    averageProcurementPrice: SIMULATED_MOQ_TRAP.averageProcurementPrice,
  });
}

export const SKUS: readonly SkuModel[] = EVM_SKU_SEEDS.map(buildSkuModel);
export const SKU_BY_ID = new Map<string, SkuModel>(SKUS.map((model) => [model.sku, model]));
export const MOQ_ANCHOR = buildMoqAnchor();

/* ---------------------------------------------------------------- transfers */

export interface TransferModel {
  /** Every move across every SKU, ranked by quantity. */
  allRecommendations: readonly TransferRecommendation[];
  /** Display slice for portfolio tables. */
  recommendations: readonly TransferRecommendation[];
  recommendationsBySku: ReadonlyMap<string, readonly TransferRecommendation[]>;
  positionsBySku: ReadonlyMap<string, readonly WarehouseStockPosition[]>;
  anchorRecommendations: readonly TransferRecommendation[];
  anchorPositions: readonly WarehouseStockPosition[];
  warehouses: readonly Warehouse[];
  demandShares: Readonly<Record<string, number>>;
}

function toDistribution(
  sku: string,
  minimumStockLevel: number,
  demandDrr: number,
  demandShares: Readonly<Record<string, number>>,
  holdings: readonly { warehouseCode: string; currentStock: number; allocatedStock: number }[],
): SkuWarehouseDistribution {
  return {
    sku,
    minimumStockLevel,
    demandDrr,
    demandShares,
    positions: holdings.map((holding) => ({
      warehouseCode: holding.warehouseCode,
      currentStock: holding.currentStock,
      allocatedStock: holding.allocatedStock,
    })),
  };
}

function buildTransfers(): TransferModel {
  const distributions: SkuWarehouseDistribution[] = [];
  for (const model of SKUS) {
    const stock = WAREHOUSE_STOCK_SEEDS.find((entry) => entry.sku === model.sku);
    if (stock === undefined) {
      continue;
    }
    distributions.push(
      toDistribution(
        model.sku,
        model.dynamicMsl,
        model.drr30,
        WAREHOUSE_DEMAND_SHARES,
        stock.holdings,
      ),
    );
  }

  const anchor = toDistribution(
    SIMULATED_POWER_BANK_TRANSFER.sku,
    SIMULATED_POWER_BANK_TRANSFER.minimumStockLevel,
    SIMULATED_POWER_BANK_TRANSFER.demandDrr,
    SIMULATED_POWER_BANK_TRANSFER.demandShares,
    SIMULATED_POWER_BANK_TRANSFER.holdings,
  );

  const allDistributions = [...distributions, anchor];
  const positionsBySku = new Map<string, readonly WarehouseStockPosition[]>(
    allDistributions.map(
      (distribution): [string, readonly WarehouseStockPosition[]] => [
        distribution.sku,
        analyzeWarehouseSurplusDeficit(distribution),
      ],
    ),
  );
  // Optimise each SKU on its own so the portfolio-wide recommendation cap can
  // never hide one of that SKU's moves from its own view.
  const perSku = allDistributions.map((distribution) => ({
    sku: distribution.sku,
    recommendations: generateTransferRecommendations({
      distributions: [distribution],
      maxRecommendations: 12,
    }),
  }));
  const recommendationsBySku = new Map<string, readonly TransferRecommendation[]>(
    perSku.map((entry): [string, readonly TransferRecommendation[]] => [
      entry.sku,
      entry.recommendations,
    ]),
  );
  const allRecommendations = perSku
    .flatMap((entry) => entry.recommendations)
    .sort(
      (a, b) =>
        b.quantity - a.quantity ||
        a.sku.localeCompare(b.sku) ||
        a.toWarehouse.localeCompare(b.toWarehouse),
    );

  return {
    allRecommendations,
    recommendations: allRecommendations.slice(0, 8),
    recommendationsBySku,
    positionsBySku,
    anchorRecommendations: recommendationsBySku.get(anchor.sku) ?? [],
    anchorPositions: positionsBySku.get(anchor.sku) ?? [],
    warehouses: listWarehouses(),
    demandShares: SIMULATED_POWER_BANK_TRANSFER.demandShares,
  };
}

export const TRANSFERS = buildTransfers();

/** SKUs the transfer engine actually has stock positions for. */
export const TRANSFER_COVERAGE: readonly string[] = [...TRANSFERS.positionsBySku.keys()];

const SKU_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'EVM-H61FHL': 'Motherboard · multi-vendor purchase history',
  'P0109-B': 'Power bank · observed per-warehouse split',
};

/** Human label for a SKU that may sit outside the modelled catalogue. */
export function describeSku(sku: string): string {
  return SKU_BY_ID.get(sku)?.subcategory ?? SKU_DESCRIPTIONS[sku] ?? 'observed in source data';
}

/* ------------------------------------------------------------------ vendors */

export interface VendorModel {
  scorecards: readonly VendorScorecard[];
  priceComparison: VendorRateComparison;
  concentrations: readonly ConcentrationAnalysis[];
  allocation: readonly VendorAllocationOption[];
  reorderQuantity: number;
  savingsVsDearest: number;
  savingsVsSplit: number;
  provenance: typeof VENDOR_SEED_PROVENANCE;
}

function buildVendors(): VendorModel {
  const priceComparison = compareVendorRates('EVM-H61FHL', PROCUREMENT_PRICE_SEEDS);
  const concentrations = ['EVM-H61FHL', 'EVM-25/128GB'].map((sku) =>
    analyzeVendorConcentration(
      sku,
      PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === sku).map((point) => ({
        vendorCode: point.vendorCode,
        quantity: point.quantity,
      })),
    ),
  );
  const reorderQuantity = 20_000;
  const allocation = suggestVendorAllocation(
    'EVM-H61FHL',
    reorderQuantity,
    REORDER_VENDOR_QUOTES,
  );
  const singleVendorOptions = allocation.filter((option) => option.vendorCode !== null);
  const costs = singleVendorOptions.map((option) => option.totalCost);
  const dearest = Math.max(...costs);
  const cheapest = Math.min(...costs);
  const split = allocation.find((option) => option.recommendation === 'RISK_MITIGATION');

  return {
    scorecards: rankVendors(VENDOR_PERFORMANCE_SEEDS),
    priceComparison,
    concentrations,
    allocation,
    reorderQuantity,
    savingsVsDearest: dearest - cheapest,
    savingsVsSplit: split === undefined ? 0 : split.totalCost - cheapest,
    provenance: VENDOR_SEED_PROVENANCE,
  };
}

export const VENDORS = buildVendors();

/* ------------------------------------------------------- per-SKU vendor lens */

/** SKUs that actually have multi-vendor rate history in the sample. */
export const VENDOR_COVERED_SKUS: readonly string[] = [
  ...new Set(PROCUREMENT_PRICE_SEEDS.map((point) => point.sku)),
];

export function vendorRatesForSku(sku: string): VendorRateComparison | null {
  const points = PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === sku);
  return points.length === 0 ? null : compareVendorRates(sku, PROCUREMENT_PRICE_SEEDS);
}

export function vendorConcentrationForSku(sku: string): ConcentrationAnalysis | null {
  const points = PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === sku);
  if (points.length === 0) {
    return null;
  }
  return analyzeVendorConcentration(
    sku,
    points.map((point) => ({ vendorCode: point.vendorCode, quantity: point.quantity })),
  );
}

/* --------------------------------------------------------------- seasonality */

export const SEASONALITY: SeasonalityResult = calculateSeasonalIndices(
  EVM_SSD_MONTHLY_DEMAND,
  'simulated',
);

/* ---------------------------------------------------------------- portfolio */

export interface Portfolio {
  skuCount: number;
  catalogueTotal: number;
  warehouseCount: number;
  asOf: string;
  capitalInInventory: number;
  capitalInSurplus: number;
  annualHoldingCost: number;
  surplusUnitsTotal: number;
  stockoutRisk: number;
  capitalSurplus: number;
  balanced: number;
  bandCounts: Readonly<Record<InventoryHealthBand, number>>;
  healthAverage: number;
  mslIncrease: number;
  mslDecrease: number;
  mslVarianceUnits: number;
  safetyStockBefore: number;
  safetyStockAfter: number;
  deadStockValue: number;
  stagnantValue: number;
  slowMovingValue: number;
  activeValue: number;
  moqTrappedCapital: number;
  moqTrapCount: number;
  transferUnits: number;
  transferCost: number;
  transferCount: number;
  releaseableCapital: number;
}

function buildPortfolio(): Portfolio {
  const capitalInInventory = SKUS.reduce((sum, model) => sum + model.stock * model.price, 0);
  const capitalInSurplus = SKUS.reduce((sum, model) => sum + model.capitalLocked, 0);
  const annualHoldingCost = SKUS.reduce((sum, model) => sum + model.holdingCost, 0);
  const bandCounts: Record<InventoryHealthBand, number> = {
    HEALTHY: 0,
    NEEDS_ATTENTION: 0,
    AT_RISK: 0,
    CRITICAL: 0,
  };
  for (const model of SKUS) {
    bandCounts[model.health.band] += 1;
  }

  const valueByStatus = (status: string): number =>
    SKUS.filter((model) => model.deadStock.status === status).reduce(
      (sum, model) => sum + model.deadStock.inventoryValue,
      0,
    );

  return {
    skuCount: SKUS.length,
    catalogueTotal: 717,
    warehouseCount: TRANSFERS.warehouses.length,
    asOf: AS_OF,
    capitalInInventory,
    capitalInSurplus,
    annualHoldingCost,
    surplusUnitsTotal: SKUS.reduce((sum, model) => sum + model.surplusUnits, 0),
    stockoutRisk: SKUS.filter((model) => model.riskFlag === 'STOCKOUT_RISK').length,
    capitalSurplus: SKUS.filter((model) => model.riskFlag === 'CAPITAL_SURPLUS').length,
    balanced: SKUS.filter((model) => model.riskFlag === 'BALANCED').length,
    bandCounts,
    healthAverage: SKUS.reduce((sum, model) => sum + model.health.score, 0) / SKUS.length,
    mslIncrease: SKUS.filter((model) => model.dynamicAction === 'INCREASE').length,
    mslDecrease: SKUS.filter((model) => model.dynamicAction === 'DECREASE').length,
    mslVarianceUnits: SKUS.reduce((sum, model) => sum + Math.abs(model.mslDelta), 0),
    safetyStockBefore: SKUS.reduce((sum, model) => sum + model.safetyStockCurrent, 0),
    safetyStockAfter: SKUS.reduce((sum, model) => sum + model.safetyStockRecommended, 0),
    deadStockValue: valueByStatus('DEAD_STOCK'),
    stagnantValue: valueByStatus('STAGNANT'),
    slowMovingValue: valueByStatus('SLOW_MOVING'),
    activeValue: valueByStatus('ACTIVE'),
    moqTrappedCapital: SKUS.reduce((sum, model) => sum + model.moqAnalysis.capitalTrapped, 0),
    moqTrapCount: SKUS.filter((model) => model.moqAnalysis.isMoqTrap).length,
    transferUnits: TRANSFERS.allRecommendations.reduce((sum, rec) => sum + rec.quantity, 0),
    transferCost: TRANSFERS.allRecommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0),
    transferCount: TRANSFERS.allRecommendations.length,
    releaseableCapital: SKUS.reduce(
      (sum, model) => sum + model.mslCapitalImpact.releasableInventoryValue,
      0,
    ),
  };
}

export const PORTFOLIO = buildPortfolio();

export const CATALOGUE_NOTE = {
  catalogueTotal: 717,
  warehouses: TRANSFERS.warehouses.length,
  subcategories: [...new Set(SKUS.map((model) => model.subcategory))],
} as const;

export { CATEGORY_AVERAGE_RETURN_RATE };
