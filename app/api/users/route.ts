import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isExpert = (session.user as any).role === "expert";
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  // Trợ lý chỉ thấy danh sách trợ lý (để assign task)
  return NextResponse.json(isExpert ? users : users.filter(u => u.role === "assistant"));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "expert") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: body.role || "assistant" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return NextResponse.json(user, { status: 201 });
}
