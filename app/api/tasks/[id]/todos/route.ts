import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(_);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const todos = await prisma.todoItem.findMany({ where: { taskId: id }, orderBy: { order: "asc" } });
  return NextResponse.json(todos);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const count = await prisma.todoItem.count({ where: { taskId: id } });
  const todo = await prisma.todoItem.create({ data: { taskId: id, title: title.trim(), order: count } });
  return NextResponse.json(todo);
}
