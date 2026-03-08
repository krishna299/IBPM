import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const taxConfigSchema = z.object({
  name: z.string().min(1, "Tax config name is required"),
  rate: z.number().min(0).max(100),
  taxType: z.enum(["GST", "IGST", "EXEMPT"]).default("GST"),
  hsnRange: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taxConfigs = await prisma.taxConfig.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ data: taxConfigs });
  } catch (error) {
    console.error("GET /api/masters/tax-configs error:", error);
    return NextResponse.json({ error: "Failed to fetch tax configs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = taxConfigSchema.parse(body);

    const taxConfig = await prisma.taxConfig.create({
      data: {
        name: validated.name,
        rate: validated.rate,
        taxType: validated.taxType,
        hsnRange: validated.hsnRange || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityId: taxConfig.id,
        entityType: "TaxConfig",
        newValue: taxConfig as any,
      },
    });

    return NextResponse.json(taxConfig, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/masters/tax-configs error:", error);
    return NextResponse.json({ error: "Failed to create tax config" }, { status: 500 });
  }
}
