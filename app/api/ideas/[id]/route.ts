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
      if (body.description !== undefined) data.description = body.description || null;
      if (body.product !== undefined) data.product = body.product || null;
      if (body.workType !== undefined) data.workType = body.workType || null;
      if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
      if (body.scheduledFor !== undefined) data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
      if (body.order !== undefined) data.order = body.order;
    }
    if (body.done !== undefined) {
      data.done = body.done;
      data.doneAt = body.done ? new Date() : null;
    }

    const updated = await prisma.idea.update({
      where: { id },
      data,
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    console.error("[ideas PATCH]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    await prisma.idea.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[ideas DELETE]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
