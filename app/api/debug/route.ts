import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const count = await prisma.user.count();
    const dbUrl = process.env.DATABASE_URL?.replace("file:", "") ?? "dev.db";
    const dbPath = path.isAbsolute(dbUrl) ? dbUrl : path.join(process.cwd(), dbUrl);
    let stat: Record<string, unknown> | null = null;
    try {
      const s = fs.statSync(dbPath);
      stat = { size: s.size, mtime: s.mtime, ino: s.ino };
    } catch (e: any) {
      stat = { error: e?.message };
    }
    return NextResponse.json({
      ok: true,
      userCount: count,
      cwd: process.cwd(),
      databaseUrlEnv: process.env.DATABASE_URL,
      resolvedDbPath: dbPath,
      fileStat: stat,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message, stack: e?.stack?.slice(0, 500) }, { status: 500 });
  }
}
