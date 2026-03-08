import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { productSchema } from "@/lib/validations/product";

// GET /api/masters/products - List all products with filters
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
    const itemType = searchParams.get("itemType") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const isActive = searchParams.get("isActive");

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (itemType) {
      const types = itemType.split(",").map((t) => t.trim()).filter(Boolean);
      where.itemType = types.length === 1 ? types[0] : { in: types };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          productType: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true, abbreviation: true } },
          taxConfig: { select: { id: true, name: true, rate: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/masters/products error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST /api/masters/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = productSchema.parse(body);

    // Check SKU uniqueness
    const existingSku = await prisma.product.findUnique({
      where: { sku: validatedData.sku },
    });
    if (existingSku) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: validatedData,
      include: {
        category: { select: { id: true, name: true } },
        productType: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
        taxConfig: { select: { id: true, name: true, rate: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "PRODUCT",
        entityId: product.id,
        newValue: validatedData as any,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/masters/products error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
