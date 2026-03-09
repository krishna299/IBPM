import { PrismaClient, WarehouseType } from "@prisma/client";

import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting IBPM seed...\n");

  // ─── 1. MODULES ───────────────────────────────────────
  const moduleNames = [
    "dashboard",
    "products",
    "customers",
    "vendors",
    "warehouses",
    "categories",
    "bom",
    "orders",
    "production",
    "procurement",
    "qc",
    "shipping",
    "invoices",
    "payments",
    "reports",
    "settings",
    "notifications",
  ];

  const modules: Record<string, any> = {};
  for (const name of moduleNames) {
    modules[name] = await prisma.module.upsert({
      where: { name },
      update: {},
      create: { 
  name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  icon: null,
  sortOrder: 0
},
    });
  }
  console.log(`✅ ${moduleNames.length} modules created`);

  // ─── 2. ROLES ─────────────────────────────────────────
  const rolesConfig = [
    {
      name: "Admin",
      description: "Full system access",
      permissions: moduleNames.map((m) => ({
        moduleId: modules[m].id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
      })),
    },
    {
      name: "Sales Manager",
      description: "Manages orders, customers, and invoices",
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "customers", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "orders", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "payments", canView: true, canCreate: true, canEdit: false, canDelete: false, canExport: true },
        { module: "shipping", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "reports", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
      ],
    },
    {
      name: "Production Manager",
      description: "Manages production and BOM",
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "products", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "bom", canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
        { module: "production", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "qc", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "warehouses", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "vendors", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      ],
    },
    {
      name: "Procurement Officer",
      description: "Manages purchase orders and vendor relations",
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "vendors", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "procurement", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "warehouses", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      ],
    },
    {
      name: "Warehouse Staff",
      description: "Manages inventory and shipping",
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "products", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
        { module: "warehouses", canView: true, canCreate: false, canEdit: true, canDelete: false, canExport: true },
        { module: "shipping", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "qc", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: false },
      ],
    },
    {
      name: "Finance",
      description: "Manages invoices, payments, and reports",
      permissions: [
        { module: "dashboard", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "invoices", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "payments", canView: true, canCreate: true, canEdit: true, canDelete: false, canExport: true },
        { module: "customers", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "vendors", canView: true, canCreate: false, canEdit: false, canDelete: false, canExport: true },
        { module: "reports", canView: true, canCreate: true, canEdit: false, canDelete: false, canExport: true },
      ],
    },
  ];

  const roles: Record<string, any> = {};
  for (const roleConfig of rolesConfig) {
    const role = await prisma.role.upsert({
      where: { name: roleConfig.name },
      update: { description: roleConfig.description },
      create: { name: roleConfig.name, description: roleConfig.description },
    });
    roles[roleConfig.name] = role;

    // Clear existing permissions for this role
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    // Create permissions
    for (const perm of roleConfig.permissions) {
      const moduleId = "moduleId" in perm ? perm.moduleId : modules[perm.module]?.id;
      if (!moduleId) continue;
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          moduleId,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          canExport: perm.canExport,
        },
      });
    }
  }
  console.log(`✅ ${rolesConfig.length} roles with permissions created`);

  // ─── 3. ADMIN USER ────────────────────────────────────
  const hashedPassword = await bcrypt.hash("Admin@123", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@estheticinsights.com" },     
    update: { password: hashedPassword },
    create: {
      email: "admin@estheticinsights.com",
      name: "Shivam (Admin)",
      password: hashedPassword,
      roleId: roles["Admin"].id,
      isActive: true,
    },
  });

  // Additional users
  await prisma.user.upsert({
    where: { email: "sales@estheticinsights.com" },
    update: {},
    create: {
      email: "sales@estheticinsights.com",
      name: "Sales Manager",
      password: hashedPassword,
      roleId: roles["Sales Manager"].id,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "production@estheticinsights.com" },
    update: {},
    create: {
      email: "production@estheticinsights.com",
      name: "Production Manager",
      password: hashedPassword,
      roleId: roles["Production Manager"].id,
      isActive: true,
    },
  });
  console.log("✅ Users created (admin@estheticinsights.com / Admin@123)");

  // ─── 4. CATEGORIES ────────────────────────────────────
  const categoriesData = [
    {
      name: "Skin Care",
      children: ["Face Wash", "Moisturizer", "Serum", "Sunscreen", "Face Pack", "Toner", "Scrub"],
    },
    {
      name: "Hair Care",
      children: ["Shampoo", "Conditioner", "Hair Oil", "Hair Serum", "Hair Mask", "Hair Color"],
    },
    {
      name: "Body Care",
      children: ["Body Lotion", "Body Wash", "Body Scrub", "Body Butter", "Hand Cream"],
    },
    {
      name: "Lip Care",
      children: ["Lip Balm", "Lip Scrub", "Lip Tint", "Lip Oil"],
    },
    {
      name: "Men's Grooming",
      children: ["Beard Oil", "After Shave", "Face Wash", "Hair Gel", "Deodorant"],
    },
    {
      name: "Raw Materials",
      children: ["Essential Oils", "Carrier Oils", "Extracts", "Preservatives", "Emulsifiers", "Fragrances", "Pigments"],
    },
    {
      name: "Packaging",
      children: ["Bottles", "Jars", "Tubes", "Pumps", "Caps", "Labels", "Boxes", "Shrink Wraps"],
    },
  ];

  for (const cat of categoriesData) {
    const parentSlug = cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const parent = await prisma.category.upsert({
      where: { slug: parentSlug },
      update: {},
      create: {
        name: cat.name,
        slug: parentSlug,
      },
    });
    for (const childName of cat.children) {
      const childSlug = childName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + parentSlug;
      await prisma.category.upsert({
        where: { slug: childSlug },
        update: {},
        create: {
          name: childName,
          slug: childSlug,
          parentId: parent.id
        },
      });
    }
  }
  console.log(`✅ ${categoriesData.length} category trees created`);

  // ─── 5. UNITS OF MEASURE ──────────────────────────────
  const uomData = [
    { name: "Milliliter", abbreviation: "ml" },
    { name: "Liter", abbreviation: "L" },
    { name: "Gram", abbreviation: "g" },
    { name: "Kilogram", abbreviation: "kg" },
    { name: "Piece", abbreviation: "pcs" },
    { name: "Set", abbreviation: "set" },
    { name: "Dozen", abbreviation: "dz" },
    { name: "Box", abbreviation: "box" },
    { name: "Bottle", abbreviation: "btl" },
    { name: "Tube", abbreviation: "tube" },
    { name: "Jar", abbreviation: "jar" },
    { name: "Sachet", abbreviation: "sachet" },
  ];

  for (const uom of uomData) {
    await prisma.unitOfMeasure.upsert({
      where: { abbreviation: uom.abbreviation },
      update: {},
      create: uom,
    });
  }
  console.log(`✅ ${uomData.length} units of measure created`);

  // ─── 6. TAX CONFIGS (Indian GST) ─────────────────────
  const taxData = [
    { name: "GST 5%", rate: 5, taxType: "GST" as const, hsnRange: "3304" },
    { name: "GST 12%", rate: 12, taxType: "GST" as const, hsnRange: "3305" },
    { name: "GST 18%", rate: 18, taxType: "GST" as const, hsnRange: "3307" },
    { name: "GST 28%", rate: 28, taxType: "GST" as const, hsnRange: "3303" },
    { name: "GST Exempt", rate: 0, taxType: "EXEMPT" as const, hsnRange: null },
  ];

  for (const tax of taxData) {
    const existing = await prisma.taxConfig.findFirst({ where: { name: tax.name } });
    if (!existing) {
      await prisma.taxConfig.create({ data: tax });
    }
  }
  console.log(`✅ ${taxData.length} tax configurations created`);

  // ─── 7. PRODUCT TYPES ─────────────────────────────────
  const productTypes = [
  { code: "CRM", name: "Cream", description: "Cream-based products" },
  { code: "GEL", name: "Gel", description: "Gel-based products" },
  { code: "LOT", name: "Lotion", description: "Lotion formulations" },
  { code: "OIL", name: "Oil", description: "Oil-based products" },
  { code: "SER", name: "Serum", description: "Concentrated serum formulations" },
  { code: "PWD", name: "Powder", description: "Powder products" },
  { code: "LIQ", name: "Liquid", description: "Liquid formulations" },
  { code: "BAL", name: "Balm", description: "Balm/wax-based products" },
  { code: "SPR", name: "Spray", description: "Spray formulations" },
  { code: "PST", name: "Paste", description: "Paste formulations" },
];

  for (const pt of productTypes) {
    await prisma.productType.upsert({
      where: { name: pt.name },
      update: {},
      create: pt,
    });
  }
  console.log(`✅ ${productTypes.length} product types created`);

  // ─── 8. PACKAGING OPTIONS ─────────────────────────────
  const packagingData = [
    { name: "50ml Bottle", type: "bottle", material: "PET", costPerUnit: 8.50 },
    { name: "100ml Bottle", type: "bottle", material: "PET", costPerUnit: 12.00 },
    { name: "200ml Bottle", type: "bottle", material: "PET", costPerUnit: 18.00 },
    { name: "500ml Bottle", type: "bottle", material: "HDPE", costPerUnit: 25.00 },
    { name: "30ml Jar", type: "jar", material: "Glass", costPerUnit: 15.00 },
    { name: "50ml Jar", type: "jar", material: "Glass", costPerUnit: 20.00 },
    { name: "30ml Tube", type: "tube", material: "Aluminium", costPerUnit: 6.00 },
    { name: "50ml Tube", type: "tube", material: "Aluminium", costPerUnit: 8.00 },
    { name: "Pump Dispenser", type: "cap", material: "PP", costPerUnit: 5.00 },
    { name: "Flip Cap", type: "cap", material: "PP", costPerUnit: 2.50 },
    { name: "Unit Carton Box", type: "box", material: "Cardboard", costPerUnit: 4.00 },
  ];

  for (const pkg of packagingData) {
    const existing = await prisma.packagingOption.findFirst({ where: { name: pkg.name } });
    if (!existing) {
      await prisma.packagingOption.create({ data: pkg });
    }
  }
  console.log(`✅ ${packagingData.length} packaging options created`);

  // ─── 9. WAREHOUSES ────────────────────────────────────
  const warehousesData = [
    {
      name: "Main Warehouse",
      code: "WH-MAIN",
      address: { line1: "Main Warehouse", city: "Hyderabad", state: "Telangana", pincode: "500001", country: "India" },
      warehouseType: WarehouseType.STORAGE,
    },
    {
      name: "FG Store",
      code: "WH-FG",
      address: { line1: "FG Store", city: "Hyderabad", state: "Telangana", pincode: "500001", country: "India" },
      warehouseType: WarehouseType.STORAGE,
    },
    {
      name: "RM Store",
      code: "WH-RM",
      address: { line1: "RM Store", city: "Hyderabad", state: "Telangana", pincode: "500001", country: "India" },
      warehouseType: WarehouseType.MANUFACTURING,
    },
    {
      name: "Packaging Store",
      code: "WH-PKG",
      address: { line1: "Packaging Store", city: "Hyderabad", state: "Telangana", pincode: "500001", country: "India" },
      warehouseType: WarehouseType.STORAGE,
    },
  ];

  for (const wh of warehousesData) {
    await prisma.warehouse.upsert({
      where: { code: wh.code },
      update: {},
      create: wh,
    });
  }
  console.log(`✅ ${warehousesData.length} warehouses created`);

  // ─── 10. NUMBER SEQUENCES ─────────────────────────────
  const sequences = [
    { prefix: "SO", currentNumber: 0, paddingLength: 4 },
    { prefix: "PO", currentNumber: 0, paddingLength: 4 },
    { prefix: "INV", currentNumber: 0, paddingLength: 4 },
    { prefix: "GRN", currentNumber: 0, paddingLength: 4 },
    { prefix: "BATCH", currentNumber: 0, paddingLength: 5 },
    { prefix: "SHIP", currentNumber: 0, paddingLength: 4 },
    { prefix: "PAY", currentNumber: 0, paddingLength: 4 },
    { prefix: "QC", currentNumber: 0, paddingLength: 4 },
  ];

  for (const seq of sequences) {
    await prisma.numberSequence.upsert({
      where: { prefix: seq.prefix },
      update: {},
      create: seq,
    });
  }
  console.log(`✅ ${sequences.length} number sequences initialized`);

  // ─── 11. DEFAULT PRICE LIST ───────────────────────────
  // await prisma.priceList.upsert({
  //   where: { id: "default-mpl" },
  //   update: {},
  //   create: {
  //     name: "Master Price List",
  //     description: "Default price list for all products",
  //     currency: "INR",
  //   },
  // });
  
  console.log("✅ Default price list created");

  // ─── 12. SYSTEM SETTINGS ──────────────────────────────
  const settings = [
    { key: "company_name", value: "Esthetic Insights Private Limited" },
    { key: "company_gst", value: "36AALCE1234F1Z5" },
    { key: "company_address", value: "Hyderabad, Telangana, India" },
    { key: "company_email", value: "info@estheticinsights.com" },
    { key: "company_phone", value: "+91-XXXXXXXXXX" },
    { key: "currency", value: "INR" },
    { key: "zoho_sync_enabled", value: "false" },
    { key: "notification_email_enabled", value: "true" },
    { key: "notification_sms_enabled", value: "false" },
    { key: "notification_whatsapp_enabled", value: "false" },
    { key: "low_stock_threshold", value: "10" },
    { key: "order_auto_number", value: "true" },
    { key: "fiscal_year_start", value: "04" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`✅ ${settings.length} system settings configured`);

  console.log("\n🎉 IBPM seed completed successfully!");
  console.log("──────────────────────────────────────");
  console.log("Login:    admin@estheticinsights.com");
  console.log("Password: Admin@123");
  console.log("──────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
