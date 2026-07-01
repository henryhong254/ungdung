import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let startedAt = entry.startedAt;
  let stoppedAt = body.stoppedAt ? new Date(body.stoppedAt) : (entry.stoppedAt ?? new Date());
  if (body.startedAt) startedAt = new Date(body.startedAt);

  const durationMin = Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60000);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { startedAt, stoppedAt, durationMin, note: body.note ?? entry.note },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
