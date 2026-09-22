# Chunk 7 — Vendor Intelligence & Procurement Optimization 🏭

> Additional solution area discovered from deeper analysis of EVM's PO data and screenshots.

---

## Why This Chunk Exists

From the Open PO and PO History screenshots, we identified patterns EVM's system doesn't surface:

### Shortcomings Found

**1. Multi-Vendor Same-SKU Pricing Has No Comparison**
From the Open PO detail for EVM-H61FHL Motherboard:
| Vendor | PO Date | Rate | Qty |
|---|---|---|---|
| HK Nanotech | 23-Jul-2026 | $11.99 | 7,900 |
| Yinghu International | 28-Jul-2026 | $12.25 | 11,000 |
| Yinghu International | 21-Aug-2026 | $13.30 | 20,000 |
| Shenzhen Dinggong | 22-Aug-2026 | $13.30 | 4,000 |

Same product, 4 vendors, price range **$11.99 – $13.30** (11% spread). No system surfaces:
- Which vendor offers best price?
- Which vendor has best delivery reliability?
- Price trend over time (is this SKU getting more expensive?)

**2. No Vendor OTIF (On-Time-In-Full) Tracking**
PO History shows "Submitted" status and "Under Custom Clearance" but no performance scoring. From open PO screen:
- HK Nanotech PO: **78 days overdue** (₹1.59 Cr)
- CEHK Industry POs: **59 days overdue**
- Multiple Brandworks POs: **69 days overdue** (though smaller value)

No systematic tracking of which vendors consistently deliver late.

**3. No Price Trend or Inflation Monitoring**
The same SKU procured from the same vendor at different times:
- Yinghu Intl, Jul: $12.25/unit
- Yinghu Intl, Aug: $13.30/unit (+8.6% in 1 month)

No alert for this price inflation. Over 20,000 units, that's an extra **$21,000 (~₹17.5L)**.

**4. No Vendor Diversification Risk Assessment**
If a single vendor supplies 70% of a critical SKU and that vendor has delivery issues (like HK Nanotech's 78-day overdue), there's no system to:
- Flag concentration risk
- Suggest backup vendor qualification
- Auto-route emergency POs to backup vendors

---

## Solution Components

### 1. Vendor Scorecard

```
Score = 0.30 × OTIF + 0.25 × Price_Competitiveness + 0.20 × Lead_Time_Reliability + 0.15 × Quality + 0.10 × Responsiveness

OTIF = orders_delivered_on_time_in_full / total_orders × 100
Price_Competitiveness = (market_avg_price - vendor_price) / market_avg_price × 100
Lead_Time_Reliability = 1 - (σ_actual_LT / avg_actual_LT)
Quality = 1 - (defect_returns / total_delivered)
Responsiveness = based on escalation response time (manual input initially)
```

**Output:**
```
Global Connexions PVT LTD:
  OTIF: 95% (Excellent)
  Price: $11.50 avg (Best in class)
  LT Reliability: 92% (Low variance, ±3 days)
  Quality: 99.2%
  Overall Score: 92/100 ⭐ PREFERRED VENDOR

HK Nanotech CO., LIMITED:
  OTIF: 78% (Below standard)
  Price: $11.99 avg (Good)
  LT Reliability: 68% (High variance, ±8 days)
  Quality: 97.5%
  Overall Score: 65/100 ⚠️ NEEDS IMPROVEMENT
  Alert: 1 PO overdue 78 days, ₹1.59 Cr at risk
```

### 2. Price Intelligence

```
For each SKU:
  Track procurement price over time per vendor
  Calculate:
    - 30/60/90 day price trend
    - Cross-vendor price comparison
    - Currency impact (USD procurement → INR cost with forex movement)
    - Best-price-per-unit across all qualified vendors

Alert triggers:
  - Price increase > 5% in 30 days → FLAG
  - Price disparity > 10% across vendors for same SKU → INVESTIGATE
  - Forex movement > 2% affecting landed cost → NOTIFY
```

### 3. Vendor Concentration Risk

```
For each critical SKU (ABC class A):
  Primary_Vendor_Share = primary_vendor_qty / total_procurement_qty × 100

Risk Levels:
  > 80% from single vendor → 🔴 HIGH RISK (single point of failure)
  60-80% from single vendor → 🟠 MODERATE RISK
  < 60% spread across 2+ vendors → 🟢 DIVERSIFIED

Alert:
  "EVM-H61FHL Motherboard: 46% from HK Nanotech (currently 78 days overdue), 
   54% from Yinghu International. Consider qualifying Shenzhen Dinggong 
   as backup. Their Aug PO at $13.30 was competitive."
```

### 4. Smart Vendor Allocation

When a REORDER NOW action triggers:
```
Instead of: Procurement team manually decides which vendor to order from

Our system suggests:
  "EVM-H61FHL needs reorder of 20,000 units.
   
   Option A: Yinghu International 
     Price: $13.30  |  Lead Time: 42 days  |  OTIF: 91%  |  Total: $266,000
   
   Option B: Global Connexions
     Price: $12.80  |  Lead Time: 28 days  |  OTIF: 95%  |  Total: $256,000
     ⭐ RECOMMENDED: 14 days faster, $10,000 cheaper, higher reliability
   
   Option C: Split order (risk mitigation)
     10,000 from Global Connexions + 10,000 from Yinghu
     Avg cost: $13.05  |  Risk: DIVERSIFIED
     Note: Avoids single-vendor dependency"
```

---

## Data Architecture

```sql
-- Vendor performance tracking
CREATE TABLE vendor_performance (
  id SERIAL PRIMARY KEY,
  vendor_code VARCHAR(20) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_pos INTEGER,
  on_time_pos INTEGER,
  in_full_pos INTEGER,
  otif_score DECIMAL(5,2),
  avg_lead_time_days DECIMAL(6,1),
  lead_time_stddev DECIMAL(6,1),
  avg_price_variance DECIMAL(8,2),
  quality_score DECIMAL(5,2),
  overall_score DECIMAL(5,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price tracking per SKU per vendor
CREATE TABLE procurement_prices (
  id SERIAL PRIMARY KEY,
  sku_code VARCHAR(50) NOT NULL,
  vendor_code VARCHAR(20) NOT NULL,
  po_number VARCHAR(30),
  po_date DATE,
  unit_price DECIMAL(12,4),
  currency VARCHAR(3) DEFAULT 'USD',
  unit_price_inr DECIMAL(12,4),
  exchange_rate DECIMAL(8,4),
  quantity INTEGER
);

-- Vendor concentration
CREATE TABLE vendor_concentration (
  sku_code VARCHAR(50) NOT NULL,
  vendor_code VARCHAR(20) NOT NULL,
  share_pct DECIMAL(5,2),
  risk_level VARCHAR(20), -- 'low', 'moderate', 'high'
  last_calculated TIMESTAMPTZ,
  PRIMARY KEY (sku_code, vendor_code)
);
```

---

## Prototype Scope

1. ✅ Calculate OTIF scores from PO History data (overdue tracking visible in screenshots)
2. ✅ Show price comparison across vendors for same SKU
3. ✅ Flag concentration risks for top 10 SKUs by revenue
4. ✅ Show vendor scorecard with ranking

## Priority: V1 (not prototype — this is a value-add, not the core ask)
