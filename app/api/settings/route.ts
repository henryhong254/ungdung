import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action;

    if (action === "updateTelegram") {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: body.telegramChatId || null },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "subscribeWebPush") {
      const sub = body.subscription;
      await prisma.pushSubscription.upsert({
        where: { endpoint: sub.endpoint },
        update: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          userId: user.id,
          userAgent: body.userAgent || null,
        },
        create: {
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          userId: user.id,
          userAgent: body.userAgent || null,
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    console.error("[settings POST]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { telegramChatId: true, pushSubscriptions: true },
    });

    return NextResponse.json({
      telegramChatId: dbUser?.telegramChatId || "",
      hasPush: dbUser && dbUser.pushSubscriptions.length > 0,
    });
  } catch (e: any) {
    console.error("[settings GET]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
