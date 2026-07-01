import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "expert") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.role) data.role = body.role;
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, active: true } });
  return NextResponse.json(user);
}
