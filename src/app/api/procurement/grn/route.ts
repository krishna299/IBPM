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
            select: { id: true, poNumber: true, vendor: { select: { companyName: true, contactName: true } } },
          },
          vendor: { select: { id: true, companyName: true, contactName: true } },
          items: true,
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
          vendorId: po.vendorId,
          receivedDate: new Date(),
          status: "ACCEPTED",
          notes: validated.notes || null,
          items: {
            create: validated.items.map((item) => {
              const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
              return {
                productId: poItem?.productId || "",
                quantity: item.acceptedQuantity,
                accepted: item.acceptedQuantity > 0,
                remarks: item.notes || null,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Update PO item received quantities and create inventory movements
      for (const item of validated.items) {
        const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
        if (poItem && item.acceptedQuantity > 0) {
          await tx.purchaseOrderItem.update({
            where: { id: item.purchaseOrderItemId },
            data: { receivedQty: { increment: item.acceptedQuantity } },
          });

          // Find existing inventory
          const existingInventory = await tx.inventory.findFirst({
            where: {
              productId: poItem.productId,
              warehouseId: validated.warehouseId,
              batchNumber: null,
            },
          });

          if (existingInventory) {
            await tx.inventory.update({
              where: { id: existingInventory.id },
              data: { quantityOnHand: { increment: item.acceptedQuantity } },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: poItem.productId,
                warehouseId: validated.warehouseId,
                movementType: "IN",
                quantity: item.acceptedQuantity,
                referenceType: "GRN",
                referenceId: grnRecord.id,
                beforeQty: existingInventory.quantityOnHand,
                afterQty: existingInventory.quantityOnHand + item.acceptedQuantity,
                createdById: session.user.id,
              },
            });
          } else {
            await tx.inventory.create({
              data: {
                productId: poItem.productId,
                warehouseId: validated.warehouseId,
                quantityOnHand: item.acceptedQuantity,
              },
            });

            await tx.inventoryMovement.create({
              data: {
                productId: poItem.productId,
                warehouseId: validated.warehouseId,
                movementType: "IN",
                quantity: item.acceptedQuantity,
                referenceType: "GRN",
                referenceId: grnRecord.id,
                beforeQty: 0,
                afterQty: item.acceptedQuantity,
                createdById: session.user.id,
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
      const allReceived = updatedPO?.items.every((i) => i.receivedQty >= i.quantity);
      await tx.purchaseOrder.update({
        where: { id: validated.purchaseOrderId },
        data: { status: allReceived ? "FULLY_RECEIVED" : "PARTIALLY_RECEIVED" },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityId: grnRecord.id,
          entityType: "GRN",
          newValue: { grnNumber, purchaseOrderId: validated.purchaseOrderId } as any,
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
