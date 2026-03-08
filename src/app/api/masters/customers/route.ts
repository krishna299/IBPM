import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { customerInputSchema } from "@/lib/validations/product";

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
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (search) {
      where.OR = [
        { contactName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { gstNumber: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true";
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          shippingAddresses: true,
          _count: { select: { salesOrders: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/masters/customers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = customerInputSchema.parse(body);

    // Check duplicate email
    if (validated.email) {
      const existing = await prisma.customer.findFirst({
        where: { email: validated.email },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Customer with this email already exists" },
          { status: 409 }
        );
      }
    }

    const customer = await prisma.customer.create({
      data: {
        customerType: validated.customerType,
        companyName: validated.companyName || null,
        contactName: validated.contactName,
        email: validated.email,
        phone: validated.phone,
        altPhone: validated.altPhone || null,
        gstNumber: validated.gstNumber || null,
        panNumber: validated.panNumber || null,
        billingAddress: validated.billingAddress as any,
        creditLimit: validated.creditLimit,
        paymentTermsDays: validated.paymentTermsDays,
        notes: validated.notes || null,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityId: customer.id,
        entityType: "Customer",
        newValue: customer as any,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    console.error("POST /api/masters/customers error:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}
