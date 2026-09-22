# Chunk 6 — Dashboard, Alerts & Approval Workflow 📱

> The user-facing layer. Everything in Chunks 1-5 is invisible unless surfaced through clear UI and timely notifications.

---

## Core Principle

> **Recommend, don't auto-execute.** (V1 is recommend-only. Prashant reviews and approves. No automated MSL changes without human sign-off.)

---

## Dashboard Views

### 1. MSL Health Overview (Home Screen)

```
┌─────────────────────────────────────────────────────┐
│  InventoryIQ — E-Commerce MSL Dashboard             │
│                                                     │
│  🟢 Healthy: 412 SKUs    🟡 Watch: 187 SKUs        │
│  🟠 At Risk: 89 SKUs     🔴 Critical: 29 SKUs      │
│                                                     │
│  Capital in Inventory: ₹18.4 Cr                     │
│  Capital in Surplus:   ₹3.2 Cr  (17.4%)            │
│  Pending Actions:      12 recommendations           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  🔔 Alerts Today                            │    │
│  │  • 3 SKUs need MSL increase (sale in 8 days)│    │
│  │  • 2 POs overdue > 60 days                  │    │
│  │  • 1 SKU reclassified: CY → AZ             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### 2. SKU Deep Dive

Click any SKU for:
- **DRR Chart:** 90-day DRR trend with 7/14/30d moving averages
- **MSL Comparison:** Current (static) vs Recommended (dynamic) with reasoning
- **Stock Position:** Current stock, Open PO, In-transit, Available = Stock - Allocated
- **Per-Warehouse Breakdown:** Stock at each of the 6 locations
- **Per-Channel DRR:** Amazon vs Flipkart vs D2C demand split
- **Safety Stock:** Current (0) vs Recommended with formula breakdown
- **ABC/XYZ Class:** Current classification with revenue/variability metrics
- **Capital Analysis:** Capital locked, holding cost, ROI estimate
- **Action buttons:** Approve MSL change, Snooze, Dismiss, Add to review

### 3. Sale Event Calendar

```
┌─────────────────────────────────────────────────────┐
│  📅 Upcoming Events                                 │
│                                                     │
│  Oct 5-12: Amazon Great Indian Festival             │
│    Expected DRR multiplier: 2.1x (based on GIF '25)│
│    SKUs impacted: 145                               │
│    MSL adjustments pending: 32                      │
│    Status: ⚡ PRE-SALE PREP                         │
│                                                     │
│  Oct 20-25: Flipkart Big Billion Days              │
│    Expected DRR multiplier: 1.8x                    │
│    SKUs impacted: 120                               │
│    MSL adjustments pending: 0 (not yet generated)   │
│    Status: 🕒 SCHEDULED                             │
│                                                     │
│  [+ Add Event]                                      │
└─────────────────────────────────────────────────────┘
```

### 4. Transfer Recommendations

```
┌─────────────────────────────────────────────────────┐
│  🚚 Transfer Suggestions                            │
│                                                     │
│  1. EVM-P0109-B (Power Bank Black)                  │
│     Bhiwandi → Delhi  |  2,000 units               │
│     Reason: Delhi stock = 0, Bhiwandi surplus 7,390 │
│     Transit: 2-3 days  |  Cost: ₹8,000             │
│     [Approve] [Modify] [Dismiss]                    │
│                                                     │
│  2. EVM-25/128GB (SSD 128GB)                        │
│     Bhiwandi → E-commerce  |  5,000 units           │
│     Reason: E-com warehouse stock below e-com MSL   │
│     Transit: Same day  |  Cost: ₹3,000              │
│     [Approve] [Modify] [Dismiss]                    │
└─────────────────────────────────────────────────────┘
```

### 5. Vendor Scorecard

```
┌─────────────────────────────────────────────────────┐
│  📊 Vendor Performance                              │
│                                                     │
│  Vendor              OTIF   Avg LT  LT Var  Score  │
│  ─────────────────────────────────────────────────  │
│  Global Connexions    95%   28 days   ±3     92/100 │
│  Yinghu International 91%   42 days   ±5     84/100 │
│  Brandworks Tech      87%   14 days   ±2     88/100 │
│  HK Nanotech          78%   35 days   ±8     65/100 │
│  CEHK Industry        72%   45 days   ±12    52/100 │
│                                                     │
│  ⚠️ HK Nanotech: PO overdue 78 days (₹1.59 Cr)    │
│  ⚠️ CEHK Industry: 2 POs overdue 59 days           │
└─────────────────────────────────────────────────────┘
```

---

## Alert & Notification System

### Alert Types

| Alert | Trigger | Channel | Urgency |
|---|---|---|---|
| **MSL Increase Needed** | DRR trending up + sale event approaching | WhatsApp + Email + Dashboard | HIGH |
| **MSL Decrease Recommended** | DRR declining + surplus growing | Dashboard + Email | MEDIUM |
| **Stockout Imminent** | Stock + Pipeline < 7 days of DRR | WhatsApp (immediate) | CRITICAL |
| **PO Overdue** | PO past due date by > 7 days | Dashboard + Email | HIGH |
| **Overstocking Alert** | Surplus > 60 days of DRR | Dashboard | MEDIUM |
| **Dead Stock** | No sales in 90+ days | Monthly report | LOW |
| **SKU Reclassified** | ABC/XYZ class changed | Dashboard | INFO |
| **Sale Event Approaching** | T-14 days to event start | Dashboard + Email | HIGH |
| **Post-Sale Normalization** | T+3 days after event end | Dashboard | MEDIUM |

### Daily Morning Digest (6:30 AM IST)

```
📊 InventoryIQ Daily Digest — 22 Sep 2026

🔴 Critical (Action Required):
  • EVM-25/128GB: Stock 73,586 vs MSL 75,000. Only 2 days until stockout.
    Current DRR: 2,500/day. No open PO. REORDER NOW.

🟠 Attention:
  • EVM-H61FHL: PO from HK Nanotech 78 days overdue (₹1.59 Cr).
    Stock covers 12 more days. Consider backup vendor.

🟡 Recommendations:
  • 3 SKUs need e-com MSL increase for upcoming GIF sale.
    View details: [link]

📈 Quick Stats:
  • Inventory Health Score: 72/100 (↓ 3 from yesterday)
  • Capital in surplus: ₹3.2 Cr
  • SKUs needing review: 12
```

Delivery: WhatsApp Business API (primary) + Email (backup)

### Weekly MSL Review Report (Monday 9 AM)

Auto-generated report:
- All MSL recommendations for the week
- DRR trends per category
- Upcoming events and required prep
- Overstocking/understocking summary
- Vendor performance flags

Format: PDF + Excel attachment

---

## Approval Workflow

```
              ┌──────────────┐
              │  Engine      │
              │  generates   │
              │  recommend-  │
              │  ation       │
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │  Dashboard   │
              │  shows reco  │
              │  with detail │
              └──────┬───────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
   ┌──────▼──┐ ┌────▼───┐ ┌───▼────┐
   │ APPROVE │ │ MODIFY │ │ DISMISS│
   │         │ │        │ │        │
   │ Apply   │ │ Adjust │ │ Record │
   │ MSL as  │ │ value  │ │ reason │
   │ recommend│ │ then   │ │ for    │
   │ ed      │ │ approve│ │ audit  │
   └────┬────┘ └────┬───┘ └───┬────┘
        │           │          │
        └─────┬─────┘          │
              │                │
       ┌──────▼───────┐  ┌────▼──────┐
       │ Push to      │  │ Log &     │
       │ Procura CRM  │  │ learn     │
       │ (via API)    │  │ from      │
       │              │  │ dismissal │
       └──────────────┘  └───────────┘
```

---

## Tech Stack (This Chunk)

| Component | Tech | Why |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Fast, modern, matches EVM's React stack |
| Charts | Recharts or Chart.js | DRR trends, inventory charts |
| Tables | TanStack Table | Sortable, filterable, paginated data grids |
| Notifications | AWS SES (email) + WhatsApp Business API | Reliable, scalable |
| Auth | Simple role-based (admin, viewer) | Prashant = admin, e-com team = viewers |
| Hosting | AWS S3 + CloudFront (static) + App Runner (API) | Cost-effective with credits |

---

## Prototype Scope (2-3 Days)

1. ✅ Basic dashboard with MSL health overview (table view)
2. ✅ SKU deep dive with DRR chart (mock data, Chart.js)
3. ✅ Side-by-side: Current (static) MSL vs Recommended (dynamic) MSL
4. ✅ Simple recommendation list with Approve/Dismiss buttons
5. ❌ Skip: WhatsApp integration, auth, write-back to Procura (V1)
6. ❌ Skip: Sale event calendar (V1)
