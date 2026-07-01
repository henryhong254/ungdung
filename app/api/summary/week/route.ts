import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const isExpert = (session.user as any).role === "expert";

    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - now.getDay() + 1);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);

    const [timeEntries, scheduledIdeas, completedIdeas, newIdeas, scheduledTasks, completedTasks] = await Promise.all([
      // Giờ làm tuần này
      prisma.timeEntry.findMany({
        where: {
          userId: isExpert ? undefined : userId,
          startedAt: { gte: mon, lte: sun },
        },
        select: { durationMin: true, workType: true, userId: true, user: { select: { name: true } } },
      }),

      // Ideas được lên lịch trong tuần
      prisma.idea.count({
        where: {
          assignedToId: isExpert ? undefined : userId,
          scheduledFor: { gte: mon, lte: sun },
        },
      }),

      // Ideas hoàn thành trong tuần
      prisma.idea.count({
        where: {
          assignedToId: isExpert ? undefined : userId,
          scheduledFor: { gte: mon, lte: sun },
          done: true,
        },
      }),

      // Ideas mới tạo trong tuần
      prisma.idea.count({
        where: {
          createdById: isExpert ? undefined : userId,
          createdAt: { gte: mon, lte: sun },
        },
      }),

      // Tasks trong tuần
      prisma.task.count({
        where: {
          assignedToId: isExpert ? undefined : userId,
          scheduledFor: { gte: mon, lte: sun },
        },
      }),

      // Tasks hoàn thành trong tuần
      prisma.task.count({
        where: {
          assignedToId: isExpert ? undefined : userId,
          scheduledFor: { gte: mon, lte: sun },
          done: true,
        },
      }),
    ]);

    const totalMinutes = timeEntries.reduce((s, e) => s + (e.durationMin || 0), 0);

    // Giờ theo loại công việc
    const byWorkType: Record<string, number> = {};
    for (const e of timeEntries) {
      byWorkType[e.workType] = (byWorkType[e.workType] || 0) + (e.durationMin || 0);
    }

    // Giờ theo thành viên (chỉ expert mới thấy)
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
      byWorkType: Object.entries(byWorkType)
        .map(([workType, minutes]) => ({ workType, minutes }))
        .sort((a, b) => b.minutes - a.minutes),
      byUser: Object.values(byUser).sort((a, b) => b.minutes - a.minutes),
      ideas: { scheduled: scheduledIdeas, done: completedIdeas, new: newIdeas },
      tasks: { scheduled: scheduledTasks, done: completedTasks },
    });
  } catch (e: any) {
    console.error("[summary/week]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
