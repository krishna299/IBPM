import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { shipmentSchema } from "@/lib/validations/order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        include: {
          salesOrder: {
            select: {
              id: true, orderNumber: true, status: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      data: shipments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/shipping error:", error);
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = shipmentSchema.parse(body);

    const shipNumber = await generateNextNumber("SHIP");

    const shipment = await prisma.$transaction(async (tx) => {
      const ship = await tx.shipment.create({
        data: {
          shipmentNumber: shipNumber,
          salesOrderId: validated.salesOrderId,
          warehouseId: validated.warehouseId,
          trackingNumber: validated.trackingNumber || null,
          courierPartner: validated.courierPartner || null,
          shippingMethod: validated.shippingMethod || null,
          estimatedDelivery: validated.estimatedDelivery ? new Date(validated.estimatedDelivery) : null,
          status: "DISPATCHED",
          notes: validated.notes || null,
        },
        include: {
          salesOrder: { select: { id: true, orderNumber: true, status: true } },
          warehouse: { select: { name: true } },
        },
      });

      // Update order status to SHIPPED
      const order = await tx.salesOrder.findUnique({ where: { id: validated.salesOrderId } });
      if (order && ["READY_TO_SHIP"].includes(order.status)) {
        await tx.salesOrder.update({
          where: { id: validated.salesOrderId },
          data: { status: "SHIPPED" },
        });
        await tx.orderStatusLog.create({
          data: {
            salesOrderId: validated.salesOrderId,
            fromStatus: order.status,
            toStatus: "SHIPPED",
            changedById: session.user.id,
            remarks: `Shipment created: ${shipNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          module: "SHIPPING",
          entityId: ship.id,
          entityType: "Shipment",
          newData: { shipmentNumber: shipNumber } as any,
        },
      });

      return ship;
    });

    return NextResponse.json(shipment, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/shipping error:", error);
    return NextResponse.json({ error: "Failed to create shipment" }, { status: 500 });
  }
}
