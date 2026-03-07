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

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        shippingAddresses: true,
        salesOrders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
        _count: { select: { salesOrders: true, invoices: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (error) {
    console.error("GET /api/masters/customers/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
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
    const existing = await prisma.customer.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { ...body, updatedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        module: "CUSTOMER",
        entityId: customer.id,
        entityType: "Customer",
        previousData: existing as any,
        newData: customer as any,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("PUT /api/masters/customers/[id] error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.customer.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        module: "CUSTOMER",
        entityId: params.id,
        entityType: "Customer",
      },
    });

    return NextResponse.json({ message: "Customer deactivated" });
  } catch (error) {
    console.error("DELETE /api/masters/customers/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
