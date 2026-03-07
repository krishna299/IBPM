import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { generateNextNumber } from "@/lib/utils/number-sequence";
import { qcReportSchema } from "@/lib/validations/order";

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

    const [reports, total] = await Promise.all([
      prisma.qCReport.findMany({
        where,
        include: {
          salesOrder: { select: { id: true, orderNumber: true } },
          product: { select: { id: true, name: true, sku: true } },
          inspectedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.qCReport.count({ where }),
    ]);

    return NextResponse.json({
      data: reports,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/qc error:", error);
    return NextResponse.json({ error: "Failed to fetch QC reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const validated = qcReportSchema.parse(body);

    const qcNumber = await generateNextNumber("QC");

    const report = await prisma.$transaction(async (tx) => {
      const qcReport = await tx.qCReport.create({
        data: {
          reportNumber: qcNumber,
          salesOrderId: validated.salesOrderId || null,
          productId: validated.productId,
          batchNumber: validated.batchNumber || null,
          inspectedQuantity: validated.inspectedQuantity,
          passedQuantity: validated.passedQuantity,
          failedQuantity: validated.failedQuantity,
          status: validated.status as any,
          remarks: validated.remarks || null,
          parameters: validated.parameters || null,
          inspectedById: session.user.id,
        },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
        },
      });

      // If linked to sales order and QC approved/rejected, update order status
      if (validated.salesOrderId) {
        const order = await tx.salesOrder.findUnique({ where: { id: validated.salesOrderId } });
        if (order && order.status === "QC_PENDING") {
          const newStatus = validated.status === "APPROVED" ? "QC_APPROVED" :
                           validated.status === "REJECTED" ? "QC_REJECTED" : order.status;

          if (newStatus !== order.status) {
            await tx.salesOrder.update({
              where: { id: validated.salesOrderId },
              data: { status: newStatus },
            });
            await tx.orderStatusLog.create({
              data: {
                salesOrderId: validated.salesOrderId,
                fromStatus: order.status,
                toStatus: newStatus,
                changedById: session.user.id,
                remarks: `QC Report: ${qcNumber} - ${validated.status}`,
              },
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          module: "QC",
          entityId: qcReport.id,
          entityType: "QCReport",
          newData: { reportNumber: qcNumber, status: validated.status } as any,
        },
      });

      return qcReport;
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/qc error:", error);
    return NextResponse.json({ error: "Failed to create QC report" }, { status: 500 });
  }
}
