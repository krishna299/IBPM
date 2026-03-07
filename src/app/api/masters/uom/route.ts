import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { z } from "zod";

const uomSchema = z.object({
  name: z.string().min(1, "UOM name is required"),
  abbreviation: z.string().min(1, "Abbreviation is required").max(10),
});

export async function GET() {
  try {
    const uoms = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: uoms });
  } catch (error) {
    console.error("GET /api/masters/uom error:", error);
    return NextResponse.json({ error: "Failed to fetch UOMs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = uomSchema.parse(body);

    const existing = await prisma.unitOfMeasure.findFirst({
      where: { abbreviation: validated.abbreviation },
    });
    if (existing) {
      return NextResponse.json({ error: "UOM with this abbreviation already exists" }, { status: 409 });
    }

    const uom = await prisma.unitOfMeasure.create({
      data: { name: validated.name, abbreviation: validated.abbreviation },
    });

    return NextResponse.json(uom, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("POST /api/masters/uom error:", error);
    return NextResponse.json({ error: "Failed to create UOM" }, { status: 500 });
  }
}
