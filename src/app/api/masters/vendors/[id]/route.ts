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

    const vendor = await prisma.vendor.findUnique({
      where: { id: params.id },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: "desc" },
          select: { id: true, poNumber: true, status: true, totalAmount: true, createdAt: true },
        },
        _count: { select: { purchaseOrders: true } },
      },
    });

    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    return NextResponse.json(vendor);
  } catch (error) {
    console.error("GET /api/masters/vendors/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch vendor" }, { status: 500 });
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
    const existing = await prisma.vendor.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: { ...body, updatedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        module: "VENDOR",
        entityId: vendor.id,
        entityType: "Vendor",
        previousData: existing as any,
        newData: vendor as any,
      },
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("PUT /api/masters/vendors/[id] error:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.vendor.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        module: "VENDOR",
        entityId: params.id,
        entityType: "Vendor",
      },
    });

    return NextResponse.json({ message: "Vendor deactivated" });
  } catch (error) {
    console.error("DELETE /api/masters/vendors/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
