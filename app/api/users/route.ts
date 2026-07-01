import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isExpert = user.role === "expert";
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(isExpert ? users : users.filter(u => u.role === "assistant"));
}

export async function POST(req: NextRequest) {
  const user = await getSession(req);
  if (!user || user.role !== "expert") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const created = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: body.role || "assistant" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return NextResponse.json(created, { status: 201 });
}
