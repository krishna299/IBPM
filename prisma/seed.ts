import { PrismaClient } from "@prisma/client";
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
    update: { passwordHash: hashedPassword },
    create: {
      email: "admin@estheticinsights.com",
      name: "Shivam (Admin)",
      passwordHash: hashedPassword,
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
      passwordHash: hashedPassword,
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
      passwordHash: hashedPassword,
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
    const parent = await prisma.category.upsert({
      where: { id: cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-cat" },
      update: {},
      create: { name: cat.name },
    });
    for (const childName of cat.children) {
      await prisma.category.upsert({
        where: { id: childName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
        update: {},
        create: { name: childName, parentId: parent.id },
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
    { name: "GST 5%", hsnCode: "3304", cgstPercent: 2.5, sgstPercent: 2.5, igstPercent: 5, cessPercent: 0 },
    { name: "GST 12%", hsnCode: "3305", cgstPercent: 6, sgstPercent: 6, igstPercent: 12, cessPercent: 0 },
    { name: "GST 18%", hsnCode: "3307", cgstPercent: 9, sgstPercent: 9, igstPercent: 18, cessPercent: 0 },
    { name: "GST 28%", hsnCode: "3303", cgstPercent: 14, sgstPercent: 14, igstPercent: 28, cessPercent: 0 },
    { name: "GST Exempt", hsnCode: "", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, cessPercent: 0 },
  ];

  for (const tax of taxData) {
    await prisma.taxConfig.upsert({
      where: { id: tax.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: {},
      create: tax,
    });
  }
  console.log(`✅ ${taxData.length} tax configurations created`);

  // ─── 7. PRODUCT TYPES ─────────────────────────────────
  const productTypes = [
    { name: "Cream", description: "Cream-based products" },
    { name: "Gel", description: "Gel-based products" },
    { name: "Lotion", description: "Lotion formulations" },
    { name: "Oil", description: "Oil-based products" },
    { name: "Serum", description: "Concentrated serum formulations" },
    { name: "Powder", description: "Powder products" },
    { name: "Liquid", description: "Liquid formulations" },
    { name: "Balm", description: "Balm/wax-based products" },
    { name: "Spray", description: "Spray formulations" },
    { name: "Paste", description: "Paste formulations" },
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
    { name: "50ml Bottle", materialType: "PET", size: "50ml", costPerUnit: 8.50 },
    { name: "100ml Bottle", materialType: "PET", size: "100ml", costPerUnit: 12.00 },
    { name: "200ml Bottle", materialType: "PET", size: "200ml", costPerUnit: 18.00 },
    { name: "500ml Bottle", materialType: "HDPE", size: "500ml", costPerUnit: 25.00 },
    { name: "30ml Jar", materialType: "Glass", size: "30ml", costPerUnit: 15.00 },
    { name: "50ml Jar", materialType: "Glass", size: "50ml", costPerUnit: 20.00 },
    { name: "100ml Jar", materialType: "Glass", size: "100ml", costPerUnit: 28.00 },
    { name: "30ml Tube", materialType: "Aluminium", size: "30ml", costPerUnit: 6.00 },
    { name: "50ml Tube", materialType: "Aluminium", size: "50ml", costPerUnit: 8.00 },
    { name: "100ml Tube", materialType: "Laminate", size: "100ml", costPerUnit: 10.00 },
    { name: "Pump Dispenser", materialType: "PP", size: "Standard", costPerUnit: 5.00 },
    { name: "Flip Cap", materialType: "PP", size: "Standard", costPerUnit: 2.50 },
    { name: "Dropper Cap", materialType: "Glass+PP", size: "Standard", costPerUnit: 8.00 },
    { name: "Unit Carton Box", materialType: "Cardboard", size: "Standard", costPerUnit: 4.00 },
    { name: "Shrink Wrap", materialType: "PVC", size: "Standard", costPerUnit: 1.50 },
  ];

  for (const pkg of packagingData) {
    await prisma.packagingOption.upsert({
      where: { id: pkg.name.toLowerCase().replace(/[^a-z0-9]/g, "-") },
      update: {},
      create: pkg,
    });
  }
  console.log(`✅ ${packagingData.length} packaging options created`);

  // ─── 9. WAREHOUSES ────────────────────────────────────
  const warehousesData = [
    { name: "Main Warehouse", code: "WH-MAIN", city: "Hyderabad", state: "Telangana", warehouseType: "GENERAL" },
    { name: "FG Store", code: "WH-FG", city: "Hyderabad", state: "Telangana", warehouseType: "FINISHED_GOODS" },
    { name: "RM Store", code: "WH-RM", city: "Hyderabad", state: "Telangana", warehouseType: "RAW_MATERIALS" },
    { name: "Packaging Store", code: "WH-PKG", city: "Hyderabad", state: "Telangana", warehouseType: "PACKAGING" },
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
  await prisma.priceList.upsert({
    where: { id: "default-mpl" },
    update: {},
    create: {
      name: "Master Price List",
      description: "Default price list for all products",
      currency: "INR",
    },
  });
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
