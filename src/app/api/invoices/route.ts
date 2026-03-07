import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { invoiceInputSchema } from "@/lib/validations/order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true, gstNumber: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = invoiceInputSchema.parse(body);

    const invoiceNumber = await generateNextNumber("INV");

    let subtotal = 0;
    let totalTax = 0;
    const itemsData = [];

    for (const item of validated.items) {
      const lineTotal = item.quantity * item.unitPrice;
      const discountAmount = lineTotal * (item.discountPercent / 100);
      const taxableAmount = lineTotal - discountAmount;
      const cgst = taxableAmount * (item.cgstPercent / 100);
      const sgst = taxableAmount * (item.sgstPercent / 100);
      const igst = taxableAmount * (item.igstPercent / 100);
      const itemTax = cgst + sgst + igst;

      subtotal += taxableAmount;
      totalTax += itemTax;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxableAmount,
        cgstPercent: item.cgstPercent,
        cgstAmount: cgst,
        sgstPercent: item.sgstPercent,
        sgstAmount: sgst,
        igstPercent: item.igstPercent,
        igstAmount: igst,
        totalAmount: taxableAmount + itemTax,
      });
    }

    const totalAmount = subtotal + totalTax;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          salesOrderId: validated.salesOrderId,
          customerId: validated.customerId,
          invoiceDate: new Date(validated.invoiceDate),
          dueDate: new Date(validated.dueDate),
          subtotal,
          taxAmount: totalTax,
          totalAmount,
          balanceDue: totalAmount,
          status: "DRAFT",
          notes: validated.notes || null,
          items: { create: itemsData },
        },
        include: {
          customer: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
      });

      // Update order status to INVOICED
      const order = await tx.salesOrder.findUnique({ where: { id: validated.salesOrderId } });
      if (order && order.status === "DELIVERED") {
        await tx.salesOrder.update({
          where: { id: validated.salesOrderId },
          data: { status: "INVOICED" },
        });
        await tx.orderStatusLog.create({
          data: {
            salesOrderId: validated.salesOrderId,
            fromStatus: "DELIVERED",
            toStatus: "INVOICED",
            changedById: session.user.id,
            remarks: `Invoice created: ${invoiceNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          module: "INVOICE",
          entityId: inv.id,
          entityType: "Invoice",
          newData: { invoiceNumber, totalAmount } as any,
        },
      });

      return inv;
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/invoices error:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
