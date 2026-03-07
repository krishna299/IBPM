import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const priceListSchema = z.object({
  name: z.string().min(1, "Price list name is required"),
  description: z.string().optional(),
  currency: z.string().default("INR"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});

export async function GET() {
  try {
    const priceLists = await prisma.priceList.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: priceLists });
  } catch (error) {
    console.error("GET /api/masters/price-lists error:", error);
    return NextResponse.json({ error: "Failed to fetch price lists" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = priceListSchema.parse(body);

    const priceList = await prisma.priceList.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        currency: validated.currency,
        validFrom: validated.validFrom ? new Date(validated.validFrom) : null,
        validTo: validated.validTo ? new Date(validated.validTo) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        module: "PRICE_LIST",
        entityId: priceList.id,
        entityType: "PriceList",
        newData: priceList as any,
      },
    });

    return NextResponse.json(priceList, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/masters/price-lists error:", error);
    return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
  }
}
