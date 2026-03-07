import { zohoPost, zohoPut, logZohoSync } from "./client";
import prisma from "@/lib/db/prisma";

/**
 * Push Invoice to Zoho Books
 */
export async function pushInvoiceToZoho(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
      salesOrder: true,
    },
  });
  if (!invoice) throw new Error("Invoice not found");

  // Ensure customer is synced to Zoho first
  if (!invoice.customer.zohoContactId) {
    const { pushCustomerToZoho } = await import("./contacts");
    const custResult = await pushCustomerToZoho(invoice.customerId);
    if (!custResult.success) {
      throw new Error(`Cannot push invoice: customer sync failed - ${custResult.error}`);
    }
  }

  // Ensure all products are synced
  for (const item of invoice.items) {
    if (!item.product.zohoItemId) {
      const { pushProductToZoho } = await import("./items");
      await pushProductToZoho(item.productId);
    }
  }

  // Refresh data after syncs
  const updatedInvoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      items: { include: { product: true } },
    },
  });

  const zohoPayload: any = {
    customer_id: updatedInvoice!.customer.zohoContactId,
    invoice_number: updatedInvoice!.invoiceNumber,
    reference_number: updatedInvoice!.salesOrder?.orderNumber || "",
    date: updatedInvoice!.invoiceDate.toISOString().split("T")[0],
    due_date: updatedInvoice!.dueDate.toISOString().split("T")[0],
    is_inclusive_tax: false,
    gst_treatment: updatedInvoice!.customer.gstNumber ? "business_gst" : "consumer",
    gst_no: updatedInvoice!.customer.gstNumber || "",
    place_of_supply: updatedInvoice!.customer.state || "",
    line_items: updatedInvoice!.items.map((item) => {
      const lineItem: any = {
        item_id: item.product.zohoItemId || undefined,
        name: item.product.name,
        description: `SKU: ${item.product.sku}`,
        quantity: item.quantity,
        rate: item.unitPrice,
        discount: item.discountPercent || 0,
        hsn_or_sac: item.product.hsnCode || "",
      };

      // GST details
      if (item.igstPercent > 0) {
        lineItem.gst_treatment_code = "out_of_state";
        lineItem.tax_percentage = item.igstPercent;
      } else if (item.cgstPercent > 0 || item.sgstPercent > 0) {
        lineItem.gst_treatment_code = "intra_state";
        lineItem.tax_percentage = item.cgstPercent + item.sgstPercent;
      }

      return lineItem;
    }),
    notes: updatedInvoice!.notes || `Invoice from IBPM Order: ${updatedInvoice!.salesOrder?.orderNumber || ""}`,
    terms: `Payment due within ${invoice.salesOrder?.paymentTermsDays || 30} days`,
    custom_fields: [
      { label: "IBPM Invoice ID", value: invoiceId },
      { label: "IBPM Order", value: updatedInvoice!.salesOrder?.orderNumber || "" },
    ],
  };

  try {
    let response;
    if (invoice.zohoInvoiceId) {
      response = await zohoPut(`/invoices/${invoice.zohoInvoiceId}`, {
        JSONString: JSON.stringify(zohoPayload),
      });
    } else {
      response = await zohoPost("/invoices", {
        JSONString: JSON.stringify(zohoPayload),
      });
    }

    const zohoInvoiceId = response.data?.invoice?.invoice_id;
    if (zohoInvoiceId) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { zohoInvoiceId },
      });
    }

    await logZohoSync({
      entityType: "Invoice",
      entityId: invoiceId,
      zohoModule: "invoices",
      zohoId: zohoInvoiceId,
      action: invoice.zohoInvoiceId ? "UPDATE" : "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoInvoiceId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "Invoice",
      entityId: invoiceId,
      zohoModule: "invoices",
      action: invoice.zohoInvoiceId ? "UPDATE" : "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
