import axios from "axios";
import prisma from "@/lib/db/prisma";

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@estheticinsights.com";
  const fromName = process.env.SENDGRID_FROM_NAME || "IBPM - Esthetic Insights";

  if (!apiKey) {
    console.warn("SendGrid API key not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    await axios.post(
      SENDGRID_API_URL,
      {
        personalizations: [
          {
            to: [{ email: params.to, name: params.toName || params.to }],
            subject: params.subject,
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [
          { type: "text/html", value: params.htmlContent },
          ...(params.textContent
            ? [{ type: "text/plain", value: params.textContent }]
            : []),
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return { success: true };
  } catch (error: any) {
    const errorMsg = error.response?.data?.errors?.[0]?.message || error.message;
    console.error("SendGrid error:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ── Email Templates ──────────────────────────────────────

export function orderConfirmationEmail(order: any): EmailParams {
  return {
    to: order.customer?.email || "",
    toName: order.customer?.name,
    subject: `Order Confirmed: ${order.orderNumber} - Esthetic Insights`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBPM - Esthetic Insights</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1e40af;">Order Confirmed</h2>
          <p>Dear ${order.customer?.name || "Customer"},</p>
          <p>Your order <strong>${order.orderNumber}</strong> has been confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Order Number</td>
              <td style="padding: 10px;">${order.orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Order Date</td>
              <td style="padding: 10px;">${new Date(order.orderDate).toLocaleDateString("en-IN")}</td>
            </tr>
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Total Amount</td>
              <td style="padding: 10px;">₹${order.totalAmount?.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Items</td>
              <td style="padding: 10px;">${order.items?.length || 0} items</td>
            </tr>
          </table>
          <p>We'll keep you updated on the progress of your order.</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated message from IBPM. Please do not reply.
          </p>
        </div>
      </div>
    `,
  };
}

export function invoiceEmail(invoice: any): EmailParams {
  return {
    to: invoice.customer?.email || "",
    toName: invoice.customer?.name,
    subject: `Invoice ${invoice.invoiceNumber} - Esthetic Insights`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBPM - Esthetic Insights</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1e40af;">Invoice</h2>
          <p>Dear ${invoice.customer?.name || "Customer"},</p>
          <p>Please find your invoice details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Invoice Number</td>
              <td style="padding: 10px;">${invoice.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Invoice Date</td>
              <td style="padding: 10px;">${new Date(invoice.invoiceDate).toLocaleDateString("en-IN")}</td>
            </tr>
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Due Date</td>
              <td style="padding: 10px;">${new Date(invoice.dueDate).toLocaleDateString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Total Amount</td>
              <td style="padding: 10px; font-size: 18px; color: #1e40af;">₹${invoice.totalAmount?.toLocaleString("en-IN")}</td>
            </tr>
          </table>
          <p>Please make the payment by the due date.</p>
        </div>
      </div>
    `,
  };
}

export function shipmentEmail(shipment: any, order: any): EmailParams {
  return {
    to: order.customer?.email || "",
    toName: order.customer?.name,
    subject: `Order Shipped: ${order.orderNumber} - Esthetic Insights`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBPM - Esthetic Insights</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #059669;">Your Order Has Been Shipped!</h2>
          <p>Dear ${order.customer?.name || "Customer"},</p>
          <p>Great news! Your order <strong>${order.orderNumber}</strong> has been shipped.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Tracking Number</td>
              <td style="padding: 10px;">${shipment.trackingNumber || "Will be updated shortly"}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Courier</td>
              <td style="padding: 10px;">${shipment.courierPartner || "-"}</td>
            </tr>
            <tr style="background: #e5e7eb;">
              <td style="padding: 10px; font-weight: bold;">Estimated Delivery</td>
              <td style="padding: 10px;">${shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString("en-IN") : "TBD"}</td>
            </tr>
          </table>
        </div>
      </div>
    `,
  };
}

export function paymentConfirmationEmail(payment: any): EmailParams {
  return {
    to: payment.customer?.email || "",
    toName: payment.customer?.name,
    subject: `Payment Received: ${payment.paymentNumber} - Esthetic Insights`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">IBPM - Esthetic Insights</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #059669;">Payment Received</h2>
          <p>Dear ${payment.customer?.name || "Customer"},</p>
          <p>We have received your payment of <strong>₹${payment.amount?.toLocaleString("en-IN")}</strong>.</p>
          <p>Payment Reference: ${payment.paymentNumber}</p>
          <p>Thank you for your business!</p>
        </div>
      </div>
    `,
  };
}
