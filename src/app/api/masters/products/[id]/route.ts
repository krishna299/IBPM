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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        productType: true,
        unit: true,
        taxConfig: true,
        bomItems: {
          include: { rawMaterial: { select: { id: true, name: true, sku: true, itemType: true } } },
        },
        usedInProducts: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        productPackaging: {
          include: { packagingOption: true },
        },
        inventory: {
          include: { warehouse: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("GET /api/masters/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check SKU uniqueness if changed
    if (body.sku && body.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku: body.sku } });
      if (skuExists) {
        return NextResponse.json({ error: "SKU already in use" }, { status: 409 });
      }
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        module: "PRODUCT",
        entityId: product.id,
        entityType: "Product",
        previousData: existing as any,
        newData: product as any,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/masters/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Soft delete
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        module: "PRODUCT",
        entityId: product.id,
        entityType: "Product",
        previousData: { isActive: true } as any,
        newData: { isActive: false } as any,
      },
    });

    return NextResponse.json({ message: "Product deactivated" });
  } catch (error) {
    console.error("DELETE /api/masters/products/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
