import { zohoPost, zohoPut, logZohoSync } from "./client";
import prisma from "@/lib/db/prisma";

/**
 * Push Customer to Zoho Books as Contact (customer type)
 */
export async function pushCustomerToZoho(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");

  const zohoPayload = {
    contact_name: customer.name,
    contact_type: "customer",
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    gst_no: customer.gstNumber || undefined,
    pan_no: customer.panNumber || undefined,
    billing_address: customer.billingAddress
      ? {
          address: customer.billingAddress,
          city: customer.city || "",
          state: customer.state || "",
          zip: customer.pincode || "",
          country: customer.country || "India",
        }
      : undefined,
    payment_terms: customer.paymentTermsDays || 30,
    credit_limit: customer.creditLimit || undefined,
    notes: `Synced from IBPM. ID: ${customer.id}`,
  };

  try {
    let response;
    if (customer.zohoContactId) {
      // Update existing
      response = await zohoPut(`/contacts/${customer.zohoContactId}`, {
        JSONString: JSON.stringify(zohoPayload),
      });
    } else {
      // Create new
      response = await zohoPost("/contacts", {
        JSONString: JSON.stringify(zohoPayload),
      });
    }

    const zohoContactId = response.data?.contact?.contact_id;
    if (zohoContactId) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { zohoContactId },
      });
    }

    await logZohoSync({
      entityType: "Customer",
      entityId: customerId,
      zohoModule: "contacts",
      zohoId: zohoContactId,
      action: customer.zohoContactId ? "UPDATE" : "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoContactId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "Customer",
      entityId: customerId,
      zohoModule: "contacts",
      action: customer.zohoContactId ? "UPDATE" : "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}

/**
 * Push Vendor to Zoho Books as Contact (vendor type)
 */
export async function pushVendorToZoho(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error("Vendor not found");

  const zohoPayload = {
    contact_name: vendor.name,
    contact_type: "vendor",
    email: vendor.email || undefined,
    phone: vendor.phone || undefined,
    gst_no: vendor.gstNumber || undefined,
    pan_no: vendor.panNumber || undefined,
    billing_address: vendor.address
      ? {
          address: vendor.address,
          city: vendor.city || "",
          state: vendor.state || "",
          zip: vendor.pincode || "",
          country: vendor.country || "India",
        }
      : undefined,
    payment_terms: vendor.paymentTermsDays || 30,
    notes: `Synced from IBPM. ID: ${vendor.id}`,
  };

  try {
    let response;
    if (vendor.zohoVendorId) {
      response = await zohoPut(`/contacts/${vendor.zohoVendorId}`, {
        JSONString: JSON.stringify(zohoPayload),
      });
    } else {
      response = await zohoPost("/contacts", {
        JSONString: JSON.stringify(zohoPayload),
      });
    }

    const zohoVendorId = response.data?.contact?.contact_id;
    if (zohoVendorId) {
      await prisma.vendor.update({
        where: { id: vendorId },
        data: { zohoVendorId },
      });
    }

    await logZohoSync({
      entityType: "Vendor",
      entityId: vendorId,
      zohoModule: "contacts",
      zohoId: zohoVendorId,
      action: vendor.zohoVendorId ? "UPDATE" : "CREATE",
      status: "SUCCESS",
      requestPayload: zohoPayload,
      responseData: response.data,
    });

    return { success: true, zohoVendorId };
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    await logZohoSync({
      entityType: "Vendor",
      entityId: vendorId,
      zohoModule: "contacts",
      action: vendor.zohoVendorId ? "UPDATE" : "CREATE",
      status: "FAILED",
      requestPayload: zohoPayload,
      errorMessage: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
}
