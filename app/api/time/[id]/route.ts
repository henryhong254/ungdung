import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stoppedAt = new Date();
  const durationMin = Math.round((stoppedAt.getTime() - entry.startedAt.getTime()) / 60000);

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: { stoppedAt, durationMin, note: body.note ?? entry.note },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
