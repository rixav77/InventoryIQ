# Meeting Notes — EVM × Axiom Labs

**Discussion:** E-commerce Inventory / MSL Automation
**Context:** First pitch and discovery meeting

## 1. Meeting Objective

Axiom Labs met with the EVM team to demonstrate its automation capabilities and understand their current operational challenges.

The discussion started with a demonstration of **PriceWatcher**, followed by a detailed discussion around EVM's **inventory and MSL (Minimum Stock Level) management process**.

The main opportunity identified is to automate the currently manual process of deciding **when inventory needs to be replenished, whether existing in-transit inventory is sufficient, whether stock can be transferred internally, and how much needs to be reordered from vendors**.

---

## 2. Axiom Labs — Pitch & Demonstration

Axiom Labs positioned itself as a company that builds **custom automation systems with its own AI/backend infrastructure**, rather than relying only on generic workflow tools such as n8n or Make.

### PriceWatcher Demo

Axiom Labs demonstrated PriceWatcher using **10 EVM SKUs**.

During the demo, the system identified a price discrepancy between Amazon and Flipkart for one of the products:

* **Seller:** ClickTech Retail
* **Approx. discrepancy:** ₹100
* The discrepancy was identified automatically while building/testing PriceWatcher.

A screenshot of this discrepancy is to be shared with the EVM team after the meeting.

### Other Relevant Axiom Labs Work Mentioned

* **AuditFlow:** Finance/reconciliation automation for fintech and CA workflows.
* **Computer Vision solution:** 3D/CV-based stack counting for CenturyPly.

These examples were used to demonstrate Axiom Labs' ability to build domain-specific automation rather than only standard workflow integrations.

---

# 3. Main Problem Discussed — MSL & Inventory Automation

The main requirement from EVM is to automate its **inventory replenishment and stock-allocation process**.

At present, this process is handled manually by approximately **two people**, using a combination of:

* Google Sheets
* An existing internal **ReactJS + .NET application**
* Manual analysis and decision-making

The goal is to reduce this manual effort by building a system that can automatically evaluate inventory conditions and determine the appropriate action.

---

## 4. Core Business Requirement

For each product/SKU, the system needs to determine:

> **Do we actually need to place a new order with the vendor, or is the required inventory already available/coming through the existing supply chain?**

This decision cannot be based only on current warehouse stock.

The system needs to consider:

1. Current inventory
2. MSL requirements
3. E-commerce inventory requirements
4. Inventory in transit / pipeline
5. Existing purchase orders
6. Stock available at other warehouses/channels
7. Vendor MOQ
8. Vendor lead time

---

# 5. MSL — Minimum Stock Level

EVM maintains a **Minimum Stock Level (MSL)** for its inventory.

The MSL represents the minimum quantity of stock that should normally be maintained for a particular product/location/channel.

If available inventory falls below the relevant MSL, the system should investigate whether replenishment is actually required.

Importantly:

> **Stock falling below MSL should not automatically mean "place a new vendor order."**

The system must first evaluate existing pipeline inventory and internal stock-transfer possibilities.

---

# 6. Pipeline / In-Transit Inventory

EVM sources products from vendors, including suppliers based in locations such as:

* China
* Taiwan
* Hong Kong

The expected lead time can be approximately **30–60 days**.

Therefore, a product may already have been ordered from a vendor but may not yet have reached the warehouse.

This inventory is effectively **pipeline / in-transit inventory**.

Example:

```text
Current warehouse stock = 150
MSL                    = 200
Already ordered        = 500
500 units              = currently in transit
```

A simple MSL rule would incorrectly conclude that inventory needs to be reordered because:

```text
150 < 200
```

The automation instead needs to consider the **500 units already in the pipeline** before generating another purchase recommendation.

This is a key requirement of the solution.

---

# 7. E-commerce Inventory Has Separate Requirements

EVM highlighted that **e-commerce inventory is treated separately from the broader inventory pool**.

E-commerce has its own:

* MSL requirements
* Inventory priorities
* Stock allocation requirements

Therefore, the system cannot simply move inventory from one location/channel to another whenever a shortage occurs.

For example:

```text
Warehouse A
    ↓
Can transfer stock?
    ↓
Check whether transfer causes
Warehouse A / other channel
to fall below its own required MSL
```

The system should only recommend a transfer when doing so does not create another unacceptable shortage.

---

# 8. Internal Transfer vs. New Purchase

A key decision in the automation is:

> **Can the requirement be fulfilled using existing inventory somewhere else, or does EVM actually need to purchase additional units from a vendor?**

The decision flow is therefore expected to look roughly like:

```text
Current stock below required MSL?
             │
             ↓
      Check pipeline /
      in-transit stock
             │
             ↓
 Is incoming stock sufficient?
        ┌────┴────┐
       YES        NO
        │          │
     No new     Check other
      order     warehouses /
                 channels
                    │
                    ↓
             Can stock be
             transferred?
              ┌────┴────┐
             YES        NO
              │          │
          Transfer     Reorder
           stock       vendor
                         │
                         ↓
                    Apply MOQ
```

The exact business rules still need to be confirmed with EVM.

---

# 9. MOQ — Minimum Order Quantity

Vendor orders also need to follow the supplier's **Minimum Order Quantity (MOQ)**.

For example:

```text
Required additional quantity = 200
Vendor MOQ                   = 500
```

The system cannot simply recommend an order for 200 units if the vendor requires a minimum order of 500.

Therefore, the final reorder quantity must account for the relevant vendor MOQ.

---

# 10. Expected Automation

The proposed system is expected to evaluate inventory at the **SKU level** and produce a recommended action.

For each SKU, the system should ideally be able to answer:

* What is the current stock?
* Where is that stock located?
* What is the applicable MSL?
* What is the e-commerce MSL/requirement?
* Is there inventory already in transit?
* Are there existing purchase orders?
* When will pipeline inventory arrive?
* Can inventory be transferred from another warehouse/channel?
* Would a transfer violate another location/channel's minimum stock requirement?
* If a vendor reorder is required, what quantity should be ordered considering MOQ?
* Why was this action recommended?

The final output could therefore be something such as:

```text
SKU: ABC123

Current stock:              120
MSL:                        200
Pipeline stock:             50
E-commerce requirement:     80
Transfer available:         0

Decision: REORDER
Recommended quantity:      500
Reason: Existing + pipeline stock
        insufficient to maintain required stock.
```

The exact fields and business rules will be finalized after further discussion with EVM.

---

# 11. Current Process

The current workflow is largely manual.

Approximately two people are involved in monitoring inventory and making replenishment decisions using:

**Google Sheets + existing ReactJS/.NET internal tooling + manual analysis**

The proposed automation should therefore ideally integrate with or work around the **existing systems**, rather than assuming that the existing infrastructure needs to be completely replaced.

A key discovery task will be understanding:

* What data already exists in the internal tool
* What data is maintained in Google Sheets
* How MSL values are defined
* How e-commerce inventory is represented
* How purchase orders and in-transit inventory are tracked
* How warehouse transfers are currently decided
* What outputs the operations team currently generates

---

# 12. Client Point of Contact

**Prashant** will be the primary and continuing point of contact from the client side for the **IT, automation, and operational workflow**.

He will help clarify the current process, data sources, business rules, and desired output.

---

# 13. Commercial Discussion

No pricing was requested at this stage.

The expectation is to first understand the workflow and prepare a **first-iteration solution proposal**.

Pricing can subsequently be discussed based on:

* Scope of automation
* Infrastructure requirements
* Integration requirements
* Development effort
* Expected operational impact

---

# 14. Agreed Next Steps

### Axiom Labs

1. Share the screenshot showing the Amazon vs. Flipkart price discrepancy identified during the PriceWatcher work.
2. Share Prashant's contact details with Shyam over WhatsApp.
3. Brainstorm and document the MSL/inventory automation workflow.
4. Prepare a questionnaire to clarify EVM's specific business rules and data requirements.
5. Prepare the **first iteration of the proposed MSL automation solution within 2–3 days**.
6. Reach out to Prashant to share the proposed approach and schedule a review/discussion.

### EVM

Prashant will provide the required operational and technical clarification around the existing inventory process and help validate the proposed workflow.

---

# 15. Key Understanding from the Meeting

The problem is **not simply "automatically reorder whenever stock falls below MSL."**

The actual requirement is closer to:

> **For every SKU, determine whether the business has sufficient effective supply considering current inventory, inventory already in transit, e-commerce requirements, other warehouse/channel inventory, and internal transfer possibilities. Only when the requirement cannot be satisfied internally should the system recommend a vendor reorder, while respecting vendor MOQ and lead time.**

The first iteration should therefore focus on **understanding and formalizing this decision-making process** before implementation.
