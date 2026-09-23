import type {
  ChannelDailySalesPoint,
  DataProvenance,
  MonthlyDemandPoint,
  SalesChannel,
} from '../demand-intelligence/types.js';
import type { DailySalesPoint } from '../engine/types.js';
import {
  EVM_SKU_SEEDS,
  generateSimulatedSalesHistory,
  type EvmSkuSeed,
} from './seed-skus.js';

export interface ChannelDemandSeed {
  sku: string;
  channel: SalesChannel;
  dailySales: readonly ChannelDailySalesPoint[];
  provenance: {
    skuIdentity: 'observed';
    sales: 'simulated';
    returns: 'simulated';
    revenue: 'simulated';
  };
}

const CHANNELS = [
  { channel: 'amazon', share: 0.62, returnBase: 0.08 },
  { channel: 'flipkart', share: 0.38, returnBase: 0.11 },
] as const;

export const DEMAND_DATA_PROVENANCE: DataProvenance = 'simulated';

function splitUnits(total: number, share: number, channel: SalesChannel): number {
  const amazonUnits = Math.round(total * share);
  return channel === 'amazon' ? amazonUnits : total - Math.round(total * 0.62);
}

function buildChannelHistory(
  seed: EvmSkuSeed,
  totalHistory: readonly DailySalesPoint[],
  channel: SalesChannel,
  share: number,
  returnBase: number,
): ChannelDailySalesPoint[] {
  const skuIndex = EVM_SKU_SEEDS.findIndex(({ sku }) => sku === seed.sku);
  const simulatedUnitPrice = 100 + (EVM_SKU_SEEDS.length - skuIndex) * 25;

  return totalHistory.map((point, index) => {
    const unitsSold = splitUnits(point.unitsSold, share, channel);
    const returnRate = Math.max(
      0,
      returnBase + 0.015 * Math.sin((index + skuIndex + (channel === 'amazon' ? 0 : 3)) * 0.9),
    );
    const unitsReturned = Math.min(unitsSold, Math.round(unitsSold * returnRate));

    return {
      date: point.date,
      unitsSold,
      unitsReturned,
      grossRevenue: unitsSold * simulatedUnitPrice,
    };
  });
}

export const CHANNEL_DEMAND_SEEDS: readonly ChannelDemandSeed[] = EVM_SKU_SEEDS.flatMap(
  (seed) => {
    const totalHistory = generateSimulatedSalesHistory(seed);
    return CHANNELS.map(({ channel, share, returnBase }) => ({
      sku: seed.sku,
      channel,
      dailySales: buildChannelHistory(seed, totalHistory, channel, share, returnBase),
      provenance: {
        skuIdentity: 'observed',
        sales: 'simulated',
        returns: 'simulated',
        revenue: 'simulated',
      },
    }));
  },
);

const MONTH_FACTORS = [
  0.85,
  0.9,
  0.95,
  0.88,
  0.82,
  1.05,
  1.1,
  1.02,
  1.15,
  1.45,
  1.5,
  1.1,
] as const;

export const EVM_SSD_MONTHLY_DEMAND: readonly MonthlyDemandPoint[] = [2025, 2026].flatMap(
  (year, yearIndex) =>
    MONTH_FACTORS.map((factor, monthIndex) => ({
      year,
      month: monthIndex + 1,
      units: Math.round(100_000 * factor * (1 + yearIndex * 0.04)),
    })),
);

export function toDailySalesPoints(
  sales: readonly ChannelDailySalesPoint[],
): DailySalesPoint[] {
  return sales.map(({ date, unitsSold }) => ({ date, unitsSold }));
}
