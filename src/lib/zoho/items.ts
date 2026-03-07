import { zohoPost, zohoPut, logZohoSync } from "./client";
import prisma from "@/lib/db/prisma";

/**
 * Push Product to Zoho Books as Item
 */
export async function pushProductToZoho(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { taxConfig: true, unit: true },
  });
  if (!product) throw new Error("Product not found");

  // Map IBPM item types to Zoho item types
  const zohoItemType = product.itemType === "FINISHED_GOOD" ? "sales_and_purchases" :
                       ["RAW_MATERIAL", "PACKAGING_MATERIAL", "CONSUMABLE"].includes(product.itemType) ? "purchases" :
                       "sales_and_purchases";

  const zohoPayload: any = {
    name: product.name,
    sku: product.sku,
    description: product.description || "",
    item_type: "inventory",
    product_type: zohoItemType === "sales_and_purchases" ? "goods" : "goods",
    rate: product.sellingPrice || 0,
    purchase_rate: product.costPrice || 0,
    unit: product.unit?.abbreviation || "pcs",
    hsn_or_sac: product.hsnCode || "",
    is_taxable: true,
    stock_on_hand: 0,
    // Tax info
    tax_percentage: product.taxConfig
      ? product.taxConfig.cgstPercent + product.taxConfig.sgstPercent
      : 0,
    // Custom fields for IBPM reference
    custom_fields: [
      { label: "IBPM ID", value: product.id },
      { label: "Item Type", value: product.itemType },
    ],
  };

  // Add purchase info for RM/PM
  if (["RAW_MATERIAL", "PACKAGING_MATERIAL", "CONSUMABLE"].includes(product.itemType)) {
    zohoPayload.purchase_description = `${product.itemType}: ${product.name}`;
    zohoPayload.purchase_rate = product.costPrice || 0;
  }

  // Add sales info for FG
  if (product.itemType === "FINISHED_GOOD") {
    zohoPayload.sales_description = product.description || product.name;
    zohoPayload.rate = product.sellingPrice || product.mrp || 0;
  }

  try {
    let response;
    if (product.zohoItemId) {
      response = await zohoPut(`/items/${product.zohoItemId}`, {
        JSONString: JSON.stringify(zohoPayload),
      });
    } else {
      response = await zohoPost("/items", {
        JSONString: JSON.stringify(zohoPayload),
      });
    }

    const zohoItemId = response.data?.item?.item_id;
    if (zohoItemId) {
      await prisma.product.update({
        where: { id: productId },
        data: { zohoItemId },
      });
    }

    await logZohoSync({
      entityType: "Product",
      entityId: productId,
      zohoModule: "items",
      zohoId: zohoItemId,
      action: product.zohoItemId ? "UPDATE" : "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoItemId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "Product",
      entityId: productId,
      zohoModule: "items",
      action: product.zohoItemId ? "UPDATE" : "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Bulk push all active products to Zoho
 */
export async function pushAllProductsToZoho() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  const results = [];
  for (const product of products) {
    const result = await pushProductToZoho(product.id);
    results.push({ productId: product.id, ...result });
    // Rate limiting: small delay between calls
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    total: results.length,
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}
