import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [customers, purchases] = await Promise.all([
    prisma.customer.findMany({ select: { status: true, segment: true, source: true, createdAt: true } }),
    prisma.purchase.findMany({ select: { amount: true, product: true, productType: true, purchasedAt: true } }),
  ]);

  const totalCustomers = customers.length;
  const totalRevenue = purchases.reduce((s, p) => s + p.amount, 0);

  const byStatus = Object.fromEntries(
    ["moi-dang-ky", "da-tu-van", "da-chot", "cham-soc-sau"].map((s) => [
      s,
      customers.filter((c) => c.status === s).length,
    ])
  );

  const bySource = Object.entries(
    purchases.reduce((acc: Record<string, number>, p) => {
      const src = customers.find(() => true)?.source || "khac";
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {})
  );

  const revenueByProduct = Object.entries(
    purchases.reduce((acc: Record<string, number>, p) => {
      acc[p.product] = (acc[p.product] || 0) + p.amount;
      return acc;
    }, {})
  ).map(([product, amount]) => ({ product, amount }));

  const revenueByMonth: Record<string, number> = {};
  for (const p of purchases) {
    const month = new Date(p.purchasedAt).toISOString().slice(0, 7);
    revenueByMonth[month] = (revenueByMonth[month] || 0) + p.amount;
  }
  const revenueByMonthArr = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, amount]) => ({ month, amount }));

  const newThisMonth = customers.filter((c) => {
    const d = new Date(c.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return NextResponse.json({
    totalCustomers,
    totalRevenue,
    newThisMonth,
    closedCount: byStatus["da-chot"] || 0,
    byStatus,
    revenueByProduct,
    revenueByMonth: revenueByMonthArr,
  });
}
