import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { paymentInputSchema } from "@/lib/validations/order";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const invoiceId = searchParams.get("invoiceId") || "";

    const where: any = {};
    if (invoiceId) where.invoiceId = invoiceId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true, grandTotal: true, balanceDue: true },
          },
          customer: { select: { id: true, companyName: true, contactName: true } },
        },
        orderBy: { paymentDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = paymentInputSchema.parse(body);

    const paymentNumber = await generateNextNumber("PAY");

    const invoice = await prisma.invoice.findUnique({ where: { id: validated.invoiceId } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    if (validated.amount > invoice.balanceDue) {
      return NextResponse.json(
        { error: `Payment amount (${validated.amount}) exceeds balance due (${invoice.balanceDue})` },
        { status: 400 }
      );
    }

    const payment = await prisma.$transaction(async (tx) => {
      const pay = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: validated.invoiceId,
          customerId: validated.customerId,
          amount: validated.amount,
          paymentDate: new Date(validated.paymentDate),
          paymentMethod: validated.paymentMethod,
          referenceNumber: validated.referenceNumber || null,
          status: "COMPLETED",
          notes: validated.notes || null,
        },
        include: {
          invoice: { select: { invoiceNumber: true, salesOrderId: true } },
          customer: { select: { companyName: true, contactName: true } },
        },
      });

      // Update invoice balance
      const newBalance = invoice.balanceDue - validated.amount;
      const invoiceStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";
      await tx.invoice.update({
        where: { id: validated.invoiceId },
        data: {
          balanceDue: Math.max(0, newBalance),
          status: invoiceStatus,
          paidAmount: { increment: validated.amount },
        },
      });

      // If fully paid and linked to sales order, update order status
      if (newBalance <= 0 && invoice.salesOrderId) {
        const order = await tx.salesOrder.findUnique({ where: { id: invoice.salesOrderId } });
        if (order && ["INVOICED", "PAYMENT_PENDING"].includes(order.status)) {
          await tx.salesOrder.update({
            where: { id: invoice.salesOrderId },
            data: { status: "PAYMENT_RECEIVED" },
          });
          await tx.orderStatusLog.create({
            data: {
              salesOrderId: invoice.salesOrderId,
              fromStatus: order.status,
              toStatus: "PAYMENT_RECEIVED",
              changedById: session.user.id,
              notes: `Payment received: ${paymentNumber} (₹${validated.amount})`,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityId: pay.id,
          entityType: "Payment",
          newValue: { paymentNumber, amount: validated.amount, method: validated.paymentMethod } as any,
        },
      });

      return pay;
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/payments error:", error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
