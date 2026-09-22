# EVM Zone Inventory/PO System - Screenshots Analysis (Batch 2)

## 1. OP_orders.png & 3. open_po.png
**Screen/Module:** Procura -> Purchase Orders -> Open Purchase Order
**Visible Fields:** Date, Order #, Vendor, Item Name, Ordered Qty, Balance Qty, Rate, Value, Due On, Days Overdue.
**Business Logic Implied:** Displays outstanding POs. Quantities are explicitly synced from Tally ("Outstanding purchase order quantities synced from Tally (Due Only)"). Overdue days are color-coded. Notably, negative quantities are supported (e.g., -6000 PCS), which might indicate returns or adjustments.
**Data Model Insights:** POs belong to a Vendor and have line items with ordered and balance quantities, rates, and due dates.
**Relevance for InventoryIQ:** Must support two-way or one-way sync with Tally for outstanding quantities. Handling of negative quantities is critical. Overdue tracking is a key metric.

## 2. Open_PO_which_are_in_pipeline.png
**Screen/Module:** Open PO Details Modal (for specific item)
**Visible Fields:** PO No., PO Date, Party, Tally Item, Rate (order currency), Ordered. Summary: Tally outstanding total, Less in-transit, Open PO (as shown in grid).
**Business Logic Implied:** Shows a reconciliation view. Tally tracks outstanding quantity per PO line, while "in-transit" is tracked per shipment. The system deducts in-transit from the Tally outstanding total to give the true "Open PO" quantity. Supports currency toggling (Order currency vs INR).
**Data Model Insights:** Clear separation between PO line quantities (Tally driven) and In-transit quantities (Shipment driven).
**Relevance for InventoryIQ:** This reconciliation logic (Tally Outstanding - In-Transit = True Open PO) is the core formula for pipeline visibility.

## 4. PIMS_and_Admin_Dashboard.png
**Screen/Module:** Application Sidebar
**Visible Fields:** Icons for Admin/Users, Documents/Orders, Inventory/Boxes, Settings.
**Business Logic Implied:** Standard modular enterprise app structure.
**Relevance for InventoryIQ:** Confirms the main functional domains: Admin, Procurement (Procura), and Inventory.

## 5. PO_details_1.png & 6. PO_detaiuls_2.png
**Screen/Module:** Procura -> Purchase Orders -> PO Details View
**Visible Fields:** PO Date, Due Date, Created By, Buyer (Billed To), Consignee (Ship To), Seller (Billed From), PO Type (e.g., Semi-Finished Goods), Currency, Shipment Terms (e.g., Ex Works), Warehouse, Sales Person, Reference No / Date, Dispatched Through Port.
**Business Logic Implied:** Complex multi-party POs (Buyer, Consignee, and Seller are distinct). POs are categorized by Type. Captures extensive international trade metadata (Ports, Incoterms).
**Data Model Insights:** PO entity has complex relationships to Address/Party entities (Buyer vs Consignee). 
**Relevance for InventoryIQ:** Must model these complex party relationships and support international shipping fields to accurately represent procurement.

## 7. PO_feilds.png
**Screen/Module:** Sidebar Menu (Purchase Orders expanded)
**Visible Fields:** New Purchase Order, Draft PO, PO History, Open Purchase Order, Tally Purchase Orders.
**Business Logic Implied:** Distinct workflows for drafting, open tracking, and historical lookup. "Tally Purchase Orders" suggests a specific view for synced orders vs native orders.
**Relevance for InventoryIQ:** Need to differentiate between native POs and Tally-synced POs.

## 8. PO_History.png
**Screen/Module:** Procura -> Purchase Orders -> PO History
**Visible Fields:** PO Number, Vendor, PO Date, Due Date, Status (Submitted, Under Custom Clearance), Synced Status (Synced), Reference (e.g., SH... linking to Shipment), Currency, Value, Created By, Items.
**Business Logic Implied:** Status tracking is prominent ("Under Custom Clearance"). Crucially, POs are linked to Shipment IDs (SH...). Displays Tally sync status.
**Data Model Insights:** PO has a Status enum. PO has a relationship to Shipment (likely Many-to-Many or Many-to-One).
**Relevance for InventoryIQ:** The PO -> Shipment link is the backbone of transit tracking. Status enums need to be strictly defined.

## 9. shipment_term_filter.png & 13. Screenshot 2026-09-22 at 12.00.12 PM.png
**Screen/Module:** New Purchase Order Form (Top Section)
**Visible Fields:** Vendor, Currency, PO Type, Role (Manufacturer), PO Date, Due Date, Shipment Terms (DAT, DDP, EXW, FAS, FCA, FOB), Supplier Name/Address, Beneficiary Address, Payment Terms, Reference, Ports, Warehouse, Bank Account, Common Month of Manufacture (MoM).
**Business Logic Implied:** Comprehensive data entry for international trade. Incoterms (Shipment Terms) are explicitly tracked.
**Data Model Insights:** PO requires detailed financial and logistical metadata upon creation.
**Relevance for InventoryIQ:** Need to capture and potentially use these Incoterms to determine ownership transfer points for inventory valuation.

## 10. Shipments.png
**Screen/Module:** Procura -> Shipments
**Visible Fields:** Shipment #, Vendor, Mode (Air, Sea), AWB / BL, BoE Number, BoE Date, CI Number, CI Date, Port/Airport ETD, Warehouse ETA.
**Business Logic Implied:** Tracks logistics lifecycle via key documents: Airway Bill/Bill of Lading (AWB/BL), Bill of Entry (BoE), Commercial Invoice (CI). Tracks estimated departure (ETD) and arrival (ETA).
**Data Model Insights:** Shipment is a core entity with Mode, Document References, and Schedule Dates.
**Relevance for InventoryIQ:** This is the primary module for "In-Transit" data. Accurate ETAs are critical for inventory forecasting.

## 11. Tally_incoming_data.png
**Screen/Module:** Admin -> Tally Incoming Data
**Visible Fields:** APIs: Bills Payable, Billwise Receivables, Credit/Debit Note Vouchers, Journal Vouchers, Ledger Balances, Payment Vouchers. Endpoints, Last Data Received, Status.
**Business Logic Implied:** Deep, real-time or near-real-time integration with Tally via APIs (push and pull).
**Data Model Insights:** Financial truth resides in Tally.
**Relevance for InventoryIQ:** The system acts as a front-end to Tally for many operations. Inventory valuation and payment tracking rely entirely on these syncs.

## 12. vendors.png
**Screen/Module:** Procura -> Vendors
**Visible Fields:** Code, Vendor Name, Email, Mobile, Country, Status, Actions.
**Business Logic Implied:** Standard vendor management with bulk update and export capabilities.
**Relevance for InventoryIQ:** Vendors are the root entity for all procurement activities.

## 14. Screenshot 2026-09-22 at 12.01.00 PM.png
**Screen/Module:** PO Details (Items section)
**Visible Fields:** Packaging Status (e.g., 0/3 master cartons packed), Item Name, Qty, Rate, Amount, Remarks, Serial Numbers (Start to End range).
**Business Logic Implied:** Serial numbers are allocated in continuous ranges directly at the PO level. Packaging tracks physical cartons.
**Data Model Insights:** PO Item -> Serial Number Range (1:1 or 1:N). PO -> Packaging/Carton status.
**Relevance for InventoryIQ:** Serialized inventory tracking starts before goods even arrive.

## 15. Screenshot 2026-09-22 at 7.31.48 PM.png
**Screen/Module:** New Purchase Order Form (Bottom Section)
**Visible Fields:** Items block, Spares block. Import Excel, Quick Add SKU/Spare.
**Business Logic Implied:** System explicitly differentiates between regular "Items" and "Spares". Both can be imported via Excel.
**Data Model Insights:** PO line items are categorized as either Product or Spare.
**Relevance for InventoryIQ:** Need to handle Spares differently than Finished Goods, potentially with different stocking rules or visibility requirements.
