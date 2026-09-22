# Chunk 3 — Working Capital & Overstocking Intelligence 💰

> The CFO-friendly layer. Prevents capital lockup, detects dead stock early, and gives the finance team data to make ROI-based inventory decisions.

---

## Additional Shortcomings Identified

### 1. No Capital Impact Visibility Per MSL Decision
When Prashant sets MSP to 75,000 for EVM-25/128GB, there's no visibility into:
- How much ₹ capital that locks
- What's the carrying cost per month
- Whether that capital would be better deployed on a different SKU

### 2. Massive Overstock Already Visible
From the MSL planning screenshot:
| SKU | Stock | MSL | ROQ (Surplus) | Estimated Capital Locked |
|---|---|---|---|---|
| EVM-25/256GB | 1,64,347 | 1,00,000 | +1,31,847 (surplus after PO) | **₹2.0 Cr+** at avg ₹150/unit |
| EVM-M2/256GB | 19,753 | 5,000 | +14,753 | ₹22L+ |
| EVM-25/512GB | 31,207 | 25,000 | +6,207 | ₹15.5L+ |

That's potentially **₹2.5+ Crore** of capital sitting in surplus inventory for just 3 SKUs. No alerts exist.

### 3. No Inventory Aging Tracking
How long has that surplus stock been sitting? If 1,64,347 units of 256GB SSD have been sitting for 90+ days above MSL, that's dead capital. Electronics depreciate fast — the longer it sits, the more it loses value.

### 4. MOQ Trap Awareness
From the transcript: *"If my MSL is 400 but MOQ is 1,000, so once I order 1,000, I don't have to order for 6 months."*

This is a recognized pain point — MOQ forces overstocking. But there's no system analysis of:
- Total capital trapped in MOQ-forced overstocking
- Whether splitting across vendors with lower MOQ is cheaper
- Whether pre-negotiating MOQ reductions is worth pursuing

### 5. No PO Overdue Monitoring with Financial Impact
From the Open PO screenshot, multiple POs are **59-78 days overdue**:
- HK Nanotech PO: 78 days overdue, ₹1.59 Cr value
- CEHK Industry POs: 59 days overdue

No system connects overdue POs → stockout risk → revenue loss.

---

## Solution Components

### 1. Capital-at-Risk Calculator

For every MSL change recommendation:
```
Capital_Impact = (New_MSL - Current_MSL) × Avg_Procurement_Price × Expected_Hold_Days / 365 × Cost_of_Capital

Example:
  EVM-25/512GB: Increase MSL from 25,000 → 38,000
  Δ units = 13,000
  Avg price = ₹150/unit
  Capital needed = 13,000 × 150 = ₹19.5L
  Hold time = 30 days (1 procurement cycle)
  Cost of capital at 12% annual = ₹19.5L × 12% × 30/365 = ₹19,200/month

Output: "Increasing MSL costs ₹19.5L in additional inventory. Monthly carrying cost: ₹19,200. 
         Expected to prevent ₹45L in lost sales during GIF based on historical DRR."
```

### 2. Overstocking Detection & Alert System

```
For each SKU:
  Surplus = Stock - ROL
  Surplus_Days = Surplus / DRR_30d  (days of supply above MSL)
  Capital_Locked = Surplus × Avg_Procurement_Price

Alert Levels:
  🟢 HEALTHY: Surplus_Days < 30
  🟡 WATCH:   Surplus_Days 30-60 (suggest MSL review)
  🟠 WARNING: Surplus_Days 60-90 (recommend promotional push or transfer)
  🔴 CRITICAL: Surplus_Days > 90 (flag as potential dead stock, recommend markdown)
```

**From actual EVM data (MSL screenshot):**
```
EVM-25/256GB:
  Stock: 1,64,347 | MSL: 1,00,000 | Open PO: 67,500
  Surplus = 1,64,347 + 67,500 - 1,00,000 = 1,31,847 surplus
  DRR_30d ≈ 100,000/30 = 3,333/day
  Surplus_Days = 1,31,847 / 3,333 = ~40 days of excess supply
  Status: 🟡 WATCH — ₹1.97 Cr capital locked in surplus
```

### 3. Dead/Slow-Moving Stock Detector

```
Criteria:
  - No sales in 30 days → SLOW MOVING
  - No sales in 60 days → STAGNANT
  - No sales in 90 days → DEAD STOCK

For electronics:
  - Monthly depreciation estimate: 1-3% of purchase price (tech obsolescence)
  - Flag: "EVM-25/4TB (4TB SSD): Only 5 units in stock, MSP = 25/month. 
    At current DRR, this SKU sells <1 unit/day. Low priority."
```

### 4. MOQ Impact Analyzer

```
For each SKU with MOQ > MSL:
  MOQ_Overshoot = MOQ - MSL
  Capital_Trap = MOQ_Overshoot × Avg_Price
  Months_of_Cover = MOQ / (MSP / 30)  -- how many months will this MOQ last

Output:
  "EVM-P0503 Power Bank: MSL = 150, MOQ = 500. 
   Single order = 500 units = 3.3 months of cover.
   Capital trapped: ₹X for excess 350 units.
   Consider: Negotiate MOQ to 200 with Brandworks, or consolidate orders 
   with Bhiwandi depot request to split the MOQ across warehouses."
```

### 5. PO Overdue Financial Risk Tracker

Connect PO overdue data to business impact:
```
For each overdue PO:
  Days_Overdue = Today - PO_Due_Date
  Value_At_Risk = PO_Value
  Stockout_Risk = if related SKU stock < MSL → HIGH
  Revenue_Risk = DRR_of_SKU × Days_Until_Stockout × Avg_Selling_Price

Alert:
  "PO2026060002 from HK Nanotech: 78 days overdue. Value: ₹1.59 Cr.
   SKU EVM-H61FHL Motherboard: Current stock covers 12 more days at current DRR.
   ACTION: Escalate with vendor OR place emergency order with backup supplier."
```

### 6. Inventory Health Score

Composite score per SKU combining:
```
Health_Score = 0.3 × DRR_Stability + 0.25 × Stock_MSL_Ratio + 0.2 × PO_Pipeline + 0.15 × Capital_Efficiency + 0.1 × Vendor_Reliability

Where:
  DRR_Stability = 1 - CV(demand)  (higher is better)
  Stock_MSL_Ratio = 1 - |Stock/MSL - 1|  (closer to 1 = better)
  PO_Pipeline = 1 if adequate POs in pipeline, 0 if gap
  Capital_Efficiency = revenue_per_unit_held / avg_procurement_cost
  Vendor_Reliability = OTIF score of primary vendor

Score 80-100: 🟢 Healthy
Score 60-79:  🟡 Needs attention
Score 40-59:  🟠 At risk
Score 0-39:   🔴 Critical
```

---

## Dashboard Views

### CFO Dashboard
- **Total capital locked in inventory:** ₹XX Cr
- **Capital locked in surplus (above MSL):** ₹XX Cr
- **Capital at risk (overdue POs):** ₹XX Cr
- **Potential dead stock value:** ₹XX L
- **Month-over-month inventory turns ratio**
- **Top 10 SKUs by capital locked**
- **Top 10 SKUs by capital efficiency (revenue per ₹ invested)**

### Procurement Dashboard
- **SKUs needing MSL reduction** (overstocked)
- **SKUs needing MSL increase** (understocked + high DRR)
- **MOQ traps** (where MOQ forces uneconomical ordering)
- **Overdue PO escalation list**
- **Vendor reliability ranking**

---

## Prototype Scope (2-3 Days)

1. ✅ Calculate overstocking levels using MSL planning screenshot data
2. ✅ Show capital locked in surplus for top 20 SKUs
3. ✅ Generate "Inventory Health Score" for sample SKUs
4. ✅ Flag dead/slow-moving SKUs
5. ✅ Show: "You have ₹X Cr locked in inventory above MSL. Here are the top 5 SKUs to action."
