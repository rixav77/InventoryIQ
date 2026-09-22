# Chunk 1 — Dynamic E-Commerce MSL Engine 🧠

> The core deliverable. This is what Prashant explicitly asked for:
> *"So that is where we want a solution from you guys."*

---

## Problem Statement

EVM's current MSL formula is **static**:

```
MSL = (MSP / 30) × PT
ROL = max(MSL, MOQ)
ROQ = Open PO + Intransit + Stock - ROL
Action = REORDER NOW when Stock + Open PO + Intransit < ROL
```

**MSP (Monthly Selling Plan)** is manually set once and stays fixed for months. This works for **channel/GT** (offline distribution) where demand is predictable. But for **e-commerce**, DRR swings from 100 → 200 during sales, and the static MSP doesn't react.

### What Breaks

| Scenario | Static MSL Behavior | What Should Happen |
|---|---|---|
| Flash sale approaching (BBDD, GIF) | MSL stays at 100/day equivalent | MSL should spike to 180/day equivalent 10 days before |
| Sale underperforms expectations | MSL stays inflated | MSL should reduce mid-sale to prevent overstocking |
| New product launch goes viral | MSL set to conservative forecast | MSL should ramp up based on actual DRR trajectory |
| Post-sale normalization | MSL remains at sale levels | MSL should taper down to trailing 14-day average |
| Seasonal decline (e.g., Q1 post-Diwali) | MSL stays at Q3/Q4 levels | MSL should auto-reduce based on seasonal patterns |

---

## Solution: Dynamic MSL Formula

Replace the static `MSP/30` with a **demand-responsive Daily Run Rate (DRR)** calculation.

### New Formula

```
Dynamic_DRR = α × DRR_7d + β × DRR_14d + γ × DRR_30d + δ × Event_Multiplier

where:
  α + β + γ = 1.0 (weights summing to 1)
  α = 0.5 (heavy recent bias)
  β = 0.3
  γ = 0.2
  δ = event-specific multiplier (1.0 = no event, 1.5-3.0 = sale event)

Dynamic_MSL = Dynamic_DRR × PT × Service_Level_Buffer

where:
  PT = Procurement Time (days) — from EVM's existing data
  Service_Level_Buffer = 1.0 + (Z × σ_DRR / DRR_avg)
    Z = Z-score for target service level (1.65 for 95%, 2.33 for 99%)
    σ_DRR = standard deviation of daily run rate
```

### Channel-Level Split

Even though EVM currently has ONE combined e-com MSL, we build for **per-channel MSL** from day one:

```
E-com MSL (total) = Amazon_MSL + Flipkart_MSL + D2C_MSL + Buffer

where each channel MSL uses its own DRR history:
  Amazon_MSL = DRR_amazon × PT × Service_Level_Buffer_amazon
  Flipkart_MSL = DRR_flipkart × PT × Service_Level_Buffer_flipkart
```

This is **future-proof**: when Prashant's CRM tab segregates e-com MSL, our system already has the breakdown.

---

## Core Engine Components

### 1. DRR Calculator
- **Input:** Daily sales data per SKU per channel (from EasyEcom / marketplace APIs)
- **Output:** Rolling DRR (7/14/30 day), DRR trend (rising/falling/stable), DRR volatility (σ)
- **Frequency:** Recalculated daily at 6 AM IST

### 2. Event Overlay Engine
- **Input:** Sale event calendar (user-managed or auto-detected from marketplace)
- **Output:** Per-SKU demand multipliers for upcoming events
- **Logic:**
  - Look at same-event-last-year DRR vs normal DRR → derive historical multiplier
  - If no history, use category-level multiplier
  - Apply as `δ` in the formula

### 3. MSL Recommendation Generator
- **Input:** Dynamic_DRR, PT, MOQ, current stock, open PO, in-transit
- **Output:** Recommended MSL per SKU per channel + reasoning string
- **Example output:**
  ```json
  {
    "sku": "EVM-25/512GB",
    "channel": "amazon",
    "current_msl": 25000,
    "recommended_msl": 38000,
    "reason": "DRR_7d is 1,267/day (↑ 48% vs 30d avg). Great Indian Festival starts in 8 days. Historical GIF multiplier: 2.1x. Recommended MSL covers 30-day PT + 1.65σ safety buffer.",
    "capital_impact": "₹19.5L additional inventory at avg procurement rate of ₹150/unit",
    "action": "INCREASE",
    "urgency": "HIGH"
  }
  ```

### 4. MSL Review Scheduler
- **Trigger:** Monthly auto-review + event-driven ad-hoc reviews
- **Output:** Full MSL review report for e-com team
- **Workflow:** System generates recommendations → Prashant/team reviews → Approve/Modify → Push to system

---

## Data Requirements

| Data | Source | Method | Priority |
|---|---|---|---|
| Daily sales per SKU per channel | EasyEcom (already integrated) | API pull or CSV export | P0 |
| Current stock per warehouse | Procura API / CRM Hundia Stock | API or export | P0 |
| Open PO + In-transit | Procura API / Tally sync | API or export | P0 |
| PT (Procurement Time) per SKU | Procura MSL Planning screen | API or manual entry | P0 |
| MOQ per SKU | Procura MSL Planning screen | API or manual entry | P0 |
| Sale event calendar | Manual entry by e-com team | Dashboard UI | P1 |
| Historical sale performance | EasyEcom / marketplace reports | Batch import | P1 |

---

## Tech Stack (This Chunk)

| Layer | Tech | Why |
|---|---|---|
| Calculation engine | Node.js (Fastify) | Fast, lightweight, EVM's app is .NET + React — we stay JS ecosystem |
| Database | PostgreSQL (AWS RDS) | Time-series DRR data, SKU master cache, recommendation history |
| Job scheduler | BullMQ + Redis (ElastiCache) | Daily DRR recalculation at 6 AM, event-triggered re-runs |
| Formula config | JSONB in PostgreSQL | Weights (α, β, γ), service level targets — configurable per category |

---

## Prototype Scope (2-3 Days)

For the prototype we promised Prashant:

1. ✅ Take EVM's top 20-50 SKUs (from MSL planning screenshot data)
2. ✅ Use mock/sample DRR data (or EasyEcom export if available)
3. ✅ Run the dynamic MSL formula
4. ✅ Show side-by-side: **Static MSL (current)** vs **Dynamic MSL (ours)** with reasoning
5. ✅ Simulate a sale event and show how MSL adapts
6. ✅ Output a recommendation report (table + reasoning)

---

## Success Metrics

| Metric | Target | How We Measure |
|---|---|---|
| MSL accuracy vs actual demand | < 15% deviation | Compare recommended MSL vs actual sales over 30 days |
| Overstocking incidents | 50% reduction | Count SKUs where stock > 2× MSL for > 14 days |
| Stockout incidents (e-com) | 30% reduction | Count days where stock = 0 on any marketplace |
| MSL review time | < 30 min/month | Time from recommendation generation to approval |
