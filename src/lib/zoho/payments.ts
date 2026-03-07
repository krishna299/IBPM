import { zohoPost, logZohoSync } from "./client";
import prisma from "@/lib/db/prisma";

/**
 * Push Payment to Zoho Books as Customer Payment
 */
export async function pushPaymentToZoho(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: { include: { customer: true } },
      customer: true,
    },
  });
  if (!payment) throw new Error("Payment not found");

  // Ensure invoice is synced first
  if (payment.invoice && !payment.invoice.zohoInvoiceId) {
    const { pushInvoiceToZoho } = await import("./invoices");
    const invResult = await pushInvoiceToZoho(payment.invoiceId);
    if (!invResult.success) {
      throw new Error(`Cannot push payment: invoice sync failed - ${invResult.error}`);
    }
  }

  // Refresh after sync
  const updatedPayment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: true,
      customer: true,
    },
  });

  // Map payment methods
  const paymentModeMap: Record<string, string> = {
    CASH: "cash",
    BANK_TRANSFER: "bank_transfer",
    UPI: "bank_transfer",
    CHEQUE: "check",
    RAZORPAY: "bank_transfer",
    OTHER: "bank_transfer",
  };

  const zohoPayload: any = {
    customer_id: updatedPayment!.customer.zohoContactId,
    payment_mode: paymentModeMap[updatedPayment!.paymentMethod] || "bank_transfer",
    amount: updatedPayment!.amount,
    date: updatedPayment!.paymentDate.toISOString().split("T")[0],
    reference_number: updatedPayment!.referenceNumber || updatedPayment!.paymentNumber,
    description: `IBPM Payment: ${updatedPayment!.paymentNumber}`,
    invoices: [
      {
        invoice_id: updatedPayment!.invoice?.zohoInvoiceId,
        amount_applied: updatedPayment!.amount,
      },
    ],
    custom_fields: [
      { label: "IBPM Payment ID", value: paymentId },
      { label: "Payment Method", value: updatedPayment!.paymentMethod },
    ],
  };

  try {
    const response = await zohoPost("/customerpayments", {
      JSONString: JSON.stringify(zohoPayload),
    });

    const zohoPaymentId = response.data?.payment?.payment_id;
    if (zohoPaymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { zohoPaymentId },
      });
    }

    await logZohoSync({
      entityType: "Payment",
      entityId: paymentId,
      zohoModule: "customerpayments",
      zohoId: zohoPaymentId,
      action: "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoPaymentId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "Payment",
      entityId: paymentId,
      zohoModule: "customerpayments",
      action: "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
