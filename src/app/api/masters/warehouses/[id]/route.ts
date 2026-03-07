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

    const warehouse = await prisma.warehouse.findUnique({
      where: { id: params.id },
      include: {
        inventory: {
          include: {
            product: { select: { id: true, name: true, sku: true, itemType: true } },
          },
          orderBy: { quantityOnHand: "desc" },
        },
        _count: { select: { inventory: true } },
      },
    });

    if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("GET /api/masters/warehouses/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch warehouse" }, { status: 500 });
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
    const existing = await prisma.warehouse.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });

    if (body.code && body.code !== existing.code) {
      const codeExists = await prisma.warehouse.findFirst({ where: { code: body.code } });
      if (codeExists) return NextResponse.json({ error: "Warehouse code already in use" }, { status: 409 });
    }

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: { ...body, updatedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        module: "WAREHOUSE",
        entityId: warehouse.id,
        entityType: "Warehouse",
        previousData: existing as any,
        newData: warehouse as any,
      },
    });

    return NextResponse.json(warehouse);
  } catch (error) {
    console.error("PUT /api/masters/warehouses/[id] error:", error);
    return NextResponse.json({ error: "Failed to update warehouse" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.warehouse.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        module: "WAREHOUSE",
        entityId: params.id,
        entityType: "Warehouse",
      },
    });

    return NextResponse.json({ message: "Warehouse deactivated" });
  } catch (error) {
    console.error("DELETE /api/masters/warehouses/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete warehouse" }, { status: 500 });
  }
}
