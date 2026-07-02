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
    const userId = searchParams.get("userId");

    let assignedToId: string | undefined;
    if (userId && isExpert) assignedToId = userId;
    else if (!isExpert || mine) assignedToId = user.id;

    const ideas = await prisma.idea.findMany({
      where: {
        assignedToId,
        scheduledFor: unscheduled
          ? null
          : from || to
          ? { gte: from ? new Date(from) : undefined, lt: to ? new Date(to) : undefined }
          : undefined,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: [{ scheduledFor: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(ideas);
  } catch (e: any) {
    console.error("[ideas GET]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const idea = await prisma.idea.create({
      data: {
        createdById: user.id,
        assignedToId: body.assignedToId || user.id,
        title: body.title,
        description: body.description || null,
        product: body.product || null,
        workType: body.workType || null,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    return NextResponse.json(idea, { status: 201 });
  } catch (e: any) {
    console.error("[ideas POST]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
