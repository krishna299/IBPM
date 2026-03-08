import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";
    const salesOrderId = searchParams.get("salesOrderId") || "";

    const where: any = {};
    if (status) where.status = status;
    if (salesOrderId) where.salesOrderId = salesOrderId;

    const [plans, total] = await Promise.all([
      prisma.productionPlan.findMany({
        where,
        include: {
          salesOrder: {
            select: { id: true, orderNumber: true, status: true, customer: { select: { contactName: true, companyName: true } } },
          },
          bomRequirements: true,
          batches: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productionPlan.count({ where }),
    ]);

    return NextResponse.json({
      data: plans,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/production error:", error);
    return NextResponse.json({ error: "Failed to fetch production plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { salesOrderId, plannedStartDate, notes } = body;

    // Verify sales order
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                bomParent: {
                  include: { child: { select: { id: true, name: true, sku: true, itemType: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!salesOrder) return NextResponse.json({ error: "Sales order not found" }, { status: 404 });

    const planNumber = await generateNextNumber("BATCH");

    // Auto-generate BOM requirements from order items
    const bomRequirements: any[] = [];
    for (const item of salesOrder.items) {
      if (item.product.bomParent && item.product.bomParent.length > 0) {
        for (const bom of item.product.bomParent) {
          const requiredQty = bom.quantity * item.quantity * (1 + bom.wastagePercent / 100);
          bomRequirements.push({
            materialId: bom.childId,
            materialType: bom.child.itemType,
            requiredQty,
            availableQty: 0,
            shortfallQty: requiredQty,
            status: "PENDING",
          });
        }
      }
    }

    const plan = await prisma.$transaction(async (tx) => {
      const productionPlan = await tx.productionPlan.create({
        data: {
          planNumber,
          salesOrderId,
          plannedDate: plannedStartDate ? new Date(plannedStartDate) : null,
          status: "DRAFT",
          notes: notes || null,
          bomRequirements: {
            create: bomRequirements,
          },
        },
        include: {
          bomRequirements: true,
          salesOrder: { select: { orderNumber: true } },
        },
      });

      // Update order status
      if (["ORDER_RECEIVED", "PRODUCTION_PLANNING"].includes(salesOrder.status)) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: "PRODUCTION_PLANNING" },
        });
        await tx.orderStatusLog.create({
          data: {
            salesOrderId,
            fromStatus: salesOrder.status,
            toStatus: "PRODUCTION_PLANNING",
            changedById: session.user.id,
            notes: `Production plan created: ${planNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityId: productionPlan.id,
          entityType: "ProductionPlan",
          newValue: { planNumber, salesOrderId } as any,
        },
      });

      return productionPlan;
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("POST /api/production error:", error);
    return NextResponse.json({ error: "Failed to create production plan" }, { status: 500 });
  }
}
