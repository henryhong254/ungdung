import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isExpert = user.role === "expert";

    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const [timeEntries, scheduledIdeas, completedIdeas, newIdeas, scheduledTasks, completedTasks] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          userId: isExpert ? undefined : user.id,
          startedAt: { gte: mon, lte: sun },
        },
        select: { durationMin: true, workType: true, userId: true, user: { select: { name: true } } },
      }),
      prisma.idea.count({ where: { assignedToId: isExpert ? undefined : user.id, scheduledFor: { gte: mon, lte: sun } } }),
      prisma.idea.count({ where: { assignedToId: isExpert ? undefined : user.id, scheduledFor: { gte: mon, lte: sun }, done: true } }),
      prisma.idea.count({ where: { createdById: isExpert ? undefined : user.id, createdAt: { gte: mon, lte: sun } } }),
      prisma.task.count({ where: { assignedToId: isExpert ? undefined : user.id, scheduledFor: { gte: mon, lte: sun } } }),
      prisma.task.count({ where: { assignedToId: isExpert ? undefined : user.id, scheduledFor: { gte: mon, lte: sun }, done: true } }),
    ]);

    const totalMinutes = timeEntries.reduce((s, e) => s + (e.durationMin || 0), 0);

    const byWorkType: Record<string, number> = {};
    for (const e of timeEntries) {
      byWorkType[e.workType] = (byWorkType[e.workType] || 0) + (e.durationMin || 0);
    }

    const byUser: Record<string, { name: string; minutes: number }> = {};
    if (isExpert) {
      for (const e of timeEntries) {
        const key = e.userId;
        if (!byUser[key]) byUser[key] = { name: e.user.name, minutes: 0 };
        byUser[key].minutes += e.durationMin || 0;
      }
    }

    return NextResponse.json({
      weekStart: mon.toISOString(),
      weekEnd: sun.toISOString(),
      totalMinutes,
      byWorkType: Object.entries(byWorkType).map(([workType, minutes]) => ({ workType, minutes })).sort((a, b) => b.minutes - a.minutes),
      byUser: Object.values(byUser).sort((a, b) => b.minutes - a.minutes),
      ideas: { scheduled: scheduledIdeas, done: completedIdeas, new: newIdeas },
      tasks: { scheduled: scheduledTasks, done: completedTasks },
    });
  } catch (e: any) {
    console.error("[summary/week]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
