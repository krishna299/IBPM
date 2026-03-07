/**
 * Zoho Books Integration - One-way push from IBPM → Zoho
 *
 * Modules:
 * - contacts: Customers → Zoho Contacts (customer), Vendors → Zoho Contacts (vendor)
 * - items: Products (FG/RM/PM) → Zoho Items
 * - invoices: Invoices → Zoho Invoices (with auto-sync of customer + items)
 * - payments: Payments → Zoho Customer Payments
 * - bills: Purchase Orders → Zoho Bills (with auto-sync of vendor + items)
 */

export { pushCustomerToZoho, pushVendorToZoho } from "./contacts";
export { pushProductToZoho, pushAllProductsToZoho } from "./items";
export { pushInvoiceToZoho } from "./invoices";
export { pushPaymentToZoho } from "./payments";
export { pushPurchaseOrderToZoho } from "./bills";
export { logZohoSync } from "./client";
