import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

import { ItemType } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all stats in parallel
    const [
      totalProducts,
      totalFG,
      totalRM,
      totalPM,
      totalCustomers,
      totalVendors,
      totalOrders,
      ordersByStatus,
      recentOrders,
      totalInvoiceAmount,
      totalPaidAmount,
      lowStockItems,
      recentActivity,
      zohoSyncStats,
      notificationStats,
    ] = await Promise.all([
      // Products
      prisma.product.count({ where: { isActive: true } }),
      //prisma.product.count({ where: { isActive: true, itemType: "FINISHED_GOOD" } }),
      //prisma.product.count({ where: { isActive: true, itemType: "RAW_MATERIAL" } }),
      //prisma.product.count({ where: { isActive: true, itemType: "PACKAGING_MATERIAL" } }),

      prisma.product.count({ where: { isActive: true, itemType: "FG" as ItemType } }),
      prisma.product.count({ where: { isActive: true, itemType: "RM" as ItemType } }),
      prisma.product.count({ where: { isActive: true, itemType: "PM" as ItemType } }),

      // Contacts
      prisma.customer.count({ where: { isActive: true } }),
      prisma.vendor.count({ where: { isActive: true } }),

      // Orders
      prisma.salesOrder.count(),
      prisma.salesOrder.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { grandTotal: true },
      }),

      // Recent orders
      prisma.salesOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          //customer: { select: { name: true } },
          customer: { select: { companyName: true, contactName: true } },
        },
      }),

      // Finance
      //prisma.invoice.aggregate({ _sum: { grandTotal: true } }),
      prisma.invoice.aggregate({ _sum: { grandTotal: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),

      // Low stock (items with qty below reorder level)
      prisma.$queryRaw<any[]>`
        SELECT p."name", p."sku", p."itemType", p."reorderLevel",
              COALESCE(SUM(i."quantityOnHand"), 0) as "currentStock"
        FROM "products" p
        LEFT JOIN "inventory" i ON i."productId" = p."id"
        WHERE p."isActive" = true AND p."reorderLevel" > 0
        GROUP BY p."id", p."name", p."sku", p."itemType", p."reorderLevel"
        HAVING COALESCE(SUM(i."quantityOnHand"), 0) < p."reorderLevel"
        ORDER BY (COALESCE(SUM(i."quantityOnHand"), 0)::float / p."reorderLevel") ASC
        LIMIT 10 `,

      // Recent audit log
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      }),

      // Zoho sync status
      prisma.zohoSyncLog.groupBy({
        by: ["status"],
        _count: { id: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),

      // Notification stats (last 24h)
      prisma.notification.groupBy({
        by: ["status"],
        _count: { id: true },
        where: {
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    // Process order stats
    const pendingOrders = ordersByStatus
      .filter((s) => ["ORDER_RECEIVED", "PRODUCTION_PLANNING", "SOURCING_IN_PROGRESS"].includes(s.status))
      .reduce((acc, s) => acc + s._count.id, 0);

    const inProduction = ordersByStatus
      .filter((s) =>
        ["MATERIALS_RECEIVED", "MANUFACTURING", "QC_IN_PROGRESS", "QC_APPROVED", "QC_HOLD", "READY_TO_PACK", "PACKING"].includes(s.status)
      )
      .reduce((acc, s) => acc + s._count.id, 0);

    const readyToShip = ordersByStatus
      .filter((s) => ["DISPATCHED", "IN_TRANSIT"].includes(s.status))
      .reduce((acc, s) => acc + s._count.id, 0);

    const completedOrders = ordersByStatus
      .filter((s) => s.status === "COMPLETED")
      .reduce((acc, s) => acc + s._count.id, 0);

    //const totalRevenue = ordersByStatus.reduce((acc, s) => acc + (s._sum.totalAmount || 0), 0);
    const totalRevenue = ordersByStatus.reduce((acc, s) => acc + (Number(s._sum.grandTotal) || 0), 0);
    return NextResponse.json({
      products: {
        total: totalProducts,
        fg: totalFG,
        rm: totalRM,
        pm: totalPM,
      },
      contacts: {
        customers: totalCustomers,
        vendors: totalVendors,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        inProduction,
        readyToShip,
        completed: completedOrders,
        totalRevenue,
        byStatus: ordersByStatus,
      },
      finance: {
        //totalInvoiced: totalInvoiceAmount._sum.totalAmount || 0,
        totalInvoiced: totalInvoiceAmount._sum.grandTotal || 0,
        totalPaid: totalPaidAmount._sum.amount || 0,
        outstanding: (totalInvoiceAmount._sum.grandTotal || 0) - (totalPaidAmount._sum.amount || 0),
      },
      lowStockItems,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        //customer: o.customer.name,
        customer: o.customer.companyName || o.customer.contactName,
        //amount: o.totalAmount,
        amount: o.grandTotal,
        status: o.status,
        date: o.createdAt,
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        user: a.user?.name || "System",
        action: a.action,
        //module: a.module,
        module: a.entityType,
        entityType: a.entityType,
        date: a.createdAt,
      })),
      zohoSync: {
        last24h: zohoSyncStats,
      },
      notifications: {
        last24h: notificationStats,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
