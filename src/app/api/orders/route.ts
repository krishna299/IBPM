import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { salesOrderInputSchema } from "@/lib/validations/order";
import { generateNextNumber } from "@/lib/utils/number-sequence";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const customerId = searchParams.get("customerId") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const where: any = {};

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customer: { contactName: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (dateFrom || dateTo) {
      where.orderDate = {};
      if (dateFrom) where.orderDate.gte = new Date(dateFrom);
      if (dateTo) where.orderDate.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, companyName: true, contactName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true, itemType: true } },
            },
          },
          _count: {
            select: { statusLog: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.salesOrder.count({ where }),
    ]);

    // Calculate summary stats
    const stats = await prisma.salesOrder.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { grandTotal: true },
    });

    return NextResponse.json({
      data: orders,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = salesOrderInputSchema.parse(body);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validated.customerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Generate order number
    const orderNumber = await generateNextNumber("SO");

    // Calculate item totals
    let subtotal = 0;
    let totalTax = 0;
    const itemsData: any[] = [];

    for (const item of validated.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { taxConfig: true },
      });
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 404 }
        );
      }

      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = lineTotal * (item.discountPercent / 100);
      const taxableAmount = lineTotal - discountAmount;

      // Use product's tax config or the one specified
      const taxConfig = item.taxConfigId
        ? await prisma.taxConfig.findUnique({ where: { id: item.taxConfigId } })
        : product.taxConfig;

      const taxRate = taxConfig ? taxConfig.rate / 100 : 0;
      const itemTax = taxableAmount * taxRate;

      subtotal += taxableAmount;
      totalTax += itemTax;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        discountAmount,
        lineTotal: taxableAmount,
        taxAmount: itemTax,
        notes: item.notes || null,
      });
    }

    const totalAmount = subtotal + totalTax;

    // Create order with items in transaction
    const order = await prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber,
          customerId: validated.customerId,
          shippingAddressId: validated.shippingAddressId || null,
          orderDate: new Date(validated.orderDate),
          expectedDeliveryDate: validated.expectedDeliveryDate
            ? new Date(validated.expectedDeliveryDate)
            : null,
          status: "ORDER_RECEIVED",
          subtotal,
          taxAmount: totalTax,
          grandTotal: totalAmount,
          internalNotes: validated.notes || null,
          paymentTermsDays: validated.paymentTermsDays,
          createdById: session.user.id,
          items: {
            create: itemsData,
          },
        },
        include: {
          customer: { select: { id: true, companyName: true, contactName: true } },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      });

      // Create initial status log
      await tx.orderStatusLog.create({
        data: {
          salesOrderId: salesOrder.id,
          fromStatus: null,
          toStatus: "ORDER_RECEIVED",
          changedById: session.user.id,
          notes: "Order created",
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityId: salesOrder.id,
          entityType: "SalesOrder",
          newValue: { orderNumber, customerId: validated.customerId, totalAmount } as any,
        },
      });

      return salesOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/orders error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
