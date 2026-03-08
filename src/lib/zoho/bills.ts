import { zohoPost, zohoPut, logZohoSync } from "./client";
import prisma from "@/lib/db/prisma";

/**
 * Push Purchase Order to Zoho Books as Bill
 * Bills in Zoho represent vendor invoices/purchase orders
 */
export async function pushPurchaseOrderToZoho(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      vendor: true,
      items: {
        include: { product: true },
      },
    },
  });
  if (!po) throw new Error("Purchase Order not found");

  // Ensure vendor is synced
  if (!po.vendor.zohoVendorId) {
    const { pushVendorToZoho } = await import("./contacts");
    const vendResult = await pushVendorToZoho(po.vendorId);
    if (!vendResult.success) {
      throw new Error(`Cannot push PO: vendor sync failed - ${vendResult.error}`);
    }
  }

  // Ensure all products are synced
  for (const item of po.items) {
    if (!item.product.zohoItemId) {
      const { pushProductToZoho } = await import("./items");
      await pushProductToZoho(item.productId);
    }
  }

  // Refresh after syncs
  const updatedPO = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: {
      vendor: true,
      items: { include: { product: true } },
    },
  });

  const zohoPayload: any = {
    vendor_id: updatedPO!.vendor.zohoVendorId,
    bill_number: updatedPO!.poNumber,
    date: updatedPO!.createdAt.toISOString().split("T")[0],
    due_date: new Date(
      updatedPO!.createdAt.getTime() + (updatedPO!.paymentTermsDays || 30) * 24 * 60 * 60 * 1000
    ).toISOString().split("T")[0],
    gst_treatment: updatedPO!.vendor.gstNumber ? "business_gst" : "consumer",
    gst_no: updatedPO!.vendor.gstNumber || "",
    source_of_supply: (updatedPO!.vendor.address as any)?.state || "",
    line_items: updatedPO!.items.map((item) => ({
      item_id: item.product.zohoItemId || undefined,
      name: item.product.name,
      description: `SKU: ${item.product.sku} | PO: ${updatedPO!.poNumber}`,
      quantity: item.quantity,
      rate: item.rate,
      hsn_or_sac: item.product.hsnCode || "",
    })),
    notes: updatedPO!.notes || `Purchase Order from IBPM: ${updatedPO!.poNumber}`,
    custom_fields: [
      { label: "IBPM PO ID", value: poId },
      { label: "PO Number", value: updatedPO!.poNumber },
    ],
  };

  try {
    let response;
    if (po.zohoBillId) {
      response = await zohoPut(`/bills/${po.zohoBillId}`, {
        JSONString: JSON.stringify(zohoPayload),
      });
    } else {
      response = await zohoPost("/bills", {
        JSONString: JSON.stringify(zohoPayload),
      });
    }

    const zohoBillId = response.data?.bill?.bill_id;
    if (zohoBillId) {
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { zohoBillId },
      });
    }

    await logZohoSync({
      entityType: "PurchaseOrder",
      entityId: poId,
      zohoModule: "bills",
      zohoId: zohoBillId,
      action: po.zohoBillId ? "UPDATE" : "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoBillId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "PurchaseOrder",
      entityId: poId,
      zohoModule: "bills",
      action: po.zohoBillId ? "UPDATE" : "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
