import { z } from "zod";

export const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  discountPercent: z.number().min(0).max(100).default(0),
  taxConfigId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const salesOrderInputSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  shippingAddressId: z.string().optional().nullable(),
  orderDate: z.string().min(1, "Order date is required"),
  expectedDeliveryDate: z.string().optional().nullable(),
  items: z.array(salesOrderItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  paymentTermsDays: z.number().min(0).default(30),
  shippingMethod: z.string().optional(),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum([
    "ORDER_RECEIVED",
    "PRODUCTION_PLANNING",
    "SOURCING_IN_PROGRESS",
    "MATERIALS_RECEIVED",
    "MANUFACTURING",
    "QC_IN_PROGRESS",
    "QC_APPROVED",
    "QC_HOLD",
    "QC_REJECTED",
    "READY_TO_PACK",
    "PACKING",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "INVOICED",
    "PAYMENT_RECEIVED",
    "COMPLETED",
    "ON_HOLD",
    "CANCELLED",
    "RETURNED",
  ]),
  remarks: z.string().optional(),
});

export const productionPlanSchema = z.object({
  salesOrderId: z.string().min(1, "Sales order is required"),
  plannedStartDate: z.string().min(1, "Start date is required"),
  plannedEndDate: z.string().min(1, "End date is required"),
  batchSize: z.number().min(1, "Batch size required"),
  notes: z.string().optional(),
});

export const purchaseOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  expectedDeliveryDate: z.string().optional(),
});

export const purchaseOrderInputSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
  paymentTermsDays: z.number().min(0).default(30),
});

export const grnItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1),
  receivedQuantity: z.number().min(0),
  acceptedQuantity: z.number().min(0),
  rejectedQuantity: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const grnInputSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase order is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  items: z.array(grnItemSchema).min(1),
  notes: z.string().optional(),
});

export const qcReportSchema = z.object({
  productionRecordId: z.string().min(1, "Production record is required"),
  productId: z.string().min(1, "Product is required"),
  status: z.enum(["PENDING", "IN_PROGRESS", "APPROVED", "ON_HOLD", "REJECTED"]),
  remarks: z.string().optional(),
  testResults: z.record(z.any()).optional(),
});

export const shipmentSchema = z.object({
  salesOrderId: z.string().min(1, "Sales order is required"),
  courierName: z.string().optional(),
  awbNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
  shipDate: z.string().optional(),
  expectedDelivery: z.string().optional(),
  weightKg: z.number().optional(),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().optional(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).default(0),
  cgstPercent: z.number().min(0).default(0),
  sgstPercent: z.number().min(0).default(0),
  igstPercent: z.number().min(0).default(0),
});

export const invoiceInputSchema = z.object({
  salesOrderId: z.string().min(1, "Sales order is required"),
  customerId: z.string().min(1, "Customer is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  items: z.array(invoiceItemSchema).min(1),
  notes: z.string().optional(),
});

export const paymentInputSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  customerId: z.string().min(1, "Customer is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "RAZORPAY", "CREDIT_NOTE"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});
