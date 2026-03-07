import axios from "axios";

/**
 * SMSStriker SMS Gateway Integration
 * API docs: https://www.smsstriker.com/API/
 */

interface SMSParams {
  to: string; // Phone number with country code
  message: string;
  templateId?: string; // DLT template ID
}

export async function sendSMS(params: SMSParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.SMSSTRIKER_API_KEY;
  const senderId = process.env.SMSSTRIKER_SENDER_ID;
  const dltEntityId = process.env.SMSSTRIKER_DLT_ENTITY_ID;

  if (!apiKey || !senderId) {
    console.warn("SMSStriker not configured");
    return { success: false, error: "SMS service not configured" };
  }

  // Clean phone number
  let phone = params.to.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (!phone.startsWith("+91") && !phone.startsWith("91") && phone.length === 10) {
    phone = "91" + phone;
  }

  try {
    const response = await axios.get("https://app.smsstriker.com/API/sms.php", {
      params: {
        username: apiKey,
        password: process.env.SMSSTRIKER_PASSWORD || "",
        from: senderId,
        to: phone,
        msg: params.message,
        type: 1, // Unicode
        template_id: params.templateId || "",
        entity_id: dltEntityId || "",
      },
    });

    if (response.data && response.data.includes("success")) {
      return { success: true };
    }

    return { success: false, error: response.data || "Unknown SMS error" };
  } catch (error: any) {
    console.error("SMSStriker error:", error.message);
    return { success: false, error: error.message };
  }
}

// ── SMS Templates ────────────────────────────────────────

export function orderConfirmationSMS(orderNumber: string, customerName: string, amount: number): SMSParams {
  return {
    to: "",
    message: `Dear ${customerName}, your order ${orderNumber} worth Rs.${amount.toLocaleString("en-IN")} has been confirmed. Thank you for choosing Esthetic Insights! - IBPM`,
  };
}

export function shipmentSMS(orderNumber: string, trackingNumber: string, courier: string): SMSParams {
  return {
    to: "",
    message: `Your order ${orderNumber} has been shipped via ${courier}. Track: ${trackingNumber}. - Esthetic Insights`,
  };
}

export function paymentReminderSMS(invoiceNumber: string, amount: number, dueDate: string): SMSParams {
  return {
    to: "",
    message: `Reminder: Invoice ${invoiceNumber} of Rs.${amount.toLocaleString("en-IN")} is due on ${dueDate}. Please make payment at earliest. - Esthetic Insights`,
  };
}
