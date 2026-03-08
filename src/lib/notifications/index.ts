import prisma from "@/lib/db/prisma";
import { sendEmail, orderConfirmationEmail, invoiceEmail, shipmentEmail, paymentConfirmationEmail } from "./email";
import { sendSMS, orderConfirmationSMS, shipmentSMS, paymentReminderSMS } from "./sms";
import { sendWhatsApp, orderConfirmationWA, shipmentWA, invoiceWA } from "./whatsapp";

export { sendEmail, sendSMS, sendWhatsApp };

type NotificationChannel = "email" | "sms" | "whatsapp";

interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

/**
 * Check which channels are enabled
 */
async function getEnabledChannels(): Promise<Record<NotificationChannel, boolean>> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "notification_email_enabled",
          "notification_sms_enabled",
          "notification_whatsapp_enabled",
        ],
      },
    },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return {
    email: map["notification_email_enabled"] === "true",
    sms: map["notification_sms_enabled"] === "true",
    whatsapp: map["notification_whatsapp_enabled"] === "true",
  };
}

/**
 * Log notification to database
 */
async function logNotification(params: {
  type: string;
  channel: NotificationChannel;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  subject: string;
  status: string;
  errorMessage?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        type: params.type,
        channel: params.channel.toUpperCase(),
        recipientId: params.recipientId || null,
        recipientEmail: params.recipientEmail || null,
        recipientPhone: params.recipientPhone || null,
        subject: params.subject,
        message: params.subject,
        status: params.status,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (e) {
    console.error("Failed to log notification:", e);
  }
}

// ── Unified Notification Dispatchers ─────────────────────

/**
 * Send Order Confirmation notifications (all enabled channels)
 */
export async function notifyOrderConfirmed(orderId: string): Promise<NotificationResult[]> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true } } } },
    },
  });
  if (!order || !order.customer) return [];

  const channels = await getEnabledChannels();
  const results: NotificationResult[] = [];

  // Email
  if (channels.email && order.customer.email) {
    const emailParams = orderConfirmationEmail(order);
    const result = await sendEmail(emailParams);
    results.push({ channel: "email", ...result });
    await logNotification({
      type: "ORDER_CONFIRMED",
      channel: "email",
      recipientEmail: order.customer.email,
      subject: emailParams.subject,
      status: result.success ? "SENT" : "FAILED",
      errorMessage: result.error,
    });
  }

  // SMS
  if (channels.sms && order.customer.phone) {
    const smsParams = orderConfirmationSMS(order.orderNumber, order.customer.contactName, order.grandTotal);
    smsParams.to = order.customer.phone;
    const result = await sendSMS(smsParams);
    results.push({ channel: "sms", ...result });
    await logNotification({
      type: "ORDER_CONFIRMED",
      channel: "sms",
      recipientPhone: order.customer.phone,
      subject: `Order ${order.orderNumber} confirmed`,
      status: result.success ? "SENT" : "FAILED",
      errorMessage: result.error,
    });
  }

  // WhatsApp
  if (channels.whatsapp && order.customer.phone) {
    const waParams = orderConfirmationWA(
      order.orderNumber,
      order.customer.contactName,
      `₹${order.grandTotal.toLocaleString("en-IN")}`
    );
    waParams.to = order.customer.phone;
    const result = await sendWhatsApp(waParams);
    results.push({ channel: "whatsapp", ...result });
    await logNotification({
      type: "ORDER_CONFIRMED",
      channel: "whatsapp",
      recipientPhone: order.customer.phone,
      subject: `Order ${order.orderNumber} confirmed`,
      status: result.success ? "SENT" : "FAILED",
      errorMessage: result.error,
    });
  }

  return results;
}

/**
 * Send Shipment notifications
 */
export async function notifyOrderShipped(shipmentId: string): Promise<NotificationResult[]> {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      salesOrder: { include: { customer: true } },
    },
  });
  if (!shipment || !shipment.salesOrder?.customer) return [];

  const order = shipment.salesOrder;
  const customer = order.customer;
  const channels = await getEnabledChannels();
  const results: NotificationResult[] = [];

  if (channels.email && customer.email) {
    const emailParams = shipmentEmail(shipment, order);
    const result = await sendEmail(emailParams);
    results.push({ channel: "email", ...result });
    await logNotification({ type: "SHIPPED", channel: "email", recipientEmail: customer.email, subject: emailParams.subject, status: result.success ? "SENT" : "FAILED" });
  }

  if (channels.sms && customer.phone) {
    const smsParams = shipmentSMS(order.orderNumber, shipment.awbNumber || "N/A", shipment.courierName || "Courier");
    smsParams.to = customer.phone;
    const result = await sendSMS(smsParams);
    results.push({ channel: "sms", ...result });
    await logNotification({ type: "SHIPPED", channel: "sms", recipientPhone: customer.phone, subject: `Shipped: ${order.orderNumber}`, status: result.success ? "SENT" : "FAILED" });
  }

  if (channels.whatsapp && customer.phone) {
    const waParams = shipmentWA(order.orderNumber, shipment.awbNumber || "N/A", shipment.courierName || "Courier", shipment.expectedDelivery?.toLocaleDateString("en-IN") || "TBD");
    waParams.to = customer.phone;
    const result = await sendWhatsApp(waParams);
    results.push({ channel: "whatsapp", ...result });
    await logNotification({ type: "SHIPPED", channel: "whatsapp", recipientPhone: customer.phone, subject: `Shipped: ${order.orderNumber}`, status: result.success ? "SENT" : "FAILED" });
  }

  return results;
}

/**
 * Send Invoice notifications
 */
export async function notifyInvoiceCreated(invoiceId: string): Promise<NotificationResult[]> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true },
  });
  if (!invoice || !invoice.customer) return [];

  const channels = await getEnabledChannels();
  const results: NotificationResult[] = [];

  if (channels.email && invoice.customer.email) {
    const emailParams = invoiceEmail(invoice);
    const result = await sendEmail(emailParams);
    results.push({ channel: "email", ...result });
    await logNotification({ type: "INVOICE", channel: "email", recipientEmail: invoice.customer.email, subject: emailParams.subject, status: result.success ? "SENT" : "FAILED" });
  }

  if (channels.whatsapp && invoice.customer.phone) {
    const waParams = invoiceWA(invoice.invoiceNumber, `₹${invoice.grandTotal.toLocaleString("en-IN")}`, invoice.dueDate.toLocaleDateString("en-IN"));
    waParams.to = invoice.customer.phone;
    const result = await sendWhatsApp(waParams);
    results.push({ channel: "whatsapp", ...result });
    await logNotification({ type: "INVOICE", channel: "whatsapp", recipientPhone: invoice.customer.phone, subject: `Invoice ${invoice.invoiceNumber}`, status: result.success ? "SENT" : "FAILED" });
  }

  return results;
}

/**
 * Send Payment Confirmation
 */
export async function notifyPaymentReceived(paymentId: string): Promise<NotificationResult[]> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { customer: true, invoice: true },
  });
  if (!payment || !payment.customer) return [];

  const channels = await getEnabledChannels();
  const results: NotificationResult[] = [];

  if (channels.email && payment.customer.email) {
    const emailParams = paymentConfirmationEmail(payment);
    const result = await sendEmail(emailParams);
    results.push({ channel: "email", ...result });
    await logNotification({ type: "PAYMENT", channel: "email", recipientEmail: payment.customer.email, subject: emailParams.subject, status: result.success ? "SENT" : "FAILED" });
  }

  return results;
}
