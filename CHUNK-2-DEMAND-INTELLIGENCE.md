# Chunk 2 — Demand Intelligence & Forecasting 📊

> The data layer that powers the Dynamic MSL Engine. Without reliable demand signals, the engine is guessing.

---

## Additional Shortcomings Identified in EVM's System

From deep analysis of their screenshots and workflow, here are gaps their current system has **no visibility into**:

### 1. Safety Stock is Always Zero
In the MSL planning screen, the **SS (Safety Stock)** column is **0 for every single SKU**. This means:
- No buffer for demand variability
- No buffer for lead time variability
- Any unexpected spike or delayed shipment → instant stockout

### 2. No Historical DRR Tracking
Their system shows current stock and a manually-set MSP. There's no:
- 7/14/30-day sales velocity tracking
- Trend detection (is this SKU accelerating or decelerating?)
- Seasonality awareness

### 3. No SKU Classification (ABC/XYZ)
717 SKUs are treated equally. No categorization by:
- Revenue contribution (A = top 80%, B = next 15%, C = bottom 5%)
- Demand variability (X = predictable, Y = moderate, Z = erratic)
- Different SKU classes should have different service levels and MSL policies

### 4. No Return Rate Factoring
E-commerce return rates in India run **20-40% for COD, 2-8% for prepaid**.
- Returns re-enter stock 7-21 days later
- MSL doesn't account for "in-reverse-pipeline" inventory
- Result: gross demand ≠ net demand, leading to systematic overstocking

### 5. No Lead Time Variability Tracking
PT (Procurement Time) is a **fixed number** per SKU (30 or 60 days). But actual delivery times vary:
- Same SKU from HK Nanotech vs Yinghu International vs Shenzhen Dinggong → different actual lead times
- Sea shipments take longer than Air shipments
- Customs clearance adds unpredictable delays (visible in "Under Custom Clearance" status on PO History)

---

## Solution Components

### 1. DRR Tracking Engine

```
For each SKU × Channel:
  - Track daily units sold
  - Calculate rolling averages: DRR_7d, DRR_14d, DRR_30d, DRR_90d
  - Calculate trend: (DRR_7d - DRR_30d) / DRR_30d × 100 = trend_pct
  - Calculate volatility: σ(daily_sales_last_30d) / DRR_30d = CV (coefficient of variation)
```

**Output example:**
```
EVM-25/256GB on Amazon:
  DRR_7d: 3,200/day  (↑ 12% vs 30d)
  DRR_30d: 2,857/day
  Trend: RISING (+12%)
  Volatility (CV): 0.35 (MODERATE)
  Seasonality: Q3 typically +18% vs Q2
```

### 2. ABC-XYZ Classification Engine

Automatically classify all 717 SKUs:

| Class | Revenue Share | Demand Pattern | MSL Policy |
|---|---|---|---|
| **AX** | Top 80% revenue, predictable demand | Service Level: 99%, tight MSL with small buffer |
| **AY** | Top 80% revenue, moderate variability | Service Level: 97%, moderate safety stock |
| **AZ** | Top 80% revenue, erratic demand | Service Level: 95%, larger safety stock, frequent review |
| **BX/BY** | Mid 15% | Service Level: 95% | Standard MSL |
| **CX/CY/CZ** | Bottom 5% | Service Level: 90% | Minimal stock, JIT where possible |

**Reclassification:** Monthly auto-recalculation. Alert when a SKU jumps classes (e.g., CY → AZ means a previously minor SKU is now high-revenue but unpredictable).

### 3. Statistical Safety Stock Calculator

Replace the constant-zero SS with a calculated buffer:

```
Safety Stock = Z × σ_demand × √(LT_avg)

where:
  Z = Z-score based on ABC class service level
  σ_demand = standard deviation of daily demand over trailing 90 days
  LT_avg = average actual lead time (not just quoted PT)

Enhanced version (accounts for both demand AND lead time variability):
  Safety Stock = Z × √((LT_avg × σ²_demand) + (DRR_avg² × σ²_LT))

where:
  σ²_LT = variance of actual lead times for this SKU/vendor
```

### 4. Seasonality Detection

- **Method:** Seasonal decomposition of time-series data (STL decomposition)
- **Electronics-specific patterns:**
  - Diwali season (Oct-Nov): +40-60% spike in consumer electronics
  - Back-to-school (Jun-Jul): +20% in storage/peripherals
  - End-of-year (Dec): corporate procurement surge
  - Republic Day / Independence Day sales: moderate +15-25%
  - Prime Day / BBDD: category-dependent spikes
- **Output:** Monthly seasonal indices per SKU category
  ```
  EVM SSD category seasonal index:
  Jan: 0.85, Feb: 0.90, Mar: 0.95, Apr: 0.88, May: 0.82,
  Jun: 1.05, Jul: 1.10, Aug: 1.02, Sep: 1.15, Oct: 1.45,
  Nov: 1.50, Dec: 1.10
  ```

### 5. Sale Event Performance Tracker

Track actual vs expected performance during sales:

```
Event: Great Indian Festival 2025
  Expected DRR multiplier: 2.0x
  Actual DRR multiplier: 1.7x
  Variance: -15%

  Per-SKU breakdown:
    EVM-25/256GB: Expected 2.0x → Actual 2.4x (OUTPERFORMED)
    EVM-25/4TB: Expected 1.5x → Actual 0.9x (UNDERPERFORMED)
```

This historical data feeds into the next year's event multiplier predictions.

### 6. Return Rate Intelligence

```
For each SKU × Channel:
  Return_Rate_30d = returns_last_30d / sales_last_30d
  Return_Rate_trend = (return_rate_7d - return_rate_30d) / return_rate_30d

  Net_DRR = Gross_DRR × (1 - Return_Rate_30d)

  Alert: if Return_Rate > category_avg × 1.5 → flag for investigation
```

**Why this matters for MSL:**
- If EVM-25/128GB has a 15% return rate, and MSP is set to 75,000 → effective net demand is only 63,750
- Current system doesn't adjust, so they consistently overstock by ~11,250 units

### 7. Vendor Lead Time Tracker

From PO History + Shipments screenshots, EVM has all the data:

```
For each Vendor × SKU:
  PO Date → Warehouse ETA = Actual Lead Time
  Quoted PT (from MSL Planning) vs Actual LT → Variance

Vendor Scorecard:
  HK Nanotech:     Avg LT = 35 days, σ = 8 days, OTIF = 78%
  Yinghu Intl:     Avg LT = 42 days, σ = 5 days, OTIF = 91%
  Global Connexions: Avg LT = 28 days, σ = 3 days, OTIF = 95%
```

**Impact:** If a vendor's actual lead time is consistently 42 days but PT is set to 30, the system is under-calculating MSL by 40%.

---

## Data Architecture

```sql
-- DRR tracking (partitioned by date)
CREATE TABLE daily_sales (
  id BIGSERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'amazon', 'flipkart', 'd2c'
  sale_date DATE NOT NULL,
  units_sold INTEGER NOT NULL DEFAULT 0,
  units_returned INTEGER NOT NULL DEFAULT 0,
  gross_revenue DECIMAL(12,2),
  net_revenue DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ABC-XYZ classification (recalculated monthly)
CREATE TABLE sku_classification (
  sku_code VARCHAR(50) PRIMARY KEY,
  abc_class CHAR(1) NOT NULL, -- A, B, C
  xyz_class CHAR(1) NOT NULL, -- X, Y, Z
  combined_class CHAR(2) NOT NULL, -- AX, AY, AZ, etc.
  revenue_30d DECIMAL(14,2),
  demand_cv DECIMAL(5,3),  -- coefficient of variation
  service_level_target DECIMAL(4,3), -- 0.950, 0.970, 0.990
  calculated_at TIMESTAMPTZ
);

-- Seasonal indices
CREATE TABLE seasonal_indices (
  category VARCHAR(100) NOT NULL,
  month SMALLINT NOT NULL, -- 1-12
  index_value DECIMAL(4,2) NOT NULL, -- 1.0 = baseline
  last_updated TIMESTAMPTZ,
  PRIMARY KEY (category, month)
);

-- Sale events
CREATE TABLE sale_events (
  id SERIAL PRIMARY KEY,
  event_name VARCHAR(200) NOT NULL,
  channel VARCHAR(20), -- null = all channels
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  expected_multiplier DECIMAL(4,2) DEFAULT 1.0,
  actual_multiplier DECIMAL(4,2), -- filled after event
  status VARCHAR(20) DEFAULT 'upcoming'
);

-- Vendor lead time tracking
CREATE TABLE vendor_lead_times (
  id SERIAL PRIMARY KEY,
  vendor_code VARCHAR(20) NOT NULL,
  sku_code VARCHAR(50) NOT NULL,
  po_number VARCHAR(30),
  po_date DATE,
  expected_delivery DATE,
  actual_delivery DATE,
  quoted_lead_time INTEGER,
  actual_lead_time INTEGER,
  delivery_mode VARCHAR(10) -- 'air', 'sea'
);
```

---

## Prototype Scope (2-3 Days)

1. ✅ Import mock DRR data for 20-50 SKUs across 2 channels
2. ✅ Calculate and display DRR trends with rolling averages
3. ✅ Run ABC-XYZ classification on the SKU set
4. ✅ Calculate statistical safety stock (vs EVM's current all-zeros)
5. ✅ Show: "Your current safety stock is 0. Recommended safety stock for EVM-25/128GB at 95% service level is 12,500 units."
