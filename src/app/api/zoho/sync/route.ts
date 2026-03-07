import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import {
  pushCustomerToZoho,
  pushVendorToZoho,
  pushProductToZoho,
  pushInvoiceToZoho,
  pushPaymentToZoho,
  pushPurchaseOrderToZoho,
} from "@/lib/zoho";

/**
 * GET: Fetch sync logs and sync status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const entityType = searchParams.get("entityType") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (status) where.status = status;

    const [logs, total, stats] = await Promise.all([
      prisma.zohoSyncLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.zohoSyncLog.count({ where }),
      prisma.zohoSyncLog.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    // Get sync status for each entity type
    const syncSummary = await Promise.all([
      prisma.customer.count({ where: { isActive: true } }).then(async (total) => ({
        entity: "Customers",
        total,
        synced: await prisma.customer.count({ where: { isActive: true, zohoContactId: { not: null } } }),
      })),
      prisma.vendor.count({ where: { isActive: true } }).then(async (total) => ({
        entity: "Vendors",
        total,
        synced: await prisma.vendor.count({ where: { isActive: true, zohoVendorId: { not: null } } }),
      })),
      prisma.product.count({ where: { isActive: true } }).then(async (total) => ({
        entity: "Products",
        total,
        synced: await prisma.product.count({ where: { isActive: true, zohoItemId: { not: null } } }),
      })),
      prisma.invoice.count().then(async (total) => ({
        entity: "Invoices",
        total,
        synced: await prisma.invoice.count({ where: { zohoInvoiceId: { not: null } } }),
      })),
      prisma.payment.count().then(async (total) => ({
        entity: "Payments",
        total,
        synced: await prisma.payment.count({ where: { zohoPaymentId: { not: null } } }),
      })),
      prisma.purchaseOrder.count().then(async (total) => ({
        entity: "Purchase Orders",
        total,
        synced: await prisma.purchaseOrder.count({ where: { zohoBillId: { not: null } } }),
      })),
    ]);

    return NextResponse.json({
      logs,
      stats,
      syncSummary,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/zoho/sync error:", error);
    return NextResponse.json({ error: "Failed to fetch sync data" }, { status: 500 });
  }
}

/**
 * POST: Trigger a sync for specific entity or bulk
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Only admins and finance can trigger syncs
    if (!["Admin", "Finance"].includes(session.user.role || "")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { entityType, entityId, action } = await request.json();

    // Check if Zoho sync is enabled
    const zohoEnabled = await prisma.setting.findUnique({ where: { key: "zoho_sync_enabled" } });
    if (zohoEnabled?.value !== "true") {
      return NextResponse.json({
        error: "Zoho sync is disabled. Enable it in Settings first.",
      }, { status: 400 });
    }

    let result;

    if (action === "bulk") {
      // Bulk sync all unsynced records of given type
      const results: any[] = [];

      if (entityType === "customers" || entityType === "all") {
        const unsynced = await prisma.customer.findMany({
          where: { isActive: true, zohoContactId: null },
          select: { id: true },
        });
        for (const c of unsynced) {
          results.push({ type: "customer", ...(await pushCustomerToZoho(c.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (entityType === "vendors" || entityType === "all") {
        const unsynced = await prisma.vendor.findMany({
          where: { isActive: true, zohoVendorId: null },
          select: { id: true },
        });
        for (const v of unsynced) {
          results.push({ type: "vendor", ...(await pushVendorToZoho(v.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (entityType === "products" || entityType === "all") {
        const unsynced = await prisma.product.findMany({
          where: { isActive: true, zohoItemId: null },
          select: { id: true },
        });
        for (const p of unsynced) {
          results.push({ type: "product", ...(await pushProductToZoho(p.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (entityType === "invoices" || entityType === "all") {
        const unsynced = await prisma.invoice.findMany({
          where: { zohoInvoiceId: null },
          select: { id: true },
        });
        for (const i of unsynced) {
          results.push({ type: "invoice", ...(await pushInvoiceToZoho(i.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (entityType === "payments" || entityType === "all") {
        const unsynced = await prisma.payment.findMany({
          where: { zohoPaymentId: null },
          select: { id: true },
        });
        for (const p of unsynced) {
          results.push({ type: "payment", ...(await pushPaymentToZoho(p.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      if (entityType === "purchaseOrders" || entityType === "all") {
        const unsynced = await prisma.purchaseOrder.findMany({
          where: { zohoBillId: null, status: { not: "DRAFT" } },
          select: { id: true },
        });
        for (const po of unsynced) {
          results.push({ type: "purchaseOrder", ...(await pushPurchaseOrderToZoho(po.id)) });
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      result = {
        total: results.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };
    } else {
      // Single entity sync
      switch (entityType) {
        case "customer":
          result = await pushCustomerToZoho(entityId);
          break;
        case "vendor":
          result = await pushVendorToZoho(entityId);
          break;
        case "product":
          result = await pushProductToZoho(entityId);
          break;
        case "invoice":
          result = await pushInvoiceToZoho(entityId);
          break;
        case "payment":
          result = await pushPaymentToZoho(entityId);
          break;
        case "purchaseOrder":
          result = await pushPurchaseOrderToZoho(entityId);
          break;
        default:
          return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/zoho/sync error:", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}
