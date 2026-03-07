import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const taxConfigSchema = z.object({
  name: z.string().min(1, "Tax config name is required"),
  hsnCode: z.string().optional(),
  cgstPercent: z.number().min(0).max(100).default(0),
  sgstPercent: z.number().min(0).max(100).default(0),
  igstPercent: z.number().min(0).max(100).default(0),
  cessPercent: z.number().min(0).max(100).default(0),
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
        hsnCode: validated.hsnCode || null,
        cgstPercent: validated.cgstPercent,
        sgstPercent: validated.sgstPercent,
        igstPercent: validated.igstPercent,
        cessPercent: validated.cessPercent,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        module: "TAX_CONFIG",
        entityId: taxConfig.id,
        entityType: "TaxConfig",
        newData: taxConfig as any,
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
