import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { orderStatusUpdateSchema } from "@/lib/validations/order";

// Valid status transitions (state machine)
const VALID_TRANSITIONS: Record<string, string[]> = {
  ORDER_RECEIVED: ["ORDER_CONFIRMED", "CANCELLED", "ON_HOLD"],
  ORDER_CONFIRMED: ["PRODUCTION_PLANNED", "CANCELLED", "ON_HOLD"],
  PRODUCTION_PLANNED: ["MATERIALS_SOURCED", "IN_PRODUCTION", "CANCELLED", "ON_HOLD"],
  MATERIALS_SOURCED: ["IN_PRODUCTION", "ON_HOLD"],
  IN_PRODUCTION: ["PRODUCTION_COMPLETE", "ON_HOLD"],
  PRODUCTION_COMPLETE: ["QC_PENDING", "ON_HOLD"],
  QC_PENDING: ["QC_APPROVED", "QC_REJECTED"],
  QC_APPROVED: ["PACKAGING"],
  QC_REJECTED: ["IN_PRODUCTION", "CANCELLED"], // can retry production or cancel
  PACKAGING: ["READY_TO_SHIP"],
  READY_TO_SHIP: ["SHIPPED"],
  SHIPPED: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: ["INVOICED"],
  INVOICED: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["PAYMENT_RECEIVED"],
  PAYMENT_RECEIVED: ["COMPLETED"],
  ON_HOLD: [
    "ORDER_CONFIRMED",
    "PRODUCTION_PLANNED",
    "MATERIALS_SOURCED",
    "IN_PRODUCTION",
    "CANCELLED",
  ],
  COMPLETED: [],
  CANCELLED: [],
};

// Role permissions for status changes
const STATUS_ROLE_MAP: Record<string, string[]> = {
  ORDER_CONFIRMED: ["Admin", "Sales Manager"],
  PRODUCTION_PLANNED: ["Admin", "Production Manager"],
  MATERIALS_SOURCED: ["Admin", "Procurement Officer", "Production Manager"],
  IN_PRODUCTION: ["Admin", "Production Manager"],
  PRODUCTION_COMPLETE: ["Admin", "Production Manager"],
  QC_PENDING: ["Admin", "Production Manager"],
  QC_APPROVED: ["Admin", "Production Manager"],
  QC_REJECTED: ["Admin", "Production Manager"],
  PACKAGING: ["Admin", "Production Manager", "Warehouse Staff"],
  READY_TO_SHIP: ["Admin", "Warehouse Staff"],
  SHIPPED: ["Admin", "Warehouse Staff"],
  IN_TRANSIT: ["Admin", "Warehouse Staff"],
  DELIVERED: ["Admin", "Warehouse Staff", "Sales Manager"],
  INVOICED: ["Admin", "Finance"],
  PAYMENT_PENDING: ["Admin", "Finance"],
  PAYMENT_RECEIVED: ["Admin", "Finance"],
  COMPLETED: ["Admin", "Finance"],
  CANCELLED: ["Admin", "Sales Manager"],
  ON_HOLD: ["Admin", "Sales Manager", "Production Manager"],
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    const userRole = session.user.role || "";

    // Filter transitions by user's role
    const availableTransitions = allowedTransitions.filter((status) => {
      const allowedRoles = STATUS_ROLE_MAP[status] || ["Admin"];
      return allowedRoles.includes(userRole) || userRole === "Admin";
    });

    return NextResponse.json({
      currentStatus: order.status,
      availableTransitions,
      allTransitions: VALID_TRANSITIONS,
    });
  } catch (error) {
    console.error("GET /api/orders/[id]/status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = orderStatusUpdateSchema.parse(body);

    const order = await prisma.salesOrder.findUnique({ where: { id: params.id } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Validate transition
    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(validated.status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition: ${order.status} → ${validated.status}`,
          allowedTransitions,
        },
        { status: 400 }
      );
    }

    // Check role permission
    const userRole = session.user.role || "";
    const allowedRoles = STATUS_ROLE_MAP[validated.status] || ["Admin"];
    if (!allowedRoles.includes(userRole) && userRole !== "Admin") {
      return NextResponse.json(
        { error: `Your role (${userRole}) cannot set status to ${validated.status}` },
        { status: 403 }
      );
    }

    // Update in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id: params.id },
        data: {
          status: validated.status as any,
          updatedAt: new Date(),
        },
      });

      await tx.orderStatusLog.create({
        data: {
          salesOrderId: params.id,
          fromStatus: order.status,
          toStatus: validated.status,
          changedById: session.user.id,
          remarks: validated.remarks || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "STATUS_CHANGE",
          module: "ORDER",
          entityId: params.id,
          entityType: "SalesOrder",
          previousData: { status: order.status } as any,
          newData: { status: validated.status } as any,
        },
      });

      return updated;
    });

    return NextResponse.json({
      order: updatedOrder,
      transition: {
        from: order.status,
        to: validated.status,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("PUT /api/orders/[id]/status error:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
