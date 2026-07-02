import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { todoId } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.done !== undefined) data.done = body.done;
  const todo = await prisma.todoItem.update({ where: { id: todoId }, data });
  return NextResponse.json(todo);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; todoId: string }> }) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { todoId } = await params;
  await prisma.todoItem.delete({ where: { id: todoId } });
  return NextResponse.json({ ok: true });
}
