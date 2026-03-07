import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const packagingSchema = z.object({
  name: z.string().min(1, "Packaging name is required"),
  description: z.string().optional(),
  materialType: z.string().optional(),
  size: z.string().optional(),
  costPerUnit: z.number().min(0).optional(),
});

export async function GET() {
  try {
    const packaging = await prisma.packagingOption.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { productPackaging: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: packaging });
  } catch (error) {
    console.error("GET /api/masters/packaging error:", error);
    return NextResponse.json({ error: "Failed to fetch packaging options" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = packagingSchema.parse(body);

    const packaging = await prisma.packagingOption.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        materialType: validated.materialType || null,
        size: validated.size || null,
        costPerUnit: validated.costPerUnit || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        module: "PACKAGING",
        entityId: packaging.id,
        entityType: "PackagingOption",
        newData: packaging as any,
      },
    });

    return NextResponse.json(packaging, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/masters/packaging error:", error);
    return NextResponse.json({ error: "Failed to create packaging option" }, { status: 500 });
  }
}
