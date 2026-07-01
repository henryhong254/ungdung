import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const product = searchParams.get("product") || "";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const isExpert = user.role === "expert";

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: isExpert && userId ? userId : !isExpert ? user.id : undefined,
      product: product ? { contains: product } : undefined,
      startedAt: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
    },
    include: { user: { select: { name: true, role: true } }, idea: { select: { id: true, title: true } } },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      ideaId: body.ideaId || null,
      product: body.product,
      workType: body.workType,
      note: body.note || null,
      startedAt: new Date(),
    },
    include: { idea: { select: { id: true, title: true } } },
  });
  return NextResponse.json(entry, { status: 201 });
}
