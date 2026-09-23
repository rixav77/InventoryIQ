import type { Warehouse } from '../proximity-matrix.js';
import { EVM_SKU_SEEDS } from './seed-skus.js';

export const EVM_WAREHOUSES: readonly Warehouse[] = [
  { code: 'VASAI', name: 'Vasai Warehouse', city: 'Vasai', region: 'MUMBAI_CLUSTER', isEcommerce: false, isFba: false },
  { code: 'BHIWANDI', name: 'Bhiwandi Warehouse', city: 'Bhiwandi', region: 'MUMBAI_CLUSTER', isEcommerce: false, isFba: false },
  { code: 'FACTORY', name: 'Factory Warehouse', city: 'Factory', region: 'MUMBAI_CLUSTER', isEcommerce: false, isFba: false },
  { code: 'ECOM', name: 'E-Commerce Warehouse', city: 'Mumbai', region: 'MUMBAI_CLUSTER', isEcommerce: true, isFba: false },
  { code: 'DEPOT', name: 'Depot Warehouse', city: 'Depot', region: 'MUMBAI_CLUSTER', isEcommerce: false, isFba: false },
  { code: 'DELHI', name: 'Delhi Warehouse', city: 'Delhi', region: 'NORTH', isEcommerce: false, isFba: false },
  { code: 'CHENNAI', name: 'Chennai Warehouse', city: 'Chennai', region: 'SOUTH', isEcommerce: false, isFba: false },
];

const DISTANCE_EDGES: readonly (readonly [string, string, number])[] = [
  ['VASAI', 'BHIWANDI', 40],
  ['VASAI', 'FACTORY', 30],
  ['VASAI', 'ECOM', 35],
  ['VASAI', 'DEPOT', 25],
  ['VASAI', 'DELHI', 1400],
  ['VASAI', 'CHENNAI', 1350],
  ['BHIWANDI', 'FACTORY', 50],
  ['BHIWANDI', 'ECOM', 45],
  ['BHIWANDI', 'DEPOT', 55],
  ['BHIWANDI', 'DELHI', 1350],
  ['BHIWANDI', 'CHENNAI', 1400],
  ['FACTORY', 'ECOM', 20],
  ['FACTORY', 'DEPOT', 30],
  ['FACTORY', 'DELHI', 1420],
  ['FACTORY', 'CHENNAI', 1330],
  ['ECOM', 'DEPOT', 40],
  ['ECOM', 'DELHI', 1410],
  ['ECOM', 'CHENNAI', 1340],
  ['DEPOT', 'DELHI', 1380],
  ['DEPOT', 'CHENNAI', 1360],
  ['DELHI', 'CHENNAI', 2200],
];

export const WAREHOUSE_PROXIMITY_KM: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (const [from, to, km] of DISTANCE_EDGES) {
    map.set([from, to].sort().join('|'), km);
  }
  return map;
})();

export const WAREHOUSE_DEMAND_SHARES: Readonly<Record<string, number>> = {
  BHIWANDI: 0.55,
  ECOM: 0.15,
  DELHI: 0.12,
  CHENNAI: 0.08,
  VASAI: 0.05,
  FACTORY: 0.03,
  DEPOT: 0.02,
};

export interface WarehouseHolding {
  warehouseCode: string;
  currentStock: number;
  allocatedStock: number;
}

export interface WarehouseStockSeed {
  sku: string;
  holdings: readonly WarehouseHolding[];
  provenance: {
    skuIdentity: 'observed';
    aggregateStock: 'observed';
    perWarehouseSplit: 'observed' | 'simulated';
    allocatedStock: 'simulated';
  };
}

const DEFAULT_ALLOCATED_RATIO = 0.005;

const NON_HUB_SHARES: readonly (readonly [string, number])[] = [
  ['ECOM', 0.1],
  ['DELHI', 0.07],
  ['CHENNAI', 0.04],
  ['VASAI', 0.03],
  ['FACTORY', 0.02],
  ['DEPOT', 0.01],
];

function spreadHoldings(totalStock: number): WarehouseHolding[] {
  const holdings: WarehouseHolding[] = [];
  let distributed = 0;
  for (const [code, share] of NON_HUB_SHARES) {
    const currentStock = Math.round(totalStock * share);
    distributed += currentStock;
    holdings.push({
      warehouseCode: code,
      currentStock,
      allocatedStock: Math.round(currentStock * DEFAULT_ALLOCATED_RATIO),
    });
  }
  const hubStock = Math.max(totalStock - distributed, 0);
  return [
    {
      warehouseCode: 'BHIWANDI',
      currentStock: hubStock,
      allocatedStock: Math.round(hubStock * DEFAULT_ALLOCATED_RATIO),
    },
    ...holdings,
  ];
}

const OBSERVED_HOLDINGS: Readonly<Record<string, readonly WarehouseHolding[]>> = {
  'EVM-25/128GB': [
    { warehouseCode: 'BHIWANDI', currentStock: 73_000, allocatedStock: 0 },
    { warehouseCode: 'DELHI', currentStock: 586, allocatedStock: 0 },
    { warehouseCode: 'ECOM', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'CHENNAI', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'VASAI', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'FACTORY', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'DEPOT', currentStock: 0, allocatedStock: 0 },
  ],
};

export const WAREHOUSE_STOCK_SEEDS: readonly WarehouseStockSeed[] = EVM_SKU_SEEDS.map((seed) => {
  const observed = OBSERVED_HOLDINGS[seed.sku];
  return {
    sku: seed.sku,
    holdings: observed ?? spreadHoldings(seed.currentPhysicalStock),
    provenance: {
      skuIdentity: 'observed',
      aggregateStock: 'observed',
      perWarehouseSplit: observed ? 'observed' : 'simulated',
      allocatedStock: 'simulated',
    },
  };
});

export const SIMULATED_POWER_BANK_TRANSFER = {
  sku: 'P0109-B',
  minimumStockLevel: 10_000,
  demandDrr: 120,
  demandShares: {
    BHIWANDI: 0.3,
    DELHI: 0.17,
    CHENNAI: 0.13,
    ECOM: 0.15,
    VASAI: 0.1,
    FACTORY: 0.1,
    DEPOT: 0.05,
  },
  holdings: [
    { warehouseCode: 'BHIWANDI', currentStock: 7_390, allocatedStock: 5 },
    { warehouseCode: 'DELHI', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'CHENNAI', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'ECOM', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'VASAI', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'FACTORY', currentStock: 0, allocatedStock: 0 },
    { warehouseCode: 'DEPOT', currentStock: 0, allocatedStock: 0 },
  ],
  provenance: {
    skuIdentity: 'observed',
    perWarehouseSplit: 'observed',
    allocatedStock: 'simulated',
  },
} as const;
