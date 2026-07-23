import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privKey = process.env.VAPID_PRIVATE_KEY;

if (pubKey && privKey) {
  webpush.setVapidDetails("mailto:contact@foundersnorth.com", pubKey, privKey);
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

async function sendTelegram(chatId: string, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch (e) {
    console.error("Telegram send error", e);
    return false;
  }
}

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== (process.env.CRON_SECRET || "MY_CRON_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all tasks & ideas scheduled for today and not notified
    const now = new Date();
    // Offset for local timezone (Vietnam UTC+7)
    // We assume the server is running in UTC or UTC+7. We should calculate 'today' bounds based on UTC+7.
    // However, scheduledFor is stored as exactly 00:00:00 UTC of that day.
    
    // Instead of complex date math, let's just fetch all unnotified items where scheduledFor is not null, 
    // and estimatedStart is not null. We can filter in memory because there won't be millions of them.
    
    const [tasks, ideas] = await Promise.all([
      prisma.task.findMany({
        where: { notified: false, scheduledFor: { not: null }, estimatedStart: { not: null } },
        include: { assignedTo: { select: { id: true, name: true, telegramChatId: true, pushSubscriptions: true } } }
      }),
      prisma.idea.findMany({
        where: { notified: false, scheduledFor: { not: null }, estimatedStart: { not: null } },
        include: { assignedTo: { select: { id: true, name: true, telegramChatId: true, pushSubscriptions: true } } }
      })
    ]);

    const items = [...tasks.map(t => ({ ...t, type: "Task" })), ...ideas.map(i => ({ ...i, type: "Idea" }))];
    
    // Current time in Vietnam (UTC+7)
    const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
    const currentVnDateStr = vnTime.toISOString().slice(0, 10);
    const currentVnMinutes = vnTime.getUTCHours() * 60 + vnTime.getUTCMinutes();

    const toNotify = [];

    for (const item of items) {
      if (!item.assignedTo) continue;
      
      const scheduledVnTime = new Date(item.scheduledFor!.getTime() + 7 * 3600 * 1000);
      const scheduledVnDateStr = scheduledVnTime.toISOString().slice(0, 10);

      if (scheduledVnDateStr !== currentVnDateStr) continue;

      const estStartMin = timeToMinutes(item.estimatedStart!);
      
      // If it starts within the next 15 minutes, or we are already past it (but haven't notified today)
      if (estStartMin - currentVnMinutes <= 15) {
        toNotify.push(item);
      }
    }

    let notifiedCount = 0;

    for (const item of toNotify) {
      const user = item.assignedTo;
      if (!user) continue;

      const title = `🔔 <b>Sắp đến giờ: ${item.title}</b>`;
      const body = `Dự kiến bắt đầu lúc: ${item.estimatedStart}\nLoại: ${item.type}`;

      let sent = false;

      // 1. Telegram
      if (user.telegramChatId) {
        const ok = await sendTelegram(user.telegramChatId, `${title}\n${body}`);
        if (ok) sent = true;
      }

      // 2. Web Push
      if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
        const payload = JSON.stringify({ title: `Sắp đến giờ: ${item.title}`, body: `Bắt đầu lúc ${item.estimatedStart}` });
        for (const sub of user.pushSubscriptions) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            }, payload);
            sent = true;
          } catch (e: any) {
            if (e.statusCode === 410 || e.statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
            }
          }
        }
      }

      // If sent at least one, mark as notified
      if (sent) {
        if (item.type === "Task") {
          await prisma.task.update({ where: { id: item.id }, data: { notified: true } });
        } else {
          await prisma.idea.update({ where: { id: item.id }, data: { notified: true } });
        }
        notifiedCount++;
      }
    }

    return NextResponse.json({ success: true, checked: items.length, notified: notifiedCount });
  } catch (e: any) {
    console.error("[cron]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
