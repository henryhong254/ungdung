import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const note = await prisma.note.create({
    data: {
      customerId: id,
      content: body.content,
      noteDate: body.noteDate ? new Date(body.noteDate) : new Date(),
    },
  });
  return NextResponse.json(note, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const noteId = searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "noteId required" }, { status: 400 });
  await prisma.note.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
