import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const bomItemSchema = z.object({
  productId: z.string().min(1, "Product (FG) is required"),
  rawMaterialId: z.string().min(1, "Raw material/packaging item is required"),
  quantityRequired: z.number().min(0.001, "Quantity must be positive"),
  unitOfMeasure: z.string().optional(),
  wastagePercent: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    const bomItems = await prisma.bOMItem.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true, itemType: true } },
        rawMaterial: { select: { id: true, name: true, sku: true, itemType: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: bomItems });
  } catch (error) {
    console.error("GET /api/masters/bom error:", error);
    return NextResponse.json({ error: "Failed to fetch BOM items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = bomItemSchema.parse(body);

    // Verify product is FG type
    const product = await prisma.product.findUnique({ where: { id: validated.productId } });
    if (!product || product.itemType !== "FINISHED_GOOD") {
      return NextResponse.json({ error: "Product must be a Finished Good (FG)" }, { status: 400 });
    }

    // Verify raw material is RM or PM type
    const rawMaterial = await prisma.product.findUnique({ where: { id: validated.rawMaterialId } });
    if (!rawMaterial || !["RAW_MATERIAL", "PACKAGING_MATERIAL", "CONSUMABLE"].includes(rawMaterial.itemType)) {
      return NextResponse.json({ error: "Material must be RM, PM, or Consumable" }, { status: 400 });
    }

    // Check duplicate entry
    const existing = await prisma.bOMItem.findFirst({
      where: { productId: validated.productId, rawMaterialId: validated.rawMaterialId },
    });
    if (existing) {
      return NextResponse.json({ error: "This material is already in the BOM for this product" }, { status: 409 });
    }

    const bomItem = await prisma.bOMItem.create({
      data: {
        productId: validated.productId,
        rawMaterialId: validated.rawMaterialId,
        quantityRequired: validated.quantityRequired,
        unitOfMeasure: validated.unitOfMeasure || null,
        wastagePercent: validated.wastagePercent,
        notes: validated.notes || null,
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        rawMaterial: { select: { id: true, name: true, sku: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        module: "BOM",
        entityId: bomItem.id,
        entityType: "BOMItem",
        newData: bomItem as any,
      },
    });

    return NextResponse.json(bomItem, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/masters/bom error:", error);
    return NextResponse.json({ error: "Failed to create BOM item" }, { status: 500 });
  }
}
