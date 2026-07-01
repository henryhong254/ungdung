import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "expert") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(Date.now() - 30 * 86400000);
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();

  const entries = await prisma.timeEntry.findMany({
    where: { startedAt: { gte: from, lte: to }, stoppedAt: { not: null } },
    include: { user: { select: { name: true, role: true } } },
  });

  const byProduct: Record<string, number> = {};
  for (const e of entries) {
    byProduct[e.product] = (byProduct[e.product] || 0) + (e.durationMin || 0);
  }

  const byWorkType: Record<string, number> = {};
  for (const e of entries) {
    byWorkType[e.workType] = (byWorkType[e.workType] || 0) + (e.durationMin || 0);
  }

  const byUser: Record<string, { name: string; minutes: number }> = {};
  for (const e of entries) {
    if (!byUser[e.userId]) byUser[e.userId] = { name: e.user.name, minutes: 0 };
    byUser[e.userId].minutes += e.durationMin || 0;
  }

  const byDay: Record<string, number> = {};
  for (const e of entries) {
    const day = new Date(e.startedAt).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + (e.durationMin || 0);
  }

  const totalMinutes = entries.reduce((s, e) => s + (e.durationMin || 0), 0);

  return NextResponse.json({
    totalMinutes,
    totalEntries: entries.length,
    byProduct: Object.entries(byProduct).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ product: k, minutes: v })),
    byWorkType: Object.entries(byWorkType).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ workType: k, minutes: v })),
    byUser: Object.values(byUser).sort((a, b) => b.minutes - a.minutes),
    byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, minutes]) => ({ day, minutes })),
  });
}
