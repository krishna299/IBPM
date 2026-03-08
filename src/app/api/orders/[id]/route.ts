import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          include: { shippingAddresses: true },
        },
        shippingAddress: true,
        items: {
          include: {
            product: {
              select: {
                id: true, name: true, sku: true, itemType: true,
                hsnCode: true, weightG: true,
              },
            },
          },
        },
        statusLog: {
          orderBy: { createdAt: "desc" },
        },
        productionPlans: {
          include: {
            bomRequirements: true,
          },
        },
        shipments: true,
        invoices: {
          include: {
            items: true,
            payments: true,
          },
        },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch (error) {
    console.error("GET /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
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
    const existing = await prisma.salesOrder.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Only allow editing if order is in early stages
    if (!["ORDER_RECEIVED", "ORDER_CONFIRMED", "ON_HOLD"].includes(existing.status)) {
      return NextResponse.json(
        { error: "Cannot edit order in current status: " + existing.status },
        { status: 400 }
      );
    }

    const order = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        internalNotes: body.notes,
        expectedDeliveryDate: body.expectedDeliveryDate ? new Date(body.expectedDeliveryDate) : undefined,
        paymentTermsDays: body.paymentTermsDays,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityId: order.id,
        entityType: "SalesOrder",
        oldValue: existing as any,
        newValue: order as any,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("PUT /api/orders/[id] error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
