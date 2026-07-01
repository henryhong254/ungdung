import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, userCount: count });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message, stack: e?.stack?.slice(0, 500) }, { status: 500 });
  }
}
