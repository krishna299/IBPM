import axios from "axios";

/**
 * WATI WhatsApp Business API Integration
 * Sends WhatsApp messages via template-based API
 */

interface WhatsAppParams {
  to: string;
  templateName: string;
  parameters: string[];
  mediaUrl?: string;
}

const WATI_BASE_URL = process.env.WATI_API_URL || "https://live-server-108820.wati.io";

async function getWatiHeaders() {
  return {
    Authorization: `Bearer ${process.env.WATI_API_TOKEN || ""}`,
    "Content-Type": "application/json",
  };
}

export async function sendWhatsApp(params: WhatsAppParams): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WATI_API_TOKEN;
  if (!token) {
    console.warn("WATI not configured");
    return { success: false, error: "WhatsApp service not configured" };
  }

  // Clean phone number (WATI expects without +)
  let phone = params.to.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  try {
    const response = await axios.post(
      `${WATI_BASE_URL}/api/v1/sendTemplateMessage?whatsappNumber=${phone}`,
      {
        template_name: params.templateName,
        broadcast_name: "ibpm_notification",
        parameters: params.parameters.map((value, index) => ({
          name: `${index + 1}`,
          value,
        })),
      },
      { headers: await getWatiHeaders() }
    );

    if (response.data?.result) {
      return { success: true };
    }

    return { success: false, error: response.data?.info || "WhatsApp send failed" };
  } catch (error: any) {
    console.error("WATI error:", error.response?.data || error.message);
    return { success: false, error: error.response?.data?.info || error.message };
  }
}

/**
 * Send a simple text message via WATI (non-template, for session messages)
 */
export async function sendWhatsAppText(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WATI_API_TOKEN;
  if (!token) return { success: false, error: "WhatsApp service not configured" };

  let phone = to.replace(/\s+/g, "").replace(/[^0-9]/g, "");
  if (phone.length === 10) phone = "91" + phone;

  try {
    const response = await axios.post(
      `${WATI_BASE_URL}/api/v1/sendSessionMessage/${phone}`,
      { messageText: message },
      { headers: await getWatiHeaders() }
    );

    return response.data?.result ? { success: true } : { success: false, error: "Send failed" };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ── WhatsApp Template Helpers ────────────────────────────

export function orderConfirmationWA(orderNumber: string, customerName: string, amount: string): WhatsAppParams {
  return {
    to: "",
    templateName: "order_confirmation",
    parameters: [customerName, orderNumber, amount],
  };
}

export function shipmentWA(orderNumber: string, trackingNumber: string, courier: string, deliveryDate: string): WhatsAppParams {
  return {
    to: "",
    templateName: "order_shipped",
    parameters: [orderNumber, courier, trackingNumber, deliveryDate],
  };
}

export function invoiceWA(invoiceNumber: string, amount: string, dueDate: string): WhatsAppParams {
  return {
    to: "",
    templateName: "invoice_generated",
    parameters: [invoiceNumber, amount, dueDate],
  };
}
