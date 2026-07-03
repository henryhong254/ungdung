import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const isExpert = user.role === "expert";

    const data: Record<string, unknown> = {};
    if (isExpert) {
      if (body.title !== undefined) data.title = body.title;
      if (body.description !== undefined) data.description = body.description;
      if (body.product !== undefined) data.product = body.product;
      if (body.workType !== undefined) data.workType = body.workType || null;
      if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
      if (body.scheduledFor !== undefined) data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
      if (body.order !== undefined) data.order = body.order;
      if (body.estimatedStart !== undefined) data.estimatedStart = body.estimatedStart || null;
      if (body.estimatedEnd !== undefined) data.estimatedEnd = body.estimatedEnd || null;
    }
    if (body.done !== undefined) {
      data.done = body.done;
      data.doneAt = body.done ? new Date() : null;
    }
    if (body.doneNote !== undefined) data.doneNote = body.doneNote || null;
    if (body.mood !== undefined) data.mood = body.mood || null;
    const task = await prisma.task.update({
      where: { id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(task);
  } catch (e: any) {
    console.error("[tasks PATCH]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession(_);
    if (!user || user.role !== "expert")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[tasks DELETE]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
