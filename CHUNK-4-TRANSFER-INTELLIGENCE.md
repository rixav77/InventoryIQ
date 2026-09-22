# Chunk 4 — Multi-Location Transfer Intelligence 🚚

> Proximity-based optimization across EVM's 6 warehouses. Smart transfers prevent stockouts without new POs.

---

## Additional Shortcomings Identified

### 1. No Cross-Warehouse Visibility in Procurement
The MSL planning screen shows **aggregated stock** across all warehouses. But the CRM Hundia Stock screen shows stock **per warehouse**. These two views are disconnected:
- MSL planning might say "Stock = 73,586" for EVM-25/128GB
- But that could be 73,000 in Bhiwandi and 586 in Delhi
- Delhi might be stockout-risk for local e-com fulfillment, but MSL planning says "OK"

### 2. WMS Transfer is Purely Manual
Warehouse-to-warehouse transfers use a **request/furnish flow** in the WMS. There's no:
- Automated surplus/deficit detection across locations
- Transfer cost estimation
- Recommendation engine for optimal transfer routes
- Consideration of proximity (3-4 Mumbai warehouses are 30-50km apart → same-day; Delhi/Chennai = 2-3 days)

### 3. E-Commerce Warehouse is Special
There's a dedicated "E-commerce" warehouse. This is likely where FBA/Flipkart stock is dispatched from. But:
- Is this warehouse's MSL aligned with e-com demand?
- Does it get replenished proactively or reactively?
- Are inter-warehouse transfers considered in the e-com MSL calculation?

### 4. No Amazon FBA / Flipkart Warehouse Stock Visibility
Stock sent to Amazon FBA or Flipkart Assured warehouses leaves EVM's system. There's no:
- Visibility of stock sitting in marketplace fulfillment centers
- Unified "Available to Sell" metric across own warehouses + FBA + Flipkart

---

## Solution Components

### 1. Cross-Warehouse Surplus/Deficit Map

```
For each SKU:
  Per-warehouse analysis:
    Warehouse_MSL[w] = Channel_demand_served_by[w] × PT / 30
    Surplus[w] = Stock[w] - Warehouse_MSL[w]
    Deficit[w] = max(0, Warehouse_MSL[w] - Stock[w])

Example (P0109 Power Bank Black):
  Bhiwandi: Stock = 7,390, Allocated = 5, Available = 7,385 → SURPLUS
  Vasai:    Stock = 0 → DEFICIT if serves any demand
  Delhi:    Stock = 0 → DEFICIT if serves North India orders
```

### 2. Proximity-Based Transfer Recommendation

EVM's warehouse geography:

```
Proximity Matrix (approximate road km):

           Vasai  Bhiwandi  Factory  E-com  Depot  Delhi  Chennai
Vasai        -      40        30      35     25    1400    1350
Bhiwandi    40       -        50      45     55    1350    1400
Factory     30      50         -      20     30    1420    1330
E-com       35      45        20       -     40    1410    1340
Depot       25      55        30      40      -    1380    1360
Delhi     1400    1350      1420    1410   1380      -     2200
Chennai   1350    1400      1330    1340   1360    2200      -

Transfer Speed:
  Mumbai cluster (any ↔ any): Same-day (4-6 hours)
  Mumbai → Delhi: 2-3 days (road), 1 day (air)
  Mumbai → Chennai: 2-3 days (road), 1 day (air)
  Delhi ↔ Chennai: 3-4 days (road), 1 day (air)
```

### 3. Transfer Recommendation Engine

```
Algorithm:
  1. Identify all (SKU, warehouse) pairs with deficit
  2. For each deficit, find all warehouses with surplus of same SKU
  3. Rank source warehouses by:
     a. Proximity (transit time)
     b. Surplus magnitude (don't drain a source below its own MSL)
     c. Transfer cost estimate
  4. Generate recommendation

Output:
  {
    "sku": "EVM-P0109-B",
    "transfer_from": "Bhiwandi Warehouse",
    "transfer_to": "Delhi Warehouse", 
    "quantity": 2000,
    "reason": "Delhi stock is 0. Bhiwandi has 7,390 surplus (available after own MSL). Delhi serves North India e-com orders. Transfer 2,000 to cover 30 days of Delhi DRR.",
    "transit_time": "2-3 days (road)",
    "estimated_cost": "₹8,000 (₹4/unit logistics)",
    "risk": "LOW — Bhiwandi retains 5,390 surplus after transfer"
  }
```

### 4. Ring-Fencing Rules

Never recommend a transfer that would:
```
Rules:
  1. Source_Stock_After_Transfer >= Source_MSL × 1.1 (10% buffer)
  2. Transfer_Qty <= Destination_Deficit × 1.2 (don't over-send)
  3. Don't transfer FROM e-commerce warehouse (it serves marketplace)
  4. Priority: within-cluster first (Mumbai→Mumbai), then cross-region
  5. Don't transfer dead/slow-moving stock — only transfer healthy SKUs
```

### 5. Marketplace FBA/Assured Stock Tracker (V2)

```
Unified Available-to-Sell View:

  EVM-25/256GB:
    Own warehouses: 1,64,347 units
    Amazon FBA:        8,500 units
    Flipkart FC:       5,200 units
    ─────────────────────────
    Total ATP:       1,78,047 units

  Alert: FBA stock for EVM-25/256GB is 8,500. 
         Amazon DRR = 1,200/day. FBA stock covers only 7 days.
         Recommend: Send 15,000 units from E-commerce warehouse → FBA.
```

---

## Data Architecture

```sql
-- Warehouse registry
CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL,
  region VARCHAR(50) NOT NULL, -- 'mumbai_cluster', 'north', 'south'
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  is_ecommerce BOOLEAN DEFAULT FALSE,
  is_fba BOOLEAN DEFAULT FALSE
);

-- Proximity matrix (pre-calculated)
CREATE TABLE warehouse_proximity (
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  distance_km DECIMAL(8,1),
  transit_days_road DECIMAL(3,1),
  transit_days_air DECIMAL(3,1),
  cost_per_unit DECIMAL(8,2),
  PRIMARY KEY (from_warehouse_id, to_warehouse_id)
);

-- Per-warehouse stock (synced from Procura/CRM)
CREATE TABLE warehouse_stock (
  sku_code VARCHAR(50) NOT NULL,
  warehouse_id INTEGER REFERENCES warehouses(id),
  current_qty INTEGER NOT NULL DEFAULT 0,
  allocated_qty INTEGER NOT NULL DEFAULT 0,
  available_qty INTEGER NOT NULL DEFAULT 0,
  last_synced TIMESTAMPTZ,
  PRIMARY KEY (sku_code, warehouse_id)
);

-- Transfer recommendations
CREATE TABLE transfer_recommendations (
  id SERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  from_warehouse_id INTEGER REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  recommended_qty INTEGER NOT NULL,
  reason TEXT,
  transit_time VARCHAR(50),
  estimated_cost DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, executed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actioned_at TIMESTAMPTZ,
  actioned_by VARCHAR(100)
);
```

---

## Prototype Scope (2-3 Days)

1. ✅ Map all 6 warehouses with proximity data
2. ✅ Use Hundia Stock data (from screenshots) to show surplus/deficit per warehouse
3. ✅ Generate 3-5 transfer recommendations with reasoning
4. ✅ Show: "P0109-B has 7,390 in Bhiwandi, 0 in Delhi. Recommend transfer of 2,000 units."

## V2 Additions

- Amazon SP-API integration for FBA stock levels
- Flipkart Seller API for Assured warehouse stock
- Automated transfer request push to WMS
- Cost optimization: road vs air for time-critical transfers
