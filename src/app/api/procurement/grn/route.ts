import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { grnInputSchema } from "@/lib/validations/order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (purchaseOrderId) where.purchaseOrderId = purchaseOrderId;

    const [grns, total] = await Promise.all([
      prisma.gRN.findMany({
        where,
        include: {
          purchaseOrder: {
            select: { id: true, poNumber: true, vendor: { select: { name: true } } },
          },
          warehouse: { select: { id: true, name: true, code: true } },
          items: {
            include: {
              purchaseOrderItem: {
                include: { product: { select: { id: true, name: true, sku: true } } },
              },
            },
          },
          receivedBy: { select: { id: true, name: true } },
        },
        orderBy: { receivedDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.gRN.count({ where }),
    ]);

    return NextResponse.json({
      data: grns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/procurement/grn error:", error);
    return NextResponse.json({ error: "Failed to fetch GRNs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = grnInputSchema.parse(body);

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: validated.purchaseOrderId },
      include: { items: true },
    });
    if (!po) return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });

    const grnNumber = await generateNextNumber("GRN");

    const grn = await prisma.$transaction(async (tx) => {
      const grnRecord = await tx.gRN.create({
        data: {
          grnNumber,
          purchaseOrderId: validated.purchaseOrderId,
          warehouseId: validated.warehouseId,
          receivedDate: new Date(),
          status: "RECEIVED",
          receivedById: session.user.id,
          notes: validated.notes || null,
          items: {
            create: validated.items.map((item) => ({
              purchaseOrderItemId: item.purchaseOrderItemId,
              receivedQuantity: item.receivedQuantity,
              acceptedQuantity: item.acceptedQuantity,
              rejectedQuantity: item.rejectedQuantity,
              notes: item.notes || null,
            })),
          },
        },
        include: {
          items: {
            include: {
              purchaseOrderItem: {
                include: { product: { select: { id: true, name: true, sku: true } } },
              },
            },
          },
        },
      });

      // Update PO item received quantities and create inventory movements
      for (const item of validated.items) {
        const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
        if (poItem) {
          await tx.purchaseOrderItem.update({
            where: { id: item.purchaseOrderItemId },
            data: { receivedQuantity: { increment: item.acceptedQuantity } },
          });

          // Add to inventory
          if (item.acceptedQuantity > 0) {
            const inventory = await tx.inventory.upsert({
              where: {
                productId_warehouseId: {
                  productId: poItem.productId,
                  warehouseId: validated.warehouseId,
                },
              },
              update: { quantityOnHand: { increment: item.acceptedQuantity } },
              create: {
                productId: poItem.productId,
                warehouseId: validated.warehouseId,
                quantityOnHand: item.acceptedQuantity,
                quantityReserved: 0,
              },
            });

            // Record inventory movement
            await tx.inventoryMovement.create({
              data: {
                inventoryId: inventory.id,
                movementType: "IN",
                quantity: item.acceptedQuantity,
                reason: `GRN: ${grnNumber}`,
                referenceType: "GRN",
                referenceId: grnRecord.id,
                performedById: session.user.id,
                beforeQuantity: inventory.quantityOnHand - item.acceptedQuantity,
                afterQuantity: inventory.quantityOnHand,
              },
            });
          }
        }
      }

      // Check if all PO items are fully received
      const updatedPO = await tx.purchaseOrder.findUnique({
        where: { id: validated.purchaseOrderId },
        include: { items: true },
      });
      const allReceived = updatedPO?.items.every((i) => i.receivedQuantity >= i.quantity);
      if (allReceived) {
        await tx.purchaseOrder.update({
          where: { id: validated.purchaseOrderId },
          data: { status: "FULLY_RECEIVED" },
        });
      } else {
        await tx.purchaseOrder.update({
          where: { id: validated.purchaseOrderId },
          data: { status: "PARTIALLY_RECEIVED" },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          module: "GRN",
          entityId: grnRecord.id,
          entityType: "GRN",
          newData: { grnNumber, purchaseOrderId: validated.purchaseOrderId } as any,
        },
      });

      return grnRecord;
    });

    return NextResponse.json(grn, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/procurement/grn error:", error);
    return NextResponse.json({ error: "Failed to create GRN" }, { status: 500 });
  }
}
