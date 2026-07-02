import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function getWeekStart() {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return mon.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStart = new URL(req.url).searchParams.get("weekStart") || getWeekStart();
  const record = await prisma.weekFocus.findUnique({
    where: { userId_weekStart: { userId: user.id, weekStart } },
  });
  return NextResponse.json({ focus: record?.focus ?? "" });
}

export async function PUT(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { focus, weekStart: ws } = await req.json();
  const weekStart = ws || getWeekStart();

  if (!focus || !focus.trim()) {
    await prisma.weekFocus.deleteMany({ where: { userId: user.id, weekStart } });
    return NextResponse.json({ focus: "" });
  }

  const record = await prisma.weekFocus.upsert({
    where: { userId_weekStart: { userId: user.id, weekStart } },
    update: { focus: focus.trim() },
    create: { userId: user.id, weekStart, focus: focus.trim() },
  });
  return NextResponse.json({ focus: record.focus });
}
