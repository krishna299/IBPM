import { z } from "zod";

export const productSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional(),
  itemType: z.enum(["FG", "RM", "PM", "CONSUMABLE"]),
  hsnCode: z.string().optional(),
  sellingPrice: z.number().min(0).default(0),
  costPrice: z.number().min(0).default(0),
  weightG: z.number().optional().nullable(),
  volumeMl: z.number().optional().nullable(),
  shelfLifeMonths: z.number().int().optional().nullable(),
  reorderLevel: z.number().int().min(0).default(0),
  isComposite: z.boolean().default(false),
  isActive: z.boolean().default(true),
  categoryId: z.string().optional().nullable(),
  productTypeId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  taxConfigId: z.string().optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const customerSchema = z.object({
  customerType: z.enum(["B2B", "B2C", "DISTRIBUTOR"]),
  companyName: z.string().optional(),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  altPhone: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  billingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    country: z.string().default("India"),
  }),
  paymentTermsDays: z.number().int().min(0).default(0),
  creditLimit: z.number().min(0).default(0),
  priceListId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const vendorSchema = z.object({
  vendorType: z.enum(["RAW_MATERIAL", "PACKAGING", "LOGISTICS", "OTHER"]),
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    country: z.string().default("India"),
  }),
  leadTimeDays: z.number().int().min(0).default(7),
  paymentTermsDays: z.number().int().min(0).default(30),
  rating: z.number().min(1).max(5).default(3),
  notes: z.string().optional(),
});

export type VendorInput = z.infer<typeof vendorSchema>;

export const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().min(1, "Code is required").max(10),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    country: z.string().default("India"),
  }),
  warehouseType: z.enum(["MANUFACTURING", "STORAGE", "DISPATCH"]),
  managerId: z.string().optional().nullable(),
});

export type WarehouseInput = z.infer<typeof warehouseSchema>;
