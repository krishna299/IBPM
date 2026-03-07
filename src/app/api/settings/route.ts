import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const settings = await prisma.setting.findMany({
      orderBy: { key: "asc" },
    });

    // Group settings by category
    const grouped: Record<string, Record<string, string>> = {
      company: {},
      zoho: {},
      notifications: {},
      system: {},
    };

    for (const s of settings) {
      if (s.key.startsWith("company_")) grouped.company[s.key] = s.value;
      else if (s.key.startsWith("zoho_")) grouped.zoho[s.key] = s.value;
      else if (s.key.startsWith("notification_")) grouped.notifications[s.key] = s.value;
      else grouped.system[s.key] = s.value;
    }

    return NextResponse.json({ settings: grouped, raw: settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (session.user.role !== "Admin") {
      return NextResponse.json({ error: "Only admins can modify settings" }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body; // { key: value, ... }

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "Settings object required" }, { status: 400 });
    }

    const updated = [];
    for (const [key, value] of Object.entries(settings)) {
      const setting = await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
      updated.push(setting);
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        module: "SETTINGS",
        entityId: "system",
        entityType: "Setting",
        newData: settings as any,
      },
    });

    return NextResponse.json({ updated, count: updated.length });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
