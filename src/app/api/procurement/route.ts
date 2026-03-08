import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { purchaseOrderInputSchema } from "@/lib/validations/order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const vendorId = searchParams.get("vendorId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: "insensitive" } },
        { vendor: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: { select: { id: true, companyName: true, contactName: true, email: true, phone: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true, itemType: true } } },
          },
          grns: { select: { id: true, grnNumber: true, status: true, receivedDate: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = purchaseOrderInputSchema.parse(body);

    const vendor = await prisma.vendor.findUnique({ where: { id: validated.vendorId } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const poNumber = await generateNextNumber("PO");

    let totalAmount = 0;
    const itemsData: any[] = [];
    for (const item of validated.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return NextResponse.json({ error: `Product not found: ${item.productId}` }, { status: 404 });

      const lineTotal = item.quantity * item.unitPrice;
      totalAmount += lineTotal;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        rate: item.unitPrice,
        lineTotal,
        receivedQty: 0,
      });
    }

    const po = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          poNumber,
          vendorId: validated.vendorId,
          warehouseId: validated.warehouseId,
          status: "DRAFT",
          grandTotal: totalAmount,
          notes: validated.notes || null,
          paymentTermsDays: validated.paymentTermsDays,
          createdById: session.user.id,
          items: { create: itemsData },
        },
        include: {
          vendor: { select: { companyName: true, contactName: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityId: purchaseOrder.id,
          entityType: "PurchaseOrder",
          newValue: { poNumber, vendorId: validated.vendorId, totalAmount } as any,
        },
      });

      return purchaseOrder;
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/procurement error:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}
