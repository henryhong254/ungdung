import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const unscheduled = searchParams.get("unscheduled") === "true";
    const isExpert = user.role === "expert";
    const mine = searchParams.get("mine") === "true";

    const tasks = await prisma.task.findMany({
      where: {
        assignedToId: (isExpert && !mine) ? undefined : user.id,
        scheduledFor: unscheduled
          ? null
          : {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined,
            },
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledFor: "asc" }, { order: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch (e: any) {
    console.error("[tasks GET]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isExpert = user.role === "expert";
    const body = await req.json();

    if (!isExpert && body.assignedToId) {
      const assignee = await prisma.user.findUnique({ where: { id: body.assignedToId }, select: { role: true } });
      if (assignee?.role === "expert") {
        return NextResponse.json({ error: "Trợ lý không thể gán task cho Expert" }, { status: 403 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description || null,
        workType: body.workType || null,
        assignedToId: body.assignedToId || null,
        scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : null,
        order: body.order || 0,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (e: any) {
    console.error("[tasks POST]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
