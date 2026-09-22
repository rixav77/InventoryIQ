# Chunk 1 — Dynamic E-Commerce MSL Engine 🧠

> The core deliverable. This is what Prashant explicitly asked for:
> *"So that is where we want a solution from you guys."*

---

## Problem Statement

## 1. EVM's Current Formula (Fully Unabbreviated)

Directly transcribed from EVM's live Procura formula screens (`formula.png` and `formula2.0.png`):

### Formula 1: Minimum Stock Level (MSL)
$$\mathbf{Minimum\ Stock\ Level\ (MSL)} = \left( \frac{\mathbf{Monthly\ Selling\ Plan\ (MSP)}}{30\ \text{Days}} \right) \times \mathbf{Procurement\ Time\ (in\ Days)}$$
* **$\text{Monthly Selling Plan (MSP)}$:** Planned sales target or expected inward units for the entire 30-day month (manually typed by the product team).
* **$\frac{\text{Monthly Selling Plan}}{30}$:** Derived planned sales velocity per day (units/day).
* **$\text{Procurement Time (PT)}$:** Quoted supplier manufacturing & delivery lead time in calendar days (typically 30 or 60 days).

---

### Formula 2: Reorder Level (ROL)
$$\mathbf{Reorder\ Level\ (ROL)} = \max\Big( \mathbf{Minimum\ Stock\ Level\ (MSL)},\ \mathbf{Minimum\ Order\ Quantity\ (MOQ)} \Big)$$
* If $\text{Minimum Stock Level}$ is 400 units, but supplier's $\text{Minimum Order Quantity}$ is 1,000 units, the system floors the reorder threshold at 1,000 units.

---

### Formula 3: Reorder Quantity (ROQ) / Net Stock Position
$$\mathbf{Reorder\ Quantity\ (ROQ)} = \mathbf{Open\ Purchase\ Orders} + \mathbf{In\text{-}Transit\ Stock} + \mathbf{Current\ Stock\ on\ Hand} - \mathbf{Reorder\ Level\ (ROL)}$$
* A **negative ROQ** indicates an inventory deficit (you are below the reorder point).
* A **positive ROQ** indicates a surplus (you hold excess inventory above the reorder point).

---

### Formula 4: Action Status / Reorder Trigger
$$\mathbf{Action} = \begin{cases} 
\mathbf{REORDER\ NOW} & \text{if } \Big(\mathbf{Current\ Stock\ on\ Hand} + \mathbf{Open\ Purchase\ Orders} + \mathbf{In\text{-}Transit\ Stock}\Big) < \mathbf{Reorder\ Level\ (ROL)} \\
\mathbf{OK} & \text{otherwise}
\end{cases}$$

---

### Supporting Sub-Formulas Used Across EVM Screens:
* **True Open Purchase Orders (Pipeline Reconciliation from `Open_PO_which_are_in_pipeline.png`):**
  $$\mathbf{True\ Open\ Purchase\ Orders} = \mathbf{Tally\ Outstanding\ Purchase\ Order\ Total} - \mathbf{Total\ In\text{-}Transit\ Shipments}$$
* **Available Stock (CRM Inventory Reservation from `hundia_stock_summary_2.0.png`):**
  $$\mathbf{Available\ Stock} = \mathbf{Current\ Physical\ Stock\ in\ Warehouse} - \mathbf{Allocated\ Reserved\ Stock}$$

---

## 2. Why This Breaks in E-Commerce
* **$\text{Monthly Selling Plan (MSP)}$ is static:** It is typed once and rarely touched for months.
* **Safety Stock ($\text{SS}$) is literally $0$:** The column exists in Procura, but EVM leaves it hardcoded to zero across all 717 SKUs.
* **$\text{Procurement Time}$ is assumed fixed:** The formula assumes suppliers always deliver in exactly 30 days, ignoring real-world customs and factory delays (POs currently up to 78 days overdue).

---

## 3. Our Dynamic E-Commerce MSL Solution (Fully Unabbreviated)

We replace the static manual $\frac{\text{Monthly Selling Plan}}{30}$ with an empirical **Dynamic Daily Run Rate (Dynamic DRR)** and replace zero safety stock with a **Statistical Safety Buffer**:

### Step 1: Dynamic Daily Run Rate (DRR) Calculation
$$\mathbf{Dynamic\ Daily\ Run\ Rate} = \Bigg[ \Big(0.50 \times \mathbf{DRR}_{\text{Trailing 7 Days}}\Big) + \Big(0.30 \times \mathbf{DRR}_{\text{Trailing 14 Days}}\Big) + \Big(0.20 \times \mathbf{DRR}_{\text{Trailing 30 Days}}\Big) \Bigg] \times \mathbf{Event\ Multiplier}$$
* **$\text{DRR}_{\text{Trailing 7 Days}}$:** Moving average sales velocity per day over the last 7 calendar days (highest weight for fast market shifts).
* **$\text{DRR}_{\text{Trailing 14 Days}}$:** Moving average sales velocity per day over the last 14 calendar days (stabilizer).
* **$\text{DRR}_{\text{Trailing 30 Days}}$:** Moving average sales velocity per day over the last 30 calendar days (baseline trend).
* **$\text{Event Multiplier}$:** Expected demand spike factor for upcoming sales (e.g., $1.0\times$ normal, $1.8\times$ for Flipkart Big Billion Days, $2.1\times$ for Amazon Great Indian Festival).

---

### Step 2: Statistical Safety Stock (SS)
$$\mathbf{Safety\ Stock} = Z_{\text{Service Level}} \times \sqrt{\left( \mathbf{Actual\ Average\ Lead\ Time} \times \sigma^2_{\text{Daily Demand}} \right) + \left( \mathbf{Average\ Daily\ Run\ Rate}^2 \times \sigma^2_{\text{Lead Time}} \right)}$$
* **$Z_{\text{Service Level}}$:** Statistical confidence factor ($1.65$ for 95% service level / 5% stockout risk, $2.33$ for 99% service level on top-tier revenue SKUs).
* **$\sigma_{\text{Daily Demand}}$:** Standard deviation of daily e-commerce order units over trailing 90 days (demand volatility).
* **$\mathbf{Actual\ Average\ Lead\ Time}$:** Historical measured calendar days from Purchase Order placement to Warehouse Goods Receipt (replacing static quoted Procurement Time).
* **$\sigma_{\text{Lead Time}}$:** Standard deviation of actual vendor delivery times (supplier unreliability buffer).

---

### Step 3: Final Dynamic MSL Formula
$$\mathbf{Dynamic\ Minimum\ Stock\ Level\ (Dynamic\ MSL)} = \Big( \mathbf{Dynamic\ Daily\ Run\ Rate} \times \mathbf{Actual\ Average\ Lead\ Time} \Big) + \mathbf{Safety\ Stock}$$

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
